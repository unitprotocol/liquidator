export type Liquidated = {
  token: string,
  owner: string,
  penalty: bigint,
  amount: bigint,
  price: bigint,
  txHash: string,
}
