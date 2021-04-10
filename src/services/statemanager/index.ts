import { EventEmitter } from 'events'
import Logger from 'src/logger'
import { CDP } from 'src/types/Position'
import fs from 'fs'
import { APP_STATE_FILENAME } from 'src/constants'
import LiquidationMachine from 'src/app'
import { LogStore } from 'src/services/notification'

export type SynchronizerState = {
  lastProcessedBlock: number,
  lastLiquidationCheck: number,
  positions: {
    [key: string]: CDP
  },
}

export type NotificationState = {
  logs: {
    [txHash: string]: LogStore
  }
}

export interface AppState extends SynchronizerState, NotificationState {}

class StateManagerService extends EventEmitter {
  private readonly liquidationMachine: LiquidationMachine
  private readonly logger

  constructor(machine: LiquidationMachine) {
    super()
    this.logger = Logger(StateManagerService.name)
    this.liquidationMachine = machine
  }

  public loadState(): AppState {
    let loadedAppState
    try {
      loadedAppState = JSON.parse(fs.readFileSync(APP_STATE_FILENAME, 'utf8'));
    } catch (e) { }
    return loadedAppState
  }

  public saveState(synchronizerState: SynchronizerState) {
    const liquidationState: NotificationState = this.liquidationMachine.notificator.getState()
    const appState: AppState = {
      ...synchronizerState,
      ...liquidationState,
    }
    try {
      fs.writeFileSync(APP_STATE_FILENAME, JSON.stringify(appState))
    } catch (e) {
      this.logError(e)
    }
  }

  private logError(...args) {
    this.logger.error(args)
  }
}

export default StateManagerService