import { EventEmitter } from 'events'
import Web3 from 'web3'
import Logger from 'src/logger'
import { Liquidation, TxConfig } from 'src/types/TxConfig'
import { CONFIRMATIONS_THRESHOLD, LIQUIDATOR_LIQUIDATION_TX_SENT } from 'src/constants'
import axios from 'axios'
import { LiquidationTrigger } from 'src/types/LiquidationTrigger'

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
  private readonly senderAddress: string
  private readonly privateKey: string

  private nonce: number

  constructor(web3) {
    super()
    this.web3 = web3
    this.transactions = new Map()
    this.preparing = new Map()
    this.logger = Logger(LiquidationService.name)
    this.senderAddress = process.env.ETHEREUM_ADDRESS
    this.privateKey = process.env.ETHEREUM_PRIVATE_KEY
    this.postponedRemovals = []
    if (!this.privateKey.startsWith('0x'))
      this.privateKey = '0x' + this.privateKey
    this.updateNonce()
  }

  async triggerLiquidation(liquidation: Liquidation) {
    const { tx, blockNumber } = liquidation
    this.log('.triggerLiquidation', tx.key)

    this._processPostponedRemovals(blockNumber)

    const prepared = this.preparing.get(tx.key)
    if (!prepared) {
      this.preparing.set(tx.key, {
        lastSeenBlockNumber: blockNumber,
        confirmations: 1,
        tx,
      })
      this.log(`.triggerLiquidation: collecting ${CONFIRMATIONS_THRESHOLD} confirmations for ${tx.key} current: 1`);
      return
    } else if (prepared.confirmations < CONFIRMATIONS_THRESHOLD) {
      this.log(`.triggerLiquidation: collecting ${CONFIRMATIONS_THRESHOLD} confirmations for ${tx.key} current: ${prepared.confirmations}`);
      if (blockNumber > prepared.lastSeenBlockNumber) {
        prepared.lastSeenBlockNumber = blockNumber
        prepared.confirmations++
      }
      return
    }

    this.log(`.triggerLiquidation: collected ${CONFIRMATIONS_THRESHOLD} confirmations for ${tx.key} sending tx`);

    let nonce

    const sentTx = this.transactions.get(tx.key)
    const now = new Date().getTime() / 1000
    if (sentTx) {
      if (now - sentTx.sentAt > 60) {
        // load nonce of sent tx
        nonce = sentTx.nonce
      } else {
        this.log('.triggerLiquidation: already exists', this.transactions.get(tx.key).txHash);
        return
      }
    } else {
      // load stored nonce
      nonce = this.nonce
      // increment stored nonce
      this.nonce++
    }

    this.transactions.set(tx.key, tx)
    this.log('.triggerLiquidation: buildingTx for', tx.key);

    const gasPriceResp = await axios.get("https://gasprice.poa.network/")
    let gasPrice
    if (!gasPriceResp.data.health) {
      gasPrice = await this.web3.eth.getGasPrice()
      gasPrice = String(Number(gasPrice) * 120)
      gasPrice = gasPrice.substr(0, gasPrice.length - 2)
    } else {
      gasPrice = gasPriceResp.data.instant * 1e9
    }

    const trx = {
      to: tx.to,
      data: tx.data,
      gas: +tx.gas + 200_000,
      chainId: 1,
      gasPrice,
      nonce,
    }

    const signedTransaction = await this.web3.eth.accounts.signTransaction(trx, this.privateKey)

    // set sending params
    tx.txHash = signedTransaction.transactionHash
    tx.nonce = nonce
    tx.sentAt = now
    this.log('.triggerLiquidation: sending transaction', trx, signedTransaction.transactionHash);

    const result = await this.web3.eth.sendSignedTransaction(signedTransaction.rawTransaction).catch(async (e) => {
      if (e.toString().includes("nonce too low")) {
        this.log('.triggerLiquidation: nonce too low, updating', e)
        await this.updateNonce()
        this.transactions.delete(tx.key)
      } else {
        this.log('.triggerLiquidation: tx sending error', e)
      }
    })

    if (result) {

      // const tokenAddress = '0x' + tx.key.substr(24, 40);
      // const ownerAddress = '0x' + tx.key.substr(88);

      // const payload: LiquidationTrigger = {
      //   txHash: signedTransaction.transactionHash,
      //   token: tokenAddress,
      //   user: ownerAddress,
      // }

      this._postponeRemoval(tx.key, blockNumber + 20)
      // this.emit(LIQUIDATION_TRIGGER_TX, payload)
      this.log('.triggerLiquidation: tx sending result', result)
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
