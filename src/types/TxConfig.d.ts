export type TxConfig = {
  to: string,
  data: string,
  key: string,
  from: string,
  gas?: string,
  txHash?: string,
  sentAt?: number,
  nonce?: number,
}

export interface Liquidation {
  tx: TxConfig
  blockNumber: number
}