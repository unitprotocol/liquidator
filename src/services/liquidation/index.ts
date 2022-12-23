import { EventEmitter } from 'events'
import Web3 from 'web3'
import Logger from 'src/logger'
import { Liquidation, TxConfig } from 'src/types/TxConfig'
import {CONFIRMATIONS_THRESHOLD, IS_DEV, BLOCKS_CHECK_DELAY, CHAIN_ID} from 'src/constants'
import axios from 'axios'
import { inspect } from 'util'
import NotificationService from 'src/services/notification'

declare interface LiquidationService {
  on(event: string, listener: Function): this;
  emit(event: string, payload: any): boolean;
}

class LiquidationService extends EventEmitter {
  private readonly web3: Web3
  private readonly transactions: Map<string, TxConfig>
  private readonly preparing: Map<string, PreparingLiquidation>
  private readonly postponedRemovals: Removal[]
  private readonly logger
  private readonly notificator: NotificationService
  private readonly senderAddress: string
  private readonly privateKey: string

  private nonce: number

  constructor(web3: Web3, notificator: NotificationService) {
    super()
    this.web3 = web3
    this.transactions = new Map()
    this.preparing = new Map()
    this.logger = Logger(LiquidationService.name)
    this.senderAddress = process.env.ETHEREUM_ADDRESS
    this.privateKey = process.env.ETHEREUM_PRIVATE_KEY
    this.postponedRemovals = []
    this.notificator = notificator
    if (!this.privateKey.startsWith('0x'))
      this.privateKey = '0x' + this.privateKey
    this.updateNonce()
  }

  async triggerLiquidation(liquidation: Liquidation) {
    const { tx, blockNumber, buildTx } = liquidation
    this.log('.triggerLiquidation', tx.key)

    this._processPostponedRemovals(blockNumber)

    const prepared = this.preparing.get(tx.key)
    if (!prepared || blockNumber > prepared.lastSeenBlockNumber + BLOCKS_CHECK_DELAY * 1.5) {
      this.preparing.set(tx.key, {
        tx,
        lastSeenBlockNumber: blockNumber,
        confirmations: 1
      })
      await this.logOnline(`.triggerLiquidation: 1/${CONFIRMATIONS_THRESHOLD} confirmations collected for ${tx.key}`);
      return
    } else if (prepared.confirmations < CONFIRMATIONS_THRESHOLD - 1) {
      if (blockNumber > prepared.lastSeenBlockNumber) {
        this.preparing.set(tx.key, {
          tx,
          lastSeenBlockNumber: blockNumber,
          confirmations: prepared.confirmations + 1
        })
      }

      await this.logOnline(`.triggerLiquidation: ${prepared.confirmations + 1}/${CONFIRMATIONS_THRESHOLD} confirmations collected for ${tx.key}`);
      return
    }

    await this.logOnline(`.triggerLiquidation: collected ${CONFIRMATIONS_THRESHOLD} confirmations for ${tx.key}, sending tx`);

    let nonce

    let trx = tx;

    // if we want to rebuild tx according to the new block number we can do it here
    // we may want it for example to refresh proofs for keydonix transactions
    // if (buildTx) {
    //   trx = await buildTx(blockNumber);
    // }

    if (!trx) {
      this.logError(`Cannot perform liquidation: ${inspect(tx)}`)
    }

    const sentTx = this.transactions.get(trx.key)
    const now = new Date().getTime() / 1000
    if (sentTx && sentTx.sentAt) {
      if (now - sentTx.sentAt > 60) {
        // load nonce of sent tx
        nonce = sentTx.nonce
      } else {
        this.log('.triggerLiquidation: already exists', this.transactions.get(trx.key).txHash);
        return
      }
    } else {
      // load stored nonce
      nonce = this.nonce
      // increment stored nonce
      this.nonce++
    }

    this.transactions.set(trx.key, trx)
    this.log('.triggerLiquidation: buildingTx for', trx.key);

    const gasPriceResp = await axios.get("https://gasprice.poa.network/").catch(() => undefined)
    let gasPrice
    if (!gasPriceResp || !gasPriceResp.data || !gasPriceResp.data.health) {
      gasPrice = await this.web3.eth.getGasPrice()
      gasPrice = String(Number(gasPrice) * 120)
      gasPrice = Math.ceil(gasPrice.substr(0, gasPrice.length - 2))
    } else {
      gasPrice = Math.ceil(gasPriceResp.data.instant * 1e9)
    }

    const txConfig = {
      to: trx.to,
      data: trx.data,
      gasLimit: +trx.gas + 200_000,
      gas: +trx.gas + 200_000,
      chainId: CHAIN_ID,
      gasPrice,
      nonce,
    }

    const signedTransaction = await this.web3.eth.accounts.signTransaction(txConfig, this.privateKey)

    // set sending params
    trx.txHash = signedTransaction.transactionHash
    trx.nonce = nonce
    trx.sentAt = now
    this.log('.triggerLiquidation: sending transaction', signedTransaction.transactionHash);

    this.transactions.set(trx.key, trx)

    if (!IS_DEV) {

      const result = await this.web3.eth.sendSignedTransaction(signedTransaction.rawTransaction).catch(async (e) => {
        if (e.toString().includes("nonce too low")) {
          this.log('.triggerLiquidation: nonce too low, updating', e)
          await this.updateNonce()
          this.transactions.delete(trx.key)
        } else {
          await this.alarm('.triggerLiquidation: tx sending error', e.toString())
        }
      })

      if (result) {
        this._postponeRemoval(trx.key, blockNumber + 20)
        this.log('.triggerLiquidation: tx sending result', result)
      }
    }
  }

  private async updateNonce() {
    const initializing = !this.nonce
    this.nonce = await this.web3.eth.getTransactionCount(this.senderAddress)
    if (initializing) {
      this.emit('ready', this)
    }
  }

  private _postponeRemoval(key, removeAtBlock) {
    this.postponedRemovals.push({ key, removeAtBlock })
  }

  private _processPostponedRemovals(currentBlockNumber: number) {
    for (let i = this.postponedRemovals.length - 1; i >= 0; i--) {
      const { key, removeAtBlock } = this.postponedRemovals[i]
      if (currentBlockNumber >= removeAtBlock) {
        this.postponedRemovals.splice(i, 1)
        this.transactions.delete(key)
        this.preparing.delete(key)
      }
    }
  }


  private log(...args) {
    this.logger.info(args)
  }

  private logError(...args) {
    this.logger.error(args)
  }

  private logOnline(...args) {
    this.logger.info(args)
    //return this.notificator.logAction(this.logger.format(args, true))
  }

  private alarm(...args) {
    return this.notificator.logAlarm(this.logger.format(args, true))
  }
}

interface PreparingLiquidation {
  lastSeenBlockNumber: number
  confirmations: number
  tx: TxConfig
}

interface Removal {
  key: string
  removeAtBlock: number
}

export default LiquidationService
