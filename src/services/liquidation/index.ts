import { EventEmitter } from 'events'
import Web3 from 'web3'
import Logger from '../../logger'
import { TxConfig } from '../../types/TxConfig'
import { LIQUIDATION_TRIGGERED_EVENT } from '../../constants'

declare interface LiquidationService {
  on(event: string, listener: Function): this;
  emit(event: string, payload: any): boolean;
}

class LiquidationService extends EventEmitter{
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
    if (this.transactions.get(txConfig.key)) {
      this.log('.triggerLiquidation: already exists', this.transactions.get(txConfig.key).txHash);
      return
    }

    this.transactions.set(txConfig.key, txConfig)
    this.log('.triggerLiquidation: buildingTx for', txConfig.key);

    // load stored nonce
    const nonce = this.nonce

    // increment stored nonce
    this.nonce++

    let gasPrice = await this.web3.eth.getGasPrice()
    gasPrice = String(Number(gasPrice) * 110)
    gasPrice = gasPrice.substr(0, gasPrice.length - 2)

    const trx = {
      to: txConfig.to,
      data: txConfig.data,
      gas: +txConfig.gas + 200000,
      chainId: 1,
      gasPrice,
      nonce,
    }

    const tx = await this.web3.eth.accounts.signTransaction(trx, this.privateKey)

    // set txHash
    txConfig.txHash = tx.transactionHash
    this.log('.triggerLiquidation: sending transaction', trx, tx.transactionHash);

    const tokenAddress = '0x' + txConfig.key.substr(24, 40);
    const ownerAddress = '0x' + txConfig.key.substr(88);

    this.emit(LIQUIDATION_TRIGGERED_EVENT, {
      txHash: tx.transactionHash,
      mainAsset: tokenAddress,
      owner: ownerAddress,
    })

    const result = await this.web3.eth.sendSignedTransaction(tx.rawTransaction)
    this.log('.triggerLiquidation: tx sending result', result);
  }

  private async updateNonce() {
    this.nonce = await this.web3.eth.getTransactionCount(this.senderAddress)
    this.emit('ready', this);
  }


  private log(...args) {
    this.logger.info(args)
  }
}

export default LiquidationService
