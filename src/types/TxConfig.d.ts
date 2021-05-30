export type TxConfig = {
  to: string,
  data: string,
  key: string,
  from: string,
  gas?: number,
  txHash?: string,
  sentAt?: number,
  nonce?: number,
}

export interface Liquidation {
  tx: TxConfig
  blockNumber: number
  buildTx?: (tx: TxConfig, blockNumber: number) => TxConfig
}