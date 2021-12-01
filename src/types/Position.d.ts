export type CDP = {
  asset: string,
  owner: string,
  isFallback: boolean,
  liquidationTrigger: string,
  liquidationBlock: number
}
