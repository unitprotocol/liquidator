import { BasicEvent } from 'src/types/BasicEvent'

export interface Buyout extends BasicEvent {
  token: string,
  owner: string,
  liquidator: string,
  amount: bigint,
  penalty: bigint,
  price: bigint,
}
