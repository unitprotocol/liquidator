import { EventEmitter } from 'events';
import Web3 from 'web3'
import { CDP } from '../../types/Position'
import {
  ACTIVE_VAULT_MANAGERS,
  GET_TOTAL_DEBT_SIGNATURE, JOIN_EVENT, liquidationTriggerByVaultManagerAddress, NEW_BLOCK_EVENT,
  JOIN_TOPICS, TRIGGER_LIQUIDATION_EVENT, TRIGGER_LIQUIDATION_SIGNATURE,
  VAULT_ADDRESS,
  VAULT_MANAGERS, EXIT_TOPICS, EXIT_EVENT,
} from '../../constants'
import Logger from '../../logger'
import { TxConfig } from '../../types/TxConfig'
import { parseJoinExit } from '../../utils'

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
    VAULT_MANAGERS.forEach(({address, fromBlock, toBlock}) => {
      promises.push(this.web3.eth.getPastLogs({
        fromBlock,
        toBlock,
        address,
        topics: JOIN_TOPICS
      }))
    })
    const logsArray = await Promise.all(promises);
    const logs = logsArray.reduce((acc, curr) => [...acc, ...curr], []);
    logs.forEach(({ topics, data, address }) => {
      this.checkAndPersistPosition(topics, data, liquidationTriggerByVaultManagerAddress(address))
    });

    promises.length = 0
    const keys = []
    this.positions.forEach((_, k) => {
      promises.push(this.web3.eth.call({
        to: VAULT_ADDRESS,
        data: GET_TOTAL_DEBT_SIGNATURE + k
      }))
      keys.push(k)
    })
    this.log('total positions', this.positions.size)
    const usdpForPositions = await Promise.all(promises);
    usdpForPositions.forEach((v, i) => {
      if (BigInt(v) === BigInt(0)) {
        this.positions.delete(keys[i])
      }
    })
    this.log('open positions', this.positions.size)
    this.emit('ready', this);
    this.trackEvents();
  }

  private trackEvents() {
    this.web3.eth.subscribe("newBlockHeaders", (error, event) => {
        this.emit(NEW_BLOCK_EVENT, event.number)
      })
    ACTIVE_VAULT_MANAGERS.forEach(({ address, liquidationTrigger}) => {
      this.web3.eth.subscribe('logs', {
        address,
        topics: JOIN_TOPICS
      }, (error, log ) =>{
        if (!error) {
          this.checkAndPersistPosition(log.topics, log.data, liquidationTrigger)
          this.emit(JOIN_EVENT, parseJoinExit(log))
        }
      })
      this.web3.eth.subscribe('logs', {
        address,
        topics: EXIT_TOPICS
      }, (error, log ) =>{
        if (!error) {
          this.emit(EXIT_EVENT, parseJoinExit(log))
        }
      })
    });
  }

  private parseLog(topics, data): [boolean, string, bigint] {
    const id = positionKey(topics)
    const exist: CDP = this.positions.get(id)
    const USDP = BigInt('0x' + data.substring(2 + 2 * 64, 3 * 64))
    return [!exist && USDP > BigInt(0), id, USDP]
  }

  private checkAndPersistPosition(topics, data, liquidationTrigger) {
    const [shouldPersist, id, USDP] = this.parseLog(topics, data);
    if (shouldPersist) {
      this.positions.set(id, { USDP, liquidationTrigger })
    }
  }

  async checkLiquidatable(blockNumber) {
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
    const timeLabel = `estimating gas for ${keys.length} positions on block ${blockNumber}`
    console.time(timeLabel)
    const gasData = (await Promise.all(promises.map(p => p.catch(() => null))))
    console.timeEnd(timeLabel)
    this.log(`.checkLiquidatable: there are ${gasData.filter(d => d).length} liquidatable positions`)
    gasData.forEach((gas, i) => {
      if (gas) {
        const tx = txConfigs[i]
        tx.gas = gas
        this.emit(TRIGGER_LIQUIDATION_EVENT, tx)
      }
    })
  }


  private log(...args) {
    this.logger.info(args)
  }
}

function positionKey(topics) {
  return topics[1].substr(2) + topics[2].substr(2);
}

export default SynchronizationService
