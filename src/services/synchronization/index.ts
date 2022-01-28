import { EventEmitter } from 'events';
import Web3 from 'web3'
import { CDP } from 'src/types/Position'
import {
  ACTIVE_VAULT_MANAGERS,
  SYNCHRONIZER_JOIN_EVENT,
  SYNCHRONIZER_NEW_BLOCK_EVENT,
  SYNCHRONIZER_TRIGGER_LIQUIDATION_EVENT,
  SYNCHRONIZER_EXIT_EVENT,
  LIQUIDATION_TRIGGERED_TOPICS,
  SYNCHRONIZER_LIQUIDATION_TRIGGERED_EVENT,
  JOIN_TOPICS,
  EXIT_TOPICS,
  AUCTIONS,
  BUYOUT_TOPICS,
  SYNCHRONIZER_LIQUIDATED_EVENT,
  LIQUIDATION_CHECK_TIMEOUT,
  SYNCHRONIZER_SAVE_STATE_REQUEST,
  FALLBACK_LIQUIDATION_TRIGGER,
  MAIN_LIQUIDATION_TRIGGER,
} from 'src/constants'
import Logger from 'src/logger'
import { TxConfig } from 'src/types/TxConfig'
import { BlockHeader } from 'web3-eth'
import {
  parseJoinExit,
  parseBuyout,
  parseLiquidationTrigger,
  encodeLiquidationTriggerWithProof,
  getProof,
  getEthPriceInUsd,
  getAllCdpsData,
  getTriggerLiquidationSignature,
} from 'src/utils'
import { Log } from 'web3-core/types'
import { Broker } from 'src/broker'
import { SynchronizerState } from 'src/services/statemanager'
import { isLiquidatable_Fallback, ORACLE_TYPES } from 'src/utils/oracle'
import { inspect } from 'util'
import NotificationService from 'src/services/notification'

declare interface SynchronizationService {
  on(event: string, listener: Function): this;
  emit(event: string, payload: any): boolean;
}

class SynchronizationService extends EventEmitter {
  private readonly web3: Web3
  private readonly logger
  private lastLiquidationCheck: number
  private lastProcessedBlock: number
  private readonly broker: Broker
  private readonly notificator: NotificationService

  constructor(web3, broker: Broker, appState: SynchronizerState, notificator: NotificationService) {
    super();
    this.lastLiquidationCheck = 0
    this.lastProcessedBlock = 0
    this.web3 = web3
    this.broker = broker
    this.notificator = notificator
    this.logger = Logger(SynchronizationService.name)
    this.fetchInitialData(appState)
  }

  async fetchInitialData(state: SynchronizerState) {

    console.time('Fetched in')
    let currentBlock
    try {
      this.log('Connecting to the rpc...')
      currentBlock = await Promise.race([this.web3.eth.getBlockNumber(), timeout(5_000)])
      if (!currentBlock) {
        this.logError('Timeout');
        process.exit()
      }
    } catch (e) { this.logError('broken RPC'); process.exit() }

    try {
      this.lastProcessedBlock = +state.lastProcessedBlock
      this.lastLiquidationCheck = +state.lastLiquidationCheck
    } catch (e) {
      this.logError(`load state error: ${e.toString()}`)
    }

    this.log(`Fetching initial data lastProcessedBlock: ${this.lastProcessedBlock} lastLiquidationCheck: ${this.lastLiquidationCheck}`)

    await this.loadMissedEvents(this.lastProcessedBlock)
    this.setLastProcessedBlock(currentBlock)

    console.timeEnd('Fetched in')
    this.log('Tracking events...')
    this.emit('ready', this)
    await this.logOnline('Started')
    this.trackEvents()
  }

  private trackEvents() {

    this.web3.eth.subscribe("newBlockHeaders", (error, event) => {
        event && this.emit(SYNCHRONIZER_NEW_BLOCK_EVENT, event)
    })

  }

