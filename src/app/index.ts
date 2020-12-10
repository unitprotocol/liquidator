import SynchronizationService from '../services/synchronization'
import LiquidationService from '../services/liquidation'
import NotificationService from '../services/notification'
import {
  EXIT_EVENT,
  JOIN_EVENT,
  LIQUIDATION_TRIGGERED_EVENT,
  NEW_BLOCK_EVENT,
  TRIGGER_LIQUIDATION_EVENT,
} from '../constants'
import { TxConfig } from '../types/TxConfig'
import web3 from '../provider'


class LiquidationMachine {
  private readonly synchronizer: SynchronizationService
  private readonly liquidator: LiquidationService
  private readonly notificator: NotificationService
  private liquidatorReady: boolean
  private postponedLiquidationTriggers: TxConfig[]

  constructor() {
    this.synchronizer = new SynchronizationService(web3)
    this.notificator = new NotificationService()
    this.liquidatorReady = false
    this.postponedLiquidationTriggers = []

    this.liquidator = new LiquidationService(web3)
    this.liquidator.on('ready', () => { this.liquidatorReady = true })

    this.liquidator.on(LIQUIDATION_TRIGGERED_EVENT, data => {
      this.notificator.notifyTriggered(data)
    })

    this.synchronizer.on(NEW_BLOCK_EVENT, (number) => {
      this.synchronizer.checkLiquidatable(number)
    })

    this.synchronizer.on(JOIN_EVENT, join => {
      this.notificator.notifyJoin(join)
    })

    this.synchronizer.on(EXIT_EVENT, exit => {
      this.notificator.notifyExit(exit)
    })

    this.synchronizer.on(TRIGGER_LIQUIDATION_EVENT, (triggerTx: TxConfig) => {

      // postpone liquidations when service is not yet available
      if (!this.liquidatorReady) {
        this.postponedLiquidationTriggers.push(triggerTx)
        return
      }

      // process postponed liquidations
      for (const postponedTx of this.postponedLiquidationTriggers)
        this.liquidator.triggerLiquidation(postponedTx)

      this.postponedLiquidationTriggers = []

      // trigger the liquidation
      this.liquidator.triggerLiquidation(triggerTx)
    })
  }
}

new LiquidationMachine()
