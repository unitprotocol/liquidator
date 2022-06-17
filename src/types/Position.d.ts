export type CDP = {
  asset: string,
  owner: string,
  isDebtsEnoughForLiquidationSpends: boolean,
  oracleType: number,
  isFallback: boolean,
  liquidationTrigger: string,
  liquidationBlock: number
}
