import web3 from 'src/provider'

export const JOIN_TOPICS_WITH_COL = [web3.utils.sha3('Join(address,address,uint256,uint256,uint256)')]
export const JOIN_TOPICS = [web3.utils.sha3('Join(address,address,uint256,uint256)')]
export const LIQUIDATION_TRIGGERED_TOPICS = ["0x5b79a897d30813a62a1f95ba180d3320d3701d96605708b81105e00719a069e4"]
export const LIQUIDATED_TOPICS = [web3.utils.sha3("Buyout(address,address,address,uint256,uint256,uint256)")]
export const EXIT_TOPICS = [web3.utils.sha3('Exit(address,address,uint256,uint256)')]
export const EXIT_TOPICS_WITH_COL = [web3.utils.sha3('Exit(address,address,uint256,uint256,uint256)')]
export const VAULT_ADDRESS = "0xdacfeed000e12c356fb72ab5089e7dd80ff4dd93"
export const GET_TOTAL_DEBT_SIGNATURE = web3.eth.abi.encodeFunctionSignature('getTotalDebt(address,address)')
export const TRIGGER_LIQUIDATION_SIGNATURE = web3.eth.abi.encodeFunctionSignature('triggerLiquidation(address,address)')

export const VAULT_MANAGERS: {
  address: string
  fromBlock: number
  liquidationTrigger: string
  toBlock?: number
  col?: boolean
}[] = [
  {
    address: '0x7Cdefc60Aa5eF145f905b99C999d3ED2883f6d10',
    liquidationTrigger: '0xfAa71d14458a197DeC85a767B23dA27E33363b9b',
    fromBlock: 5_360_793,
    col: false,
  },
]

export const LIQUIDATIONS_TRIGGERS = [
  '0xfAa71d14458a197DeC85a767B23dA27E33363b9b',
]

export const AUCTIONS = [
  '0x754106b2f312c987Dd34161F8b4735392fa93F06',
]

export function liquidationTriggerByVaultManagerAddress(vaultMangerAddress) {
  return VAULT_MANAGERS.find(m => m.address.toLowerCase() === vaultMangerAddress.toLowerCase()).liquidationTrigger
}

export const TRIGGER_LIQUIDATION = 'triggerLiquidation'
export const NEW_BLOCK_EVENT = 'newBlock'
export const JOIN_EVENT = 'join'
export const EXIT_EVENT = 'exit'
export const LIQUIDATION_TRIGGER_TX = 'liquidationTriggerTx'
export const LIQUIDATION_TRIGGERED_EVENT = 'liquidationTriggered'
export const LIQUIDATED_EVENT = 'liquidated'
export const DUCK_CREATION_EVENT = 'duckMinted'
export const CONFIRMATIONS_THRESHOLD = 3
export const LIQUIDATION_CHECK_TIMEOUT = Number(process.env.LIQUIDATION_CHECK_TIMEOUT) || 100

const vaultManagerStandards = [
  {
    address: '0x7E920256041F77613885A018Fce194409A734bBe',
    liquidationTrigger: null,
    fromBlock: 5_311_493,
    toBlock: undefined,
    col: false,
  },
]

export let ACTIVE_VAULT_MANAGERS = [...VAULT_MANAGERS, ...vaultManagerStandards].filter(v => !v.toBlock)

export const APP_STATE_FILENAME = 'app.dat'
export const CHAIN_ID = 56