  public async syncToBlock(header: BlockHeader) {

    const toBlock = header.number
    if (this.lastProcessedBlock >= toBlock) return

    const fromBlock = this.lastProcessedBlock - 1000;

    let promises = []

    ACTIVE_VAULT_MANAGERS.forEach((address: string) => {

      promises.push(this.web3.eth.getPastLogs({
        address,
        fromBlock,
        toBlock,
        topics: JOIN_TOPICS
      }, (error, logs ) => {
        if (!this.checkPastLogsResult(error, logs))
          return
        logs.forEach(log => {
          if (!error) {
            this.emit(SYNCHRONIZER_JOIN_EVENT, parseJoinExit(log))
          } else {
            this.logError(error)
          }
        })
      }))

      promises.push(this.web3.eth.getPastLogs({
        address,
        fromBlock,
        toBlock,
        topics: EXIT_TOPICS
      }, (error, logs ) => {
        if (!this.checkPastLogsResult(error, logs))
          return
        logs.forEach(log => {
          if (!error) {
            const exit = parseJoinExit(log)
            this.emit(SYNCHRONIZER_EXIT_EVENT, exit)
          } else {
            this.logError(error)
          }
        })
      }))

      promises.push(this.web3.eth.getPastLogs({
        address,
        fromBlock,
        toBlock,
        topics: LIQUIDATION_TRIGGERED_TOPICS,
      }, (error, logs ) =>{
        if (!this.checkPastLogsResult(error, logs))
          return
        logs.forEach(log => {
          if (!error) {
            this.emit(SYNCHRONIZER_LIQUIDATION_TRIGGERED_EVENT, parseLiquidationTrigger(log))
          } else {
            this.logError(error)
          }
        })
      }))

    });

    AUCTIONS.forEach((address) => {

      promises.push(this.web3.eth.getPastLogs({
        address,
        fromBlock,
        toBlock,
        topics: BUYOUT_TOPICS,
      }, (error, logs ) => {
        if (!this.checkPastLogsResult(error, logs))
          return
        logs.forEach(log => {
          if (!error) {
            this.emit(SYNCHRONIZER_LIQUIDATED_EVENT, parseBuyout(log))
          } else {
            this.logError(error)
          }
        })
      }))

    });

    await Promise.all(promises);

    this.setLastProcessedBlock(toBlock)
  }

  async checkLiquidatable(header: BlockHeader) {
    if (+header.number < this.lastLiquidationCheck + LIQUIDATION_CHECK_TIMEOUT)
      return

    this.setLastLiquidationCheck(+header.number)
    const timeStart = new Date().getTime()
    const positions: Map<string, CDP> = await getAllCdpsData(header.number)
    const triggerPromises = []
    const promisesFallback = []
    const txBuildersFallback = []
    const txConfigs: TxConfig[] = []
    const txConfigsFallback: TxConfig[] = []
    const ethPriceUsd = await getEthPriceInUsd()

    let ignorePositions = new Set()
    if (!!(process.env.IGNORE_POSITIONS))
      ignorePositions = new Set(process.env.IGNORE_POSITIONS.split(",").map(x => x.toLowerCase()))

    let skipped = 0
    for (const [key, position] of positions.entries()) {
      if (!position) {
        this.logError(`checkLiquidatable empty position ${position} ${key}`)
        skipped++
        continue
      }
      if (ignorePositions.has(`${position.asset}:${position.owner}`.toLowerCase())) {
        skipped++
        continue
      }
      if (position.liquidationBlock !== 0) {
        skipped++
        continue
      }
      if (!position.isDebtsEnoughForLiquidationSpends) {
        skipped++
        continue
      }

      // CDPs with onchain oracle
      if (!position.isFallback) { // for assets with keydonix oracles oracleType was 0 earlier
        const tx: TxConfig = {
          to: MAIN_LIQUIDATION_TRIGGER,
          data: getTriggerLiquidationSignature(position),
          from: process.env.ETHEREUM_ADDRESS,
          key,
        }
        const configId = txConfigs.length
        txConfigs.push(tx)
        triggerPromises.push(this.web3.eth.estimateGas(tx).catch((e) => {
          if (SynchronizationService.isSuspiciousError(e.toString())) {
            if (SynchronizationService.isConnectionError(String(e))) {
              process.exit(1);
            }
            this.alarm(e.toString())
            this.alarm(txConfigs[configId])
          }
        }))
        continue
      }

      /* fallback oracle */

      const tx: TxConfig = {
        data: undefined,
        to: FALLBACK_LIQUIDATION_TRIGGER,
        from: process.env.ETHEREUM_ADDRESS,
        key
      }

      const buildTx = (fallbackOracleType: ORACLE_TYPES) => async (tx: TxConfig, blockNumber: number): Promise<TxConfig> => {
        const proof = await getProof(position.asset, fallbackOracleType, blockNumber)
        tx.data = encodeLiquidationTriggerWithProof(position.asset, position.owner, proof)
        const gas = await this.web3.eth.estimateGas(tx).catch(e => {
          this.alarm(e.toString())
          return undefined
        })

        if (gas && gas > 200_000) {
          tx.gas = gas
          return tx
        } else {
          await this.alarm(`Cannot estimate gas for ${inspect(tx)}`)
          return undefined
        }
      }
      promisesFallback.push(isLiquidatable_Fallback(position.asset, position.owner, +header.number, ethPriceUsd))
      txBuildersFallback.push(buildTx)
      txConfigsFallback.push(tx)
    }

    const estimatedGas = await Promise.all(triggerPromises)

    const fallbackLiquidatables = await Promise.all(promisesFallback)

    const timeEnd = new Date().getTime()

    await this.logOnline(`Checked ${triggerPromises.length} + ${fallbackLiquidatables.length} fb CDPs (skipped: ${skipped}) on block ${header.number} ${header.hash} in ${timeEnd - timeStart}ms`)

    estimatedGas.forEach((gas, i) => {
      // during synchronization the node may respond with tx data to non-contract address
      // so check gas limit to prevent incorrect behaviour
      if (gas && +gas > 30_000) {
        const tx = txConfigs[i]
        tx.gas = gas as number
        this.emit(SYNCHRONIZER_TRIGGER_LIQUIDATION_EVENT, { tx, blockNumber: +header.number })
      }
    })

    fallbackLiquidatables.forEach(([fallbackOracleType, isLiquidatable], i) => {
      if (!isLiquidatable) return
      this.emit(SYNCHRONIZER_TRIGGER_LIQUIDATION_EVENT, { tx: txConfigsFallback[i], blockNumber: +header.number, buildTx: txBuildersFallback[i](fallbackOracleType) })
    })
  }

