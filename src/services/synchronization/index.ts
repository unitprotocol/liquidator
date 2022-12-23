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
  BLOCKS_CHECK_DELAY,
  SYNCHRONIZER_SAVE_STATE_REQUEST,
  FALLBACK_LIQUIDATION_TRIGGER,
  MAIN_LIQUIDATION_TRIGGER,
  CHAIN_NAME,
  IS_DEV,
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
  getAllCdpsData,
  getTriggerLiquidationSignature,
} from 'src/utils'
import { Log } from 'web3-core/types'
import { Broker } from 'src/broker'
import { SynchronizerState } from 'src/services/statemanager'
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
    await this.logOnline(`Started ${CHAIN_NAME} in ${IS_DEV?'devel':'production'} mode`)
    this.trackEvents()
  }

  private trackEvents() {

    this.web3.eth.subscribe("newBlockHeaders", (error, event) => {
        event && this.emit(SYNCHRONIZER_NEW_BLOCK_EVENT, event)
    })

  }

  public async syncToBlock(header: BlockHeader) {
    // multiplier 1.1 not to run sync in one block with liquidation checks (to save rate limit)
    if (+header.number < this.lastProcessedBlock + BLOCKS_CHECK_DELAY * 1.1)
      return

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
    if (+header.number < this.lastLiquidationCheck + BLOCKS_CHECK_DELAY)
      return

    this.setLastLiquidationCheck(+header.number)
    const timeStart = new Date().getTime()
    const positions: Map<string, CDP> = await getAllCdpsData(header.number)
    const triggerPromises = []
    const txConfigs: TxConfig[] = []
    const txConfigBuilders = {}

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

      let tx: TxConfig;
      const configId = txConfigs.length
      if (position.isFallback) {
        const buildTx = async (blockNumber: number): Promise<TxConfig> => {
          const proof = await getProof(position.asset, position.oracleType, blockNumber)
          return {
            to: FALLBACK_LIQUIDATION_TRIGGER,
            data: encodeLiquidationTriggerWithProof(position.asset, position.owner, proof),
            from: process.env.ETHEREUM_ADDRESS,
            key
          }
        }

        tx = await buildTx(+header.number);
        txConfigBuilders[configId] = buildTx;
      } else {
         tx = {
          to: MAIN_LIQUIDATION_TRIGGER,
          data: getTriggerLiquidationSignature(position),
          from: process.env.ETHEREUM_ADDRESS,
          key,
        }
      }

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
    }

    const estimatedGas = await Promise.all(triggerPromises)

    const timeEnd = new Date().getTime()
    await this.logOnline(`Checked ${txConfigs.length - Object.keys(txConfigBuilders).length} + ${Object.keys(txConfigBuilders).length} fb CDPs (skipped: ${skipped}) on block ${header.number} ${header.hash} in ${timeEnd - timeStart}ms`)

    estimatedGas.forEach((gas, i) => {
      // during synchronization the node may respond with tx data to non-contract address
      // so check gas limit to prevent incorrect behaviour
      if (gas && +gas > 30_000) {
        const tx = txConfigs[i]
        tx.gas = gas as number
        this.emit(SYNCHRONIZER_TRIGGER_LIQUIDATION_EVENT, { tx, blockNumber: +header.number, buildTx: txConfigBuilders[i]  })
      }
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

    // in some networks hex representation of error is returned (gnosis)
    let decodedErrorMsg = null;
    try {
      let decodedErrorMsgGroups = errMsg.match(/Reverted 0x([0-9a-f]+)/)
      decodedErrorMsg = decodedErrorMsgGroups ? Buffer.from(decodedErrorMsgGroups[1], 'hex').toString() : null;
    } catch (error) {}

    for (const legitMsg of legitMsgs) {
      if (errMsg.includes(legitMsg)  || (decodedErrorMsg && decodedErrorMsg.includes(legitMsg)))
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
    this.logger.info(args)
    // return this.notificator.logAction(this.logger.format(args, true))
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
