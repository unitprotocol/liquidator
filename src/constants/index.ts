import { web3 } from 'src/provider'
import config from 'src/config'

export const IS_DEV = process.env.IS_DEV

export const JOIN_TOPICS_WITH_COL = [web3.utils.sha3('Join(address,address,uint256,uint256,uint256)')]
export const JOIN_TOPICS = [web3.utils.sha3('Join(address,address,uint256,uint256)')]
export const LIQUIDATION_TRIGGERED_TOPICS = ["0x5b79a897d30813a62a1f95ba180d3320d3701d96605708b81105e00719a069e4"]
export const BUYOUT_TOPICS = [web3.utils.sha3("Buyout(address,address,address,uint256,uint256,uint256)")]
export const EXIT_TOPICS = [web3.utils.sha3('Exit(address,address,uint256,uint256)')]
export const EXIT_TOPICS_WITH_COL = [web3.utils.sha3('Exit(address,address,uint256,uint256,uint256)')]
export const GET_TOTAL_DEBT_SIGNATURE = web3.eth.abi.encodeFunctionSignature('getTotalDebt(address,address)')
export const TRIGGER_LIQUIDATION_SIGNATURE = web3.eth.abi.encodeFunctionSignature('triggerLiquidation(address,address)')

export const CHAIN_CONF = {
  1: {
    name: 'mainnet',
    explorerUrl: 'https://etherscan.io',
    liquidationUrl: 'https://liquidation.unit.xyz',
    chainId: 1,
    hashTagPrefix: '',
    mainSymbol: 'ETH'
  },
  56: {
    name: 'bsc',
    explorerUrl: 'https://bscscan.com',
    liquidationUrl: 'https://bsc.liquidation.unit.xyz',
    chainId: 56,
    hashTagPrefix: 'bsc_',
    mainSymbol: 'BSC'
  },
  250: {
    name: 'fantom',
    explorerUrl: 'https://ftmscan.com',
    liquidationUrl: 'https://ftm.liquidation.unit.xyz',
    chainId: 250,
    hashTagPrefix: 'ftm_',
    mainSymbol: 'FTM'
  }
}[+process.env.CHAIN_ID]

const conf = config[CHAIN_CONF.name]

export const VAULT_ADDRESS = conf.vault
export const VAULT_PARAMETERS_ADDRESS = conf.vault_parameters
export const VAULT_MANAGER_PARAMETERS_ADDRESS = conf.vault_manager_parameters
export const OLD_COL_MOCK = conf.old_col_mock
export const UNISWAP_FACTORY = conf.uniswap_factory
export const SUSHISWAP_FACTORY = conf.sushiswap_factory
export const WETH = conf.weth
export const ETH_USD_AGGREGATOR = conf.eth_usd_aggregator
export const CRV3_REPRESENTATIONS = conf.crv3_representations
export const CRV3 = conf.crv3
export const TRI_POOL = conf.tri_pool
export const CURVE_PROVIDER = conf.curve_provider
export const ORACLE_REGISTRY = conf.oracle_registry
export const SYNCHRONIZATION_BATCH_SIZE = conf.synchronization_batch_size
export const SYNCHRONIZATION_BATCH_LIMIT = Math.floor(250000 / SYNCHRONIZATION_BATCH_SIZE)

export const PRICE_EXCEPTION_LIST = [...CRV3_REPRESENTATIONS]

export const VAULT_MANAGERS: {
  address: string
  fromBlock: number
  liquidationTrigger: string
  toBlock?: number
  col?: boolean
}[] = conf.vault_managers

export const LIQUIDATION_TRIGGERS = conf.liquidation_triggers
export const NEW_VERSION_OF_LIQUIDATION_TRIGGER = conf.new_version_of_liquidation_trigger
export const AUCTIONS = conf.auctions
export const MAIN_LIQUIDATION_TRIGGER = conf.main_liquidation_trigger
export const FALLBACK_LIQUIDATION_TRIGGER = conf.fallback_liquidation_trigger

export function liquidationTriggerByVaultManagerAddress(vaultMangerAddress) {
  return VAULT_MANAGERS.find(m => m.address.toLowerCase() === vaultMangerAddress.toLowerCase()).liquidationTrigger
}

export const SYNCHRONIZER_TRIGGER_LIQUIDATION_EVENT = 'SYNCHRONIZER_TRIGGER_LIQUIDATION_EVENT'
export const SYNCHRONIZER_NEW_BLOCK_EVENT = 'SYNCHRONIZER_NEW_BLOCK_EVENT'
export const SYNCHRONIZER_JOIN_EVENT = 'SYNCHRONIZER_JOIN_EVENT'
export const SYNCHRONIZER_EXIT_EVENT = 'SYNCHRONIZER_EXIT_EVENT'
export const SYNCHRONIZER_SAVE_STATE_REQUEST = 'SYNCHRONIZER_SAVE_STATE_REQUEST'
export const SYNCHRONIZER_LIQUIDATION_TRIGGERED_EVENT = 'SYNCHRONIZER_LIQUIDATION_TRIGGERED_EVENT'
export const SYNCHRONIZER_LIQUIDATED_EVENT = 'SYNCHRONIZER_LIQUIDATED_EVENT'
export const CONFIRMATIONS_THRESHOLD = 3
export const LIQUIDATION_CHECK_TIMEOUT = Number(conf.liquidation_check_timeout)

export const EXPLORER_URL = CHAIN_CONF.explorerUrl
export const LIQUIDATION_URL = CHAIN_CONF.liquidationUrl

export const ZERO_ADDRESS = '0x' + '0'.repeat(40)

export let ACTIVE_VAULT_MANAGERS = [...VAULT_MANAGERS].filter(v => !v.toBlock)

export const APP_STATE_FILENAME = 'app.dat'
