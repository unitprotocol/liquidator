import { web3 } from 'src/provider'
import config from 'src/config'

export const IS_DEV = process.env.IS_DEV

export const JOIN_TOPICS_WITH_COL = [web3.utils.sha3('Join(address,address,uint256,uint256,uint256)')]
export const JOIN_TOPICS = [web3.utils.sha3('Join(address,address,uint256,uint256)')]
export const LIQUIDATION_TRIGGERED_TOPICS = ["0x5b79a897d30813a62a1f95ba180d3320d3701d96605708b81105e00719a069e4"]
export const BUYOUT_TOPICS = [web3.utils.sha3("Buyout(address,address,address,uint256,uint256,uint256)")]
export const EXIT_TOPICS = [web3.utils.sha3('Exit(address,address,uint256,uint256)')]
export const EXIT_TOPICS_WITH_COL = [web3.utils.sha3('Exit(address,address,uint256,uint256,uint256)')]

if (!(['mainnet', 'bsc', 'fantom'].includes(process.env.CHAIN_NAME)))
  throw new Error(`Unsupported chain name: ${process.env.CHAIN_NAME}`)

const conf = config[process.env.CHAIN_NAME]

export const CHAIN_ID = Number(conf.chain_id)
export const MAIN_SYMBOL = conf.main_symbol
export const HASHTAG_PREFIX = conf.hash_tag_prefix
export const CDP_REGISTRY = conf.cdp_registry
export const VAULT_ADDRESS = conf.vault
export const VAULT_PARAMETERS_ADDRESS = conf.vault_parameters
export const VAULT_MANAGER_PARAMETERS_ADDRESS = conf.vault_manager_parameters
export const UNISWAP_FACTORY = conf.uniswap_factory
export const SUSHISWAP_FACTORY = conf.sushiswap_factory
export const WETH = conf.weth
export const ETH_USD_AGGREGATOR = conf.eth_usd_aggregator
export const CRV3_REPRESENTATIONS = conf.crv3_representations
export const CRV3 = conf.crv3
export const CURVE_PROVIDER = conf.curve_provider
export const ORACLE_REGISTRY = conf.oracle_registry

export const PRICE_EXCEPTION_LIST = [...CRV3_REPRESENTATIONS]
export const AUCTIONS = conf.auctions
export const MAIN_LIQUIDATION_TRIGGER = conf.main_liquidation_trigger
export const FALLBACK_LIQUIDATION_TRIGGER = conf.fallback_liquidation_trigger

export const SYNCHRONIZER_TRIGGER_LIQUIDATION_EVENT = 'SYNCHRONIZER_TRIGGER_LIQUIDATION_EVENT'
export const SYNCHRONIZER_NEW_BLOCK_EVENT = 'SYNCHRONIZER_NEW_BLOCK_EVENT'
export const SYNCHRONIZER_JOIN_EVENT = 'SYNCHRONIZER_JOIN_EVENT'
export const SYNCHRONIZER_EXIT_EVENT = 'SYNCHRONIZER_EXIT_EVENT'
export const SYNCHRONIZER_SAVE_STATE_REQUEST = 'SYNCHRONIZER_SAVE_STATE_REQUEST'
export const SYNCHRONIZER_LIQUIDATION_TRIGGERED_EVENT = 'SYNCHRONIZER_LIQUIDATION_TRIGGERED_EVENT'
export const SYNCHRONIZER_LIQUIDATED_EVENT = 'SYNCHRONIZER_LIQUIDATED_EVENT'
export const CONFIRMATIONS_THRESHOLD = Number(conf.liquidation_confirmations_threshold)
export const LIQUIDATION_CHECK_TIMEOUT = Number(conf.liquidation_check_timeout)

export const EXPLORER_URL = conf.explorer_url
export const LIQUIDATION_URL = conf.liquidation_url

export const ZERO_ADDRESS = '0x' + '0'.repeat(40)

export let ACTIVE_VAULT_MANAGERS = conf.vault_managers

export const APP_STATE_FILENAME = 'app.dat'
