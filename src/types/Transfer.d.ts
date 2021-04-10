import { BasicEvent } from 'src/types/BasicEvent'

export interface Transfer extends BasicEvent {
  to: string,
  amount: bigint,
}