  private async loadMissedEvents(lastSyncedBlock) {

    if (!lastSyncedBlock)  // otherwise we will spam to the pulse with all events from the beginning
      return

    this.log('Loading missed events...')

    const fromBlock = lastSyncedBlock + 1

    const joinPromises = []
    const exitPromises = []
    const triggerPromises = []
    const liquidationPromises = []

    ACTIVE_VAULT_MANAGERS.forEach((address: string) => {

      joinPromises.push(this.web3.eth.getPastLogs({
        fromBlock,
        address,
        topics: JOIN_TOPICS
      }))

      exitPromises.push(this.web3.eth.getPastLogs({
        fromBlock,
        address,
        topics: EXIT_TOPICS
      }))

      triggerPromises.push(this.web3.eth.getPastLogs({
        fromBlock,
        address,
        topics: LIQUIDATION_TRIGGERED_TOPICS,
      }))

    });

    AUCTIONS.forEach((address) => {

      liquidationPromises.push(this.web3.eth.getPastLogs({
        fromBlock,
        address,
        topics: BUYOUT_TOPICS,
      }))

    });

    const notifications = []
    const joins = (await Promise.all(joinPromises)).reduce((acc, curr) => [...acc, ...curr], [])
    joins.forEach((log: Log) => {
      notifications.push({ time: log.blockNumber, args: [SYNCHRONIZER_JOIN_EVENT, parseJoinExit(log as Log)] })
    })

    const exits = (await Promise.all(exitPromises)).reduce((acc, curr) => [...acc, ...curr], [])
    exits.forEach(log => {
      notifications.push({ time: log.blockNumber, args: [SYNCHRONIZER_EXIT_EVENT, parseJoinExit(log as Log)] })
    })

    const triggers = (await Promise.all(triggerPromises)).reduce((acc, curr) => [...acc, ...curr], [])
    triggers.forEach(log => {
      notifications.push({ time: log.blockNumber, args: [SYNCHRONIZER_LIQUIDATION_TRIGGERED_EVENT, parseLiquidationTrigger(log as Log)] })
    })

    const liquidations = (await Promise.all(liquidationPromises)).reduce((acc, curr) => [...acc, ...curr], [])
    liquidations.forEach(log => {
      notifications.push({ time: log.blockNumber, args: [SYNCHRONIZER_LIQUIDATED_EVENT, parseBuyout(log as Log)] })
    })

    notifications.sort((a, b) => a.time > b.time ? 1 : -1)

    for (const { args } of notifications) {
      await this.broker[args[0]](args[1]);
    }

  }

  private static isSuspiciousError(errMsg) {
    const legitMsgs = ['SAFE_POSITION', 'LIQUIDATING_POSITION']
    for (const legitMsg of legitMsgs) {
      if (errMsg.includes(legitMsg))
        return false
    }
    return true
  }

  private static isConnectionError(errMsg) {
    return errMsg.includes('CONNECTION ERROR')
  }

  private getAppState(): SynchronizerState {
    return {
      lastProcessedBlock: this.lastProcessedBlock,
      lastLiquidationCheck: this.lastLiquidationCheck
    }
  }

  private setLastLiquidationCheck(value) {
    if (value <= this.lastLiquidationCheck) return
    this.lastLiquidationCheck = value
    this.saveState()
  }

  private setLastProcessedBlock(value) {
    if (value <= this.lastProcessedBlock) return
    this.lastProcessedBlock = value
    this.saveState()
  }

  private saveState() {
    this.emit(SYNCHRONIZER_SAVE_STATE_REQUEST, this.getAppState())
  }

  private log(...args) {
    this.logger.info(args)
  }

  private logOnline(...args) {
    return this.notificator.logAction(this.logger.format(args, true))
  }

  private logError(...args) {
    this.logger.error(args)
  }

  private alarm(...args) {
    return this.notificator.logAlarm(this.logger.format(args, true))
  }

  private checkPastLogsResult(error, logs): boolean {
    if (typeof logs !== 'undefined')
      return true

    if (!!error)
      this.logError(error)
    return false
  }
}

function timeout(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

export default SynchronizationService
