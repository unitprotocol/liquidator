import { EventEmitter } from 'events';
import Web3 from 'web3'
import { CDP } from 'src/types/Position'
import {
  ACTIVE_VAULT_MANAGERS,
  GET_TOTAL_DEBT_SIGNATURE,
  SYNCHRONIZER_JOIN_EVENT,
  liquidationTriggerByVaultManagerAddress,
  SYNCHRONIZER_NEW_BLOCK_EVENT,
  JOIN_TOPICS_WITH_COL,
  SYNCHRONIZER_TRIGGER_LIQUIDATION_EVENT,
  TRIGGER_LIQUIDATION_SIGNATURE,
  VAULT_ADDRESS,
  VAULT_MANAGERS,
  EXIT_TOPICS_WITH_COL,
  SYNCHRONIZER_EXIT_EVENT,
  LIQUIDATION_TRIGGERS,
  LIQUIDATION_TRIGGERED_TOPICS,
  SYNCHRONIZER_LIQUIDATION_TRIGGERED_EVENT,
  JOIN_TOPICS,
  EXIT_TOPICS,
  AUCTIONS,
  LIQUIDATED_TOPICS,
  SYNCHRONIZER_LIQUIDATED_EVENT,
  LIQUIDATION_CHECK_TIMEOUT,
  OLD_COL_MOCK,
  NEW_VERSION_OF_LIQUIDATION_TRIGGER,
  SYNCHRONIZER_SAVE_STATE_REQUEST,
} from 'src/constants'
import Logger from 'src/logger'
import { TxConfig } from 'src/types/TxConfig'
import { BlockHeader } from 'web3-eth'
import { getOracleType, parseJoinExit, parseLiquidated, parseLiquidationTrigger } from 'src/utils'
import { Log } from 'web3-core/types'
import { Broker } from 'src/broker'
import { SynchronizerState } from 'src/services/statemanager'

declare interface SynchronizationService {
  on(event: string, listener: Function): this;
  emit(event: string, payload: any): boolean;
}

class SynchronizationService extends EventEmitter {
  private readonly positions: Map <string, CDP>
  private readonly web3: Web3
  private readonly logger
  private lastLiquidationCheck: number
  private lastProcessedBlock: number
  private broker: Broker

  constructor(web3, broker: Broker, appState: SynchronizerState) {
    super();
    this.positions = new Map<string, CDP>()
    this.lastLiquidationCheck = 0
    this.lastProcessedBlock = 0
    this.web3 = web3
    this.broker = broker
    this.logger = Logger(SynchronizationService.name)
    this.fetchInitialData(appState)
  }

  async fetchInitialData(state: SynchronizerState) {

    console.time('Fetched in')
    let currentBlock
    try {
      this.log('Connecting to rpc...')
      currentBlock = await this.web3.eth.getBlockNumber()
    } catch (e) { this.logError('broken RPC'); process.exit() }

    try {

      this.lastProcessedBlock = +state.lastProcessedBlock

      this.lastLiquidationCheck = +state.lastLiquidationCheck

      const loadedPositions = state.positions
      for (const key in loadedPositions) {
        if (NEW_VERSION_OF_LIQUIDATION_TRIGGER[loadedPositions[key].liquidationTrigger.toLowerCase()]) {
          loadedPositions[key].liquidationTrigger = NEW_VERSION_OF_LIQUIDATION_TRIGGER[loadedPositions[key].liquidationTrigger.toLowerCase()]
        }
        this.positions.set(key, loadedPositions[key])
      }

      this.log(`Loaded synchronizer app state, last synced block: ${this.lastProcessedBlock}. Onchain: ${currentBlock}. Positions count: ${this.positions.size}`)

    } catch (e) {  }

    this.log('Fetching initial data')

    await this.loadMissedEvents(this.lastProcessedBlock)

    await this.filterClosedPositions()

    this.setLastProcessedBlock(currentBlock)

    console.timeEnd('Fetched in')
    this.log('Tracking events...')
    this.emit('ready', this)
    this.trackEvents()
  }

  private trackEvents() {

    this.web3.eth.subscribe("newBlockHeaders", (error, event) => {
        this.emit(SYNCHRONIZER_NEW_BLOCK_EVENT, event)
    })

  }

