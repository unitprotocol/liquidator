export type CDP = {
  asset: string,
  owner: string,
  isDebtsEnoughForLiquidationSpends: boolean,
  isFallback: boolean,
  liquidationTrigger: string,
  liquidationBlock: number
}
