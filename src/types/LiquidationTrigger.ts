import { BasicEvent } from 'src/types/BasicEvent'

export interface LiquidationTrigger extends BasicEvent {
  token: string,
  user: string,
}