  public async syncToBlock(header: BlockHeader) {

    const toBlock = header.number
    if (this.lastProcessedBlock >= toBlock) return

    const fromBlock = this.lastProcessedBlock - 100;

    let promises = []

    ACTIVE_VAULT_MANAGERS.forEach(({ address, col}) => {

      promises.push(this.web3.eth.getPastLogs({
        address,
        fromBlock,
        toBlock,
        topics: col ? JOIN_TOPICS_WITH_COL : JOIN_TOPICS
      }, (error, logs ) => {
        logs.forEach(log => {
          if (!error) {
            if (this.checkAndPersistPosition(log))
            this.emit(SYNCHRONIZER_JOIN_EVENT, parseJoinExit(log))
          }
        })
      }))

      promises.push(this.web3.eth.getPastLogs({
        address,
        fromBlock,
        toBlock,
        topics: col ? EXIT_TOPICS_WITH_COL : EXIT_TOPICS
      }, (error, logs ) => {
        logs.forEach(log => {
          if (!error) {
            const exit = parseJoinExit(log)
            this.emit(SYNCHRONIZER_EXIT_EVENT, exit)
            if (exit.usdp > BigInt(0))
              this.checkPositionStateOnExit(positionKey(log.topics))
          }
        })
      }))

    });

    LIQUIDATION_TRIGGERS.forEach((address) => {

      promises.push(this.web3.eth.getPastLogs({
        address,
        fromBlock,
        toBlock,
        topics: LIQUIDATION_TRIGGERED_TOPICS,
      }, (error, logs ) =>{
        logs.forEach(log => {
          if (!error) {
            this.emit(SYNCHRONIZER_LIQUIDATION_TRIGGERED_EVENT, parseLiquidationTrigger(log))
          }
        })
      }))

    });

    AUCTIONS.forEach((address) => {

      promises.push(this.web3.eth.getPastLogs({
        address,
        fromBlock,
        toBlock,
        topics: LIQUIDATED_TOPICS,
      }, (error, logs ) => {
        logs.forEach(log => {
          if (!error) {
            this.emit(SYNCHRONIZER_LIQUIDATED_EVENT, parseLiquidated(log))
            this.checkPositionStateOnExit(positionKey(log.topics))
          }
        })
      }))

    });

    await Promise.all(promises);

    this.setLastProcessedBlock(toBlock)
  }

  private parseJoinData(topics, data): [boolean, string, string] {
    const withCol = topics[0] === JOIN_TOPICS_WITH_COL[0]
    if ('0x' + topics[1].substr(26) === OLD_COL_MOCK) {
      return [false, null, null]
    }
    const id = positionKey(topics)
    const exist: CDP = this.positions.get(id)
    const USDP = BigInt('0x' + data.substring(2 + (withCol ? 2 : 1) * 64, (withCol ? 3 : 2) * 64))
    const shouldPersist = !exist && USDP > BigInt(0)
    return [shouldPersist, id, USDP.toString()]
  }

  private checkAndPersistPosition({ topics, data, address }: Log ): boolean {
    const [shouldPersist, id, USDP] = this.parseJoinData(topics, data);
    if (shouldPersist) {
      this.positions.set(id, { USDP, liquidationTrigger: liquidationTriggerByVaultManagerAddress(address) })
    }
    return shouldPersist
  }

  async checkLiquidatable(header: BlockHeader) {
    if (+header.number >= this.lastLiquidationCheck + LIQUIDATION_CHECK_TIMEOUT) {
      this.setLastLiquidationCheck(+header.number)
      const timeStart = new Date().getTime()
      const keys = Array.from(this.positions.keys())
      const promises = []
      let oracleTypes = []
      let skipped = 0
      const txConfigs: TxConfig[] = []
      keys.forEach(key => {
        const tokenAddr = '0x' + key.substring(24, 64);
        oracleTypes.push(getOracleType(tokenAddr))
      })

      oracleTypes = await Promise.all(oracleTypes)

      keys.forEach((key, i) => {
        const v = this.positions.get(key)
        if (!v || !oracleTypes[i]) return skipped++
        const tx: TxConfig = {
          to: v.liquidationTrigger,
          data: TRIGGER_LIQUIDATION_SIGNATURE + key,
          from: process.env.ETHEREUM_ADDRESS,
          key,
        }
        txConfigs.push(tx)
        promises.push(this.web3.eth.estimateGas(tx))
      })
      const gasData = (await Promise.all(promises.map((p, i) => p.catch((e) =>{
        if (SynchronizationService.isSuspiciousError(e.toString())) {
          console.log(e.toString())
          console.log(txConfigs[i])
        }
      }))))
      const timeEnd = new Date().getTime()
      this.log(`estimated gas for ${keys.length} (skipped: ${skipped}) positions on block ${header.number} ${header.hash} in ${timeEnd - timeStart}ms`)

      gasData.forEach((gas, i) => {
        // during synchronization the node may respond with tx data to non-contract address
        // so check gas limit to prevent incorrect behaviour
        if (gas && +gas > 30_000) {
          const tx = txConfigs[i]
          tx.gas = gas
          this.emit(SYNCHRONIZER_TRIGGER_LIQUIDATION_EVENT, { tx, blockNumber: +header.number })
        }
      })
    }
  }

