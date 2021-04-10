import 'module-alias/register'
import SynchronizationService from 'src/services/synchronization'
import LiquidationService from 'src/services/liquidation'
import NotificationService from 'src/services/notification'
import {
  SYNCHRONIZER_DUCK_CREATION_EVENT,
  SYNCHRONIZER_EXIT_EVENT,
  SYNCHRONIZER_JOIN_EVENT,
  SYNCHRONIZER_LIQUIDATED_EVENT,
  LIQUIDATOR_LIQUIDATION_TX_SENT,
  SYNCHRONIZER_LIQUIDATION_TRIGGERED_EVENT,
  SYNCHRONIZER_NEW_BLOCK_EVENT,
  SYNCHRONIZER_TRIGGER_LIQUIDATION_EVENT,
  SYNCHRONIZER_SAVE_STATE_REQUEST,
} from 'src/constants'
import { Liquidation } from 'src/types/TxConfig'
import web3 from 'src/provider'
import EventProcessor from 'src/processor'
import StateManagerService from 'src/services/statemanager'


class LiquidationMachine {
  public readonly synchronizer: SynchronizationService
  public readonly liquidator: LiquidationService
  public readonly notificator: NotificationService
  public readonly statemanager: StateManagerService
  public liquidatorReady: boolean
  public postponedLiquidationTriggers: Liquidation[]

  constructor() {
    const processor = EventProcessor(this)
    this.statemanager = new StateManagerService(this)
    let loadedAppState = this.statemanager.loadState()

    this.synchronizer = new SynchronizationService(web3, processor, loadedAppState)
    this.notificator = new NotificationService(loadedAppState)
    this.liquidatorReady = false
    this.postponedLiquidationTriggers = []

    this.liquidator = new LiquidationService(web3)
    this.liquidator.on('ready', () => { this.liquidatorReady = true })

    const events = {
      LIQUIDATOR_LIQUIDATION_TX_SENT,
      SYNCHRONIZER_LIQUIDATION_TRIGGERED_EVENT,
      SYNCHRONIZER_LIQUIDATED_EVENT,
      SYNCHRONIZER_NEW_BLOCK_EVENT,
      SYNCHRONIZER_JOIN_EVENT,
      SYNCHRONIZER_DUCK_CREATION_EVENT,
      SYNCHRONIZER_EXIT_EVENT,
      SYNCHRONIZER_TRIGGER_LIQUIDATION_EVENT,
      SYNCHRONIZER_SAVE_STATE_REQUEST,
    }

    const initListeners = () => {
      Object.keys(events).forEach(eventName => {
        const worker = eventName.substring(0, eventName.indexOf('_')).toLowerCase()
        this[worker].on(events[eventName], processor[eventName])
      })
    }

    initListeners()
  }
}

new LiquidationMachine()

export default LiquidationMachine
