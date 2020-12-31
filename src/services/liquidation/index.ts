import { EventEmitter } from 'events'
import Web3 from 'web3'
import Logger from 'src/logger'
import { TxConfig } from 'src/types/TxConfig'
import { LIQUIDATION_TRIGGER_TX } from 'src/constants'
import axios from 'axios'
import { LiquidationTrigger } from 'src/types/LiquidationTrigger'

declare interface LiquidationService {
  on(event: string, listener: Function): this;
  emit(event: string, payload: any): boolean;
}

class LiquidationService extends EventEmitter {
  private readonly web3: Web3
  private readonly transactions: Map<string, TxConfig>
  private readonly logger
  private readonly senderAddress: string
  private readonly privateKey: string

  private nonce: number

  constructor(web3) {
    super()
    this.web3 = web3
    this.transactions = new Map()
    this.logger = Logger(LiquidationService.name)
    this.senderAddress = process.env.ETHEREUM_ADDRESS
    this.privateKey = process.env.ETHEREUM_PRIVATE_KEY
    if (!this.privateKey.startsWith('0x'))
      this.privateKey = '0x' + this.privateKey
    this.updateNonce()
  }

  async triggerLiquidation(txConfig: TxConfig) {
    this.log('.triggerLiquidation', txConfig.key)

    let nonce

    const sentTx = this.transactions.get(txConfig.key)
    const now = new Date().getTime() / 1000
    if (sentTx) {
      if (now - sentTx.sentAt > 60) {
        // load nonce of sent tx
        nonce = sentTx.nonce
      } else {
        this.log('.triggerLiquidation: already exists', this.transactions.get(txConfig.key).txHash);
        return
      }
    } else {
      // load stored nonce
      nonce = this.nonce
      // increment stored nonce
      this.nonce++
    }

    this.transactions.set(txConfig.key, txConfig)
    this.log('.triggerLiquidation: buildingTx for', txConfig.key);

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
      to: txConfig.to,
      data: txConfig.data,
      gas: +txConfig.gas + 200_000,
      chainId: 1,
      gasPrice,
      nonce,
    }

    const tx = await this.web3.eth.accounts.signTransaction(trx, this.privateKey)

    // set sending params
    txConfig.txHash = tx.transactionHash
    txConfig.nonce = nonce
    txConfig.sentAt = now
    this.log('.triggerLiquidation: sending transaction', trx, tx.transactionHash);

    const tokenAddress = '0x' + txConfig.key.substr(24, 40);
    const ownerAddress = '0x' + txConfig.key.substr(88);

    const result = await this.web3.eth.sendSignedTransaction(tx.rawTransaction).catch(async (e) => {
      if (e.toString().includes("nonce too low")) {
        this.log('.triggerLiquidation: nonce too low, updating', e)
        await this.updateNonce()
        this.transactions.delete(txConfig.key)
      } else {
        this.log('.triggerLiquidation: tx sending error', e)
      }
    })

    const payload: LiquidationTrigger = {
      txHash: tx.transactionHash,
      token: tokenAddress,
      user: ownerAddress,
    }

    if (result) {
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


  private log(...args) {
    this.logger.info(args)
  }
}

export default LiquidationService
