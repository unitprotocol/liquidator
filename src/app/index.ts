import 'module-alias/register'
import SynchronizationService from 'src/services/synchronization'
import LiquidationService from 'src/services/liquidation'
import NotificationService from 'src/services/notification'
import {
  DUCK_CREATION_EVENT,
  EXIT_EVENT,
  JOIN_EVENT,
  LIQUIDATED_EVENT,
  LIQUIDATION_TRIGGER_TX,
  LIQUIDATION_TRIGGERED_EVENT,
  NEW_BLOCK_EVENT,
  TRIGGER_LIQUIDATION,
} from 'src/constants'
import { Liquidation } from 'src/types/TxConfig'
import web3 from 'src/provider'


class LiquidationMachine {
  private readonly synchronizer: SynchronizationService
  private readonly liquidator: LiquidationService
  private readonly notificator: NotificationService
  private liquidatorReady: boolean
  private postponedLiquidationTriggers: Liquidation[]

  constructor() {
    this.synchronizer = new SynchronizationService(web3)
    this.notificator = new NotificationService()
    this.liquidatorReady = false
    this.postponedLiquidationTriggers = []

    this.liquidator = new LiquidationService(web3)
    this.liquidator.on('ready', () => { this.liquidatorReady = true })

    this.liquidator.on(LIQUIDATION_TRIGGER_TX, data => {
      this.notificator.notifyTriggerTx(data)
    })

    this.synchronizer.on(LIQUIDATION_TRIGGERED_EVENT, data => {
      this.notificator.notifyTriggered(data)
    })

    this.synchronizer.on(LIQUIDATED_EVENT, data => {
      this.notificator.notifyLiquidated(data)
    })

    this.synchronizer.on(NEW_BLOCK_EVENT, header => {
      this.synchronizer.checkLiquidatable(header)
    })

    this.synchronizer.on(JOIN_EVENT, join => {
      this.notificator.notifyJoin(join)
    })

    this.synchronizer.on(DUCK_CREATION_EVENT, mint => {
      this.notificator.notifyDuck(mint)
    })

    this.synchronizer.on(EXIT_EVENT, exit => {
      this.notificator.notifyExit(exit)
    })

    this.synchronizer.on(TRIGGER_LIQUIDATION, ({tx, blockNumber}) => {

      // postpone liquidations when service is not yet available
      if (!this.liquidatorReady) {
        this.postponedLiquidationTriggers.push( { tx, blockNumber } )
        return
      }

      if (this.postponedLiquidationTriggers.length) {
        // process postponed liquidations
        for (const postponedTx of this.postponedLiquidationTriggers) {
          this.liquidator.triggerLiquidation(postponedTx)
        }

        this.postponedLiquidationTriggers = []
      }

      // trigger the liquidation
      this.liquidator.triggerLiquidation({ tx, blockNumber })
    })
  }
}

new LiquidationMachine()
