import { BasicEvent } from 'src/types/BasicEvent'

export interface Liquidated extends BasicEvent {
  token: string,
  owner: string,
  penalty: bigint,
  repayment: bigint,
}
