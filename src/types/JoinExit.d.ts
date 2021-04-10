import { BasicEvent } from 'src/types/BasicEvent'

export interface JoinExit extends BasicEvent {
  token: string,
  user: string,
  main: bigint,
  col: bigint,
  usdp: bigint,
}
