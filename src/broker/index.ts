import { BlockHeader } from 'web3-eth'
import LiquidationMachine from 'src/app'

type Process = (data: any) => any

export type Broker = { [name: string]: Process }

type EventBroker = (LiquidationMachine) => Broker

const EventBroker: EventBroker = (machine: LiquidationMachine) => ({
  SYNCHRONIZER_LIQUIDATION_TRIGGERED_EVENT: data => machine.notificator.notifyTriggered(data),
  SYNCHRONIZER_LIQUIDATED_EVENT: data => machine.notificator.notifyLiquidated(data),
  SYNCHRONIZER_NEW_BLOCK_EVENT: (header: BlockHeader) => [
    machine.synchronizer.checkLiquidatable(header),
    machine.synchronizer.syncToBlock(header)
  ],
  SYNCHRONIZER_JOIN_EVENT: join => machine.notificator.notifyJoin(join),
  SYNCHRONIZER_SAVE_STATE_REQUEST: (synchronizerAppState) => machine.statemanager.saveState(synchronizerAppState),
  SYNCHRONIZER_DUCK_CREATION_EVENT: mint => machine.notificator.notifyDuck(mint),
  SYNCHRONIZER_EXIT_EVENT: exit => machine.notificator.notifyExit(exit),
  SYNCHRONIZER_TRIGGER_LIQUIDATION_EVENT: (event) => {

    // postpone liquidations when service is not yet available
    if (!machine.liquidatorReady) {
      machine.postponedLiquidationTriggers.push(event)
      return
    }

    const promises = []

    if (machine.postponedLiquidationTriggers.length) {
      // process postponed liquidations
      for (const postponedTx of machine.postponedLiquidationTriggers) {
        promises.push(machine.liquidator.triggerLiquidation(postponedTx))
      }

      machine.postponedLiquidationTriggers = []
    }

    // trigger the liquidation
    promises.push(machine.liquidator.triggerLiquidation(event))

    return promises
  },
})

export default EventBroker