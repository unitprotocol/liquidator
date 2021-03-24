import { EventEmitter } from 'events';
import Web3 from 'web3'
import { CDP } from 'src/types/Position'
import {
  ACTIVE_VAULT_MANAGERS,
  GET_TOTAL_DEBT_SIGNATURE,
  JOIN_EVENT,
  liquidationTriggerByVaultManagerAddress,
  NEW_BLOCK_EVENT,
  JOIN_TOPICS_WITH_COL,
  TRIGGER_LIQUIDATION,
  TRIGGER_LIQUIDATION_SIGNATURE,
  VAULT_ADDRESS,
  VAULT_MANAGERS,
  EXIT_TOPICS_WITH_COL,
  EXIT_EVENT,
  LIQUIDATION_TRIGGERS,
  LIQUIDATION_TRIGGERED_TOPICS,
  LIQUIDATION_TRIGGERED_EVENT,
  JOIN_TOPICS,
  EXIT_TOPICS,
  AUCTIONS,
  LIQUIDATED_TOPICS,
  LIQUIDATED_EVENT,
  LIQUIDATION_CHECK_TIMEOUT,
  OLD_COL_MOCK,
  APP_STATE_FILENAME, NEW_VERSION_OF_LIQUIDATION_TRIGGER,
} from 'src/constants'
import Logger from 'src/logger'
import { TxConfig } from 'src/types/TxConfig'
import { BlockHeader } from 'web3-eth'
import { parseJoinExit, parseLiquidated, parseLiquidationTrigger } from 'src/utils'
import fs from 'fs'
import { Log } from 'web3-core/types'

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

  constructor(web3) {
    super();
    this.positions = new Map<string, CDP>()
    this.lastLiquidationCheck = 0
    this.lastProcessedBlock = 0
    this.web3 = web3
    this.logger = Logger(SynchronizationService.name)
    this.fetchInitialData()
  }

  async fetchInitialData() {

    let currentBlock
    try {
      this.log('Connecting to rpc...')
      currentBlock = await this.web3.eth.getBlockNumber()
    } catch (e) { this.logError('broken RPC'); process.exit() }

    try {

      const loadedStateState = JSON.parse(fs.readFileSync(APP_STATE_FILENAME, 'utf8'));

      this.lastProcessedBlock = +loadedStateState.lastProcessedBlock

      this.lastLiquidationCheck = +loadedStateState.lastLiquidationCheck

      const loadedPositions = loadedStateState.positions
      for (const key in loadedPositions) {
        if (NEW_VERSION_OF_LIQUIDATION_TRIGGER[loadedPositions[key].liquidationTrigger.toLowerCase()]) {
          loadedPositions[key].liquidationTrigger = NEW_VERSION_OF_LIQUIDATION_TRIGGER[loadedPositions[key].liquidationTrigger.toLowerCase()]
        }
        this.positions.set(key, loadedPositions[key])
      }

      this.log(`Loaded app state, last synced block: ${this.lastProcessedBlock}. Onchain: ${currentBlock}`)

    } catch (e) {  }

    this.log('Fetching initial data')

    await this.loadMissedEvents(this.lastProcessedBlock)

    await this.filterClosedPositions()

    this.setLastProcessedBlock(currentBlock)

    this.log('Finished initializing. Tracking events...')
    this.emit('ready', this)
    this.trackEvents()
  }

  private trackEvents() {

    this.web3.eth.subscribe("newBlockHeaders", (error, event) => {
        this.emit(NEW_BLOCK_EVENT, event)
    })

    ACTIVE_VAULT_MANAGERS.forEach(({ address, col}) => {

      this.web3.eth.subscribe('logs', {
        address,
        topics: col ? JOIN_TOPICS_WITH_COL : JOIN_TOPICS
      }, (error, log ) =>{
        if (!error) {
          if (this.checkAndPersistPosition(log))
            this.saveState()
          this.emit(JOIN_EVENT, parseJoinExit(log))
        }
      })

      this.web3.eth.subscribe('logs', {
        address,
        topics: col ? EXIT_TOPICS_WITH_COL : EXIT_TOPICS
      }, (error, log ) => {
        if (!error) {
          const exit = parseJoinExit(log)
          this.emit(EXIT_EVENT, exit)
          if (exit.usdp > BigInt(0))
            this.checkPositionStateOnExit(positionKey(log.topics))
        }
      })

    });

    LIQUIDATION_TRIGGERS.forEach((address) => {

      this.web3.eth.subscribe('logs', {
        address,
        topics: LIQUIDATION_TRIGGERED_TOPICS,
      }, (error, log ) =>{
        if (!error) {
          this.emit(LIQUIDATION_TRIGGERED_EVENT, parseLiquidationTrigger(log))
        }
      })

    });

    AUCTIONS.forEach((address) => {

      this.web3.eth.subscribe('logs', {
        address,
        topics: LIQUIDATED_TOPICS,
      }, (error, log ) =>{
        if (!error) {
          this.emit(LIQUIDATED_EVENT, parseLiquidated(log))
          this.checkPositionStateOnExit(positionKey(log.topics))
        }
      })

    });
    // this.web3.eth.subscribe('logs', {
    //   address: DUCK_ADDRESS,
    //   topics: DUCK_CREATION_TOPICS
    // }, (error, log ) => {
    //   if (!error) {
    //     const mint = parseTransfer(log)
    //     this.emit(DUCK_CREATION_EVENT, mint)
    //   }
    // })
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
    this.setLastProcessedBlock(+header.number)
    if (+header.number >= this.lastLiquidationCheck + LIQUIDATION_CHECK_TIMEOUT) {
      this.setLastLiquidationCheck(+header.number)
      const keys = Array.from(this.positions.keys())
      const promises = []
      const txConfigs: TxConfig[] = []
      keys.forEach(key => {
        const v = this.positions.get(key)
        if (!v) return
        const tx: TxConfig = {
          to: v.liquidationTrigger,
          data: TRIGGER_LIQUIDATION_SIGNATURE + key,
          from: process.env.ETHEREUM_ADDRESS,
          key,
        }
        txConfigs.push(tx)
        promises.push(this.web3.eth.estimateGas(tx))
      })
      const timeLabel = `estimated gas for ${keys.length} positions on block ${header.number} ${header.hash}`
      console.time(timeLabel)
      const gasData = (await Promise.all(promises.map((p, i) => p.catch((e) =>{
        if (SynchronizationService.isSuspiciousError(e.toString())) {
          console.log(e.toString())
          console.log(txConfigs[i])
        }
      }))))
      console.timeEnd(timeLabel)
      // this.log(`.checkLiquidatable: there are ${gasData.filter(d => d).length} liquidatable positions`)
      gasData.forEach((gas, i) => {
        // during synchronization the node may respond with tx data to non-contract address
        // so check gas limit to prevent incorrect behaviour
        if (gas && +gas > 30_000) {
          const tx = txConfigs[i]
          tx.gas = gas
          this.emit(TRIGGER_LIQUIDATION, { tx, blockNumber: +header.number })
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
      this.log(`CDP ${key} has been closed`)
    } else {
      this.log(`CDP ${key} is still open`)
    }

  }

  private async loadMissedEvents(lastSyncedBlock) {

    if (!lastSyncedBlock) return this.bootstrap()

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
      notifications.push({ time: log.blockNumber, args: [JOIN_EVENT, parseJoinExit(log as Log)] })
    })

    const exits = (await Promise.all(exitPromises)).reduce((acc, curr) => [...acc, ...curr], [])
    exits.forEach(log => {
      notifications.push({ time: log.blockNumber, args: [EXIT_EVENT, parseJoinExit(log as Log)] })
    })

    const triggers = (await Promise.all(triggerPromises)).reduce((acc, curr) => [...acc, ...curr], [])
    triggers.forEach(log => {
      notifications.push({ time: log.blockNumber, args: [LIQUIDATION_TRIGGERED_EVENT, parseLiquidationTrigger(log as Log)] })
    })

    const liquidations = (await Promise.all(liquidationPromises)).reduce((acc, curr) => [...acc, ...curr], [])
    liquidations.forEach(log => {
      notifications.push({ time: log.blockNumber, args: [LIQUIDATED_EVENT, parseLiquidated(log as Log)] })
    })

    notifications
      .sort((a, b) => a.time > b.time ? 1 : -1)
      .forEach(({ args }) => this.emit(args[0], args[1]))

  }

  private async bootstrap() {

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

  private getAppState() {
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
    try {
      fs.writeFileSync(APP_STATE_FILENAME, JSON.stringify(this.getAppState()))
    } catch (e) {
      this.logError(e)
    }
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