  private async filterClosedPositions() {

    const promises = []
    const keys = []
    this.positions.forEach((_, k) => {
      promises.push(this.web3.eth.call({
        to: VAULT_ADDRESS,
        data: GET_TOTAL_DEBT_SIGNATURE + k
      }))
      keys.push(k)
    })
    this.log('total CDP count', this.positions.size)
    const positionDebts = await Promise.all(promises);
    positionDebts.forEach((debt, i) => {
      if (BigInt(debt) === BigInt(0)) {
        this.positions.delete(keys[i])
      }
    })
    this.log('open CDP count', this.positions.size)

  }

  private async checkPositionStateOnExit(key: string) {

    const debt = await this.web3.eth.call({
      to: VAULT_ADDRESS,
      data: GET_TOTAL_DEBT_SIGNATURE + key
    })
    if (BigInt(debt) === BigInt(0)) {
      this.deletePosition(key)
    }

  }

  private async loadMissedEvents(lastSyncedBlock) {

    if (!lastSyncedBlock) return this.bootstrap()

    this.log('Loading missed events...')

    const fromBlock = lastSyncedBlock + 1

    const joinPromises = []
    const exitPromises = []
    const triggerPromises = []
    const liquidationPromises = []

    ACTIVE_VAULT_MANAGERS.forEach(({ address, col}) => {

      joinPromises.push(this.web3.eth.getPastLogs({
        fromBlock,
        address,
        topics: col ? JOIN_TOPICS_WITH_COL : JOIN_TOPICS
      }))

      exitPromises.push(this.web3.eth.getPastLogs({
        fromBlock,
        address,
        topics: col ? EXIT_TOPICS_WITH_COL : EXIT_TOPICS
      }))

    });

    LIQUIDATION_TRIGGERS.forEach((address) => {

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
        topics: LIQUIDATED_TOPICS,
      }))

    });

    const notifications = []
    const joins = (await Promise.all(joinPromises)).reduce((acc, curr) => [...acc, ...curr], [])
    joins.forEach((log: Log) => {
      this.checkAndPersistPosition(log)
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
      notifications.push({ time: log.blockNumber, args: [SYNCHRONIZER_LIQUIDATED_EVENT, parseLiquidated(log as Log)] })
    })

    notifications
      .sort((a, b) => a.time > b.time ? 1 : -1)


    for (const { args } of notifications) {
      await this.broker[args[0]](args[1]);
    }

  }

  private async bootstrap() {

    this.log('Bootstrapping from scratch...')

    const promises = []

    VAULT_MANAGERS.forEach(({ address, fromBlock, toBlock, col }) => {
      if (toBlock > toBlock) return
      promises.push(this.web3.eth.getPastLogs({
        fromBlock,
        toBlock,
        address,
        topics: col ? JOIN_TOPICS_WITH_COL : JOIN_TOPICS
      }))
    })

    const logsArray = await Promise.all(promises);
    const logs = logsArray.reduce((acc, curr) => [...acc, ...curr], [])
    logs.forEach(log => this.checkAndPersistPosition(log))

  }

  private static isSuspiciousError(errMsg) {
    const legitMsgs = ['SAFE_POSITION', 'LIQUIDATING_POSITION']
    for (const legitMsg of legitMsgs) {
      if (errMsg.includes(legitMsg))
        return false
    }
    return true
  }

  private getAppState(): SynchronizerState {
    return {
      lastProcessedBlock: this.lastProcessedBlock,
      lastLiquidationCheck: this.lastLiquidationCheck,
      positions: Object.fromEntries(this.positions.entries()),
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

  private deletePosition(key) {
    this.positions.delete(key)
    this.saveState()
  }

  private log(...args) {
    this.logger.info(args)
  }

  private logError(...args) {
    this.logger.error(args)
  }
}

function positionKey(topics) {
  return topics[1].substr(2) + topics[2].substr(2);
}

export default SynchronizationService
