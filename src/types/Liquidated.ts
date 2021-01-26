export type Liquidated = {
  token: string,
  owner: string,
  penalty: bigint,
  repayment: bigint,
  txHash: string,
}
