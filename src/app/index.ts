import 'module-alias/register'
import SynchronizationService from 'src/services/synchronization'
import LiquidationService from 'src/services/liquidation'
import NotificationService from 'src/services/notification'
import { Liquidation } from 'src/types/TxConfig'
import { web3 } from 'src/provider'
import EventBroker from 'src/broker'
import StateManagerService from 'src/services/statemanager'

class LiquidationMachine {
  public readonly synchronizer: SynchronizationService
  public readonly liquidator: LiquidationService
  public readonly notificator: NotificationService
  public readonly statemanager: StateManagerService
  public liquidatorReady: boolean
  public postponedLiquidationTriggers: Liquidation[]

  constructor() {
    const broker = EventBroker(this)
    this.statemanager = new StateManagerService(this)
    let loadedAppState = this.statemanager.loadState()

    this.notificator = new NotificationService(loadedAppState)
    this.synchronizer = new SynchronizationService(web3, broker, loadedAppState, this.notificator)
    this.liquidatorReady = false
    this.postponedLiquidationTriggers = []

    this.liquidator = new LiquidationService(web3)
    this.liquidator.on('ready', () => { this.liquidatorReady = true })

    const events = Object.keys(broker)

    const initListeners = () => {
      events.forEach(eventName => {
        const worker = eventName.substring(0, eventName.indexOf('_')).toLowerCase()
        this[worker].on(eventName, broker[eventName])
      })
    }

    initListeners()
  }
}

new LiquidationMachine()

export default LiquidationMachine
