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
  LIQUIDATIONS_TRIGGERS,
  LIQUIDATION_TRIGGERED_TOPICS,
  LIQUIDATION_TRIGGERED_EVENT,
  JOIN_TOPICS,
  EXIT_TOPICS,
  AUCTIONS,
  LIQUIDATED_TOPICS,
  LIQUIDATED_EVENT,
} from 'src/constants'
import Logger from 'src/logger'
import { TxConfig } from 'src/types/TxConfig'
import { BlockHeader } from 'web3-eth'
import { parseJoinExit, parseLiquidated, parseLiquidationTrigger } from 'src/utils'

declare interface SynchronizationService {
  on(event: string, listener: Function): this;
  emit(event: string, payload: any): boolean;
}

class SynchronizationService extends EventEmitter {
  private readonly positions: Map <string, CDP>
  private readonly web3: Web3
  private readonly logger

  constructor(web3) {
    super();
    this.positions = new Map<string, CDP>()
    this.web3 = web3
    this.fetchInitialData()
    this.logger = Logger(SynchronizationService.name)
  }

  async fetchInitialData() {
    const promises = []
    VAULT_MANAGERS.forEach(({address, fromBlock, toBlock, col}) => {
      promises.push(this.web3.eth.getPastLogs({
        fromBlock,
        toBlock,
        address,
        topics: col ? JOIN_TOPICS_WITH_COL : JOIN_TOPICS
      }))
    })
    const logsArray = await Promise.all(promises);
    const logs = logsArray.reduce((acc, curr) => [...acc, ...curr], []);
    logs.forEach(({ topics, data, address }) => {
      this.checkAndPersistPosition(topics, data, liquidationTriggerByVaultManagerAddress(address))
    });

    await this.filterClosedPositions()
    this.emit('ready', this);
    this.trackEvents();
  }

  private trackEvents() {
    this.web3.eth.subscribe("newBlockHeaders", (error, event) => {
        this.emit(NEW_BLOCK_EVENT, event)
      })
    ACTIVE_VAULT_MANAGERS.forEach(({ address, liquidationTrigger, col}) => {
      this.web3.eth.subscribe('logs', {
        address,
        topics: col ? JOIN_TOPICS_WITH_COL : JOIN_TOPICS
      }, (error, log ) =>{
        if (!error) {
          this.checkAndPersistPosition(log.topics, log.data, liquidationTrigger)
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
            this.checkClosedPosition(positionKey(log.topics))
        }
      })
    });
    LIQUIDATIONS_TRIGGERS.forEach((address) => {
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

  private parseJoinData(topics, data): [boolean, string, bigint] {
    const withCol = topics[0] === JOIN_TOPICS_WITH_COL[0]
    const id = positionKey(topics)
    const exist: CDP = this.positions.get(id)
    const USDP = BigInt('0x' + data.substring(2 + (withCol ? 2 : 1) * 64, (withCol ? 3 : 2) * 64))
    const shouldPersist = !exist && USDP > BigInt(0)
    return [shouldPersist, id, USDP]
  }

  private checkAndPersistPosition(topics, data, liquidationTrigger) {
    const [shouldPersist, id, USDP] = this.parseJoinData(topics, data);
    if (shouldPersist) {
      this.positions.set(id, { USDP, liquidationTrigger })
    }
  }

  async checkLiquidatable(header: BlockHeader) {
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
    const timeLabel = `estimating gas for ${keys.length} positions on block ${header.number} ${header.hash}`
    console.time(timeLabel)
    const gasData = (await Promise.all(promises.map(p => p.catch(() => null))))
    console.timeEnd(timeLabel)
    this.log(`.checkLiquidatable: there are ${gasData.filter(d => d).length} liquidatable positions`)
    gasData.forEach((gas, i) => {
      // during synchronization the node can respond with transaction to non-contract address
      // so check gas limit to prevent this behaviour
      if (gas && +gas > 30_000) {
        const tx = txConfigs[i]
        tx.gas = gas
        this.emit(TRIGGER_LIQUIDATION, tx)
      }
    })
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

  private async checkClosedPosition(key: string) {
    const debt = await this.web3.eth.call({
      to: VAULT_ADDRESS,
      data: GET_TOTAL_DEBT_SIGNATURE + key
    })
    if (BigInt(debt) === BigInt(0)) {
      this.positions.delete(key)
      this.log(`CDP ${key} has been closed`)
    }
    this.log(`CDP ${key} is still open`)
  }


  private log(...args) {
    this.logger.info(args)
  }
}

function positionKey(topics) {
  return topics[1].substr(2) + topics[2].substr(2);
}

export default SynchronizationService
