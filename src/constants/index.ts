import web3 from 'src/provider'

export const JOIN_TOPICS_WITH_COL = [web3.utils.sha3('Join(address,address,uint256,uint256,uint256)')]
export const JOIN_TOPICS = [web3.utils.sha3('Join(address,address,uint256,uint256)')]
export const LIQUIDATION_TRIGGERED_TOPICS = ["0x5b79a897d30813a62a1f95ba180d3320d3701d96605708b81105e00719a069e4"]
export const LIQUIDATED_TOPICS = [web3.utils.sha3("Liquidated(address,address,uint256,uint256)")]
export const EXIT_TOPICS = [web3.utils.sha3('Exit(address,address,uint256,uint256)')]
export const EXIT_TOPICS_WITH_COL = [web3.utils.sha3('Exit(address,address,uint256,uint256,uint256)')]
export const DUCK_CREATION_TOPICS = ["0xddf252ad1be2c89b69c2b068fc378daa952ba7f163c4a11628f55a4df523b3ef", "0x0000000000000000000000000000000000000000000000000000000000000000"]
export const VAULT_ADDRESS = "0xb1cff81b9305166ff1efc49a129ad2afcd7bcf19"
export const GET_TOTAL_DEBT_SIGNATURE = web3.eth.abi.encodeFunctionSignature('getTotalDebt(address,address)')
export const TRIGGER_LIQUIDATION_SIGNATURE = web3.eth.abi.encodeFunctionSignature('triggerLiquidation(address,address)')
export const DUCK_ADDRESS = "0x92E187a03B6CD19CB6AF293ba17F2745Fd2357D5"
export const OLD_COL_MOCK = "0x6aade8a8a6b85921009d2caa25dc69348f4c009e"

export const VAULT_MANAGERS: {
  address: string
  fromBlock: number
  liquidationTrigger: string
  toBlock?: number
  col?: boolean
}[] = [
  {
    address: '0x7f50d78062304B6f523f20E9bACa8F3C72197424',
    liquidationTrigger: '0x989AC9c8353C3F01412705d7E50B4Ab9E804c227',
    fromBlock: 11316117,
    toBlock: 11351816,
    col: true,
  },
  {
    address: '0x78727A77028d9130D2772713d570780231E64ECf',
    liquidationTrigger: '0x989AC9c8353C3F01412705d7E50B4Ab9E804c227',
    fromBlock: 11354460,
    toBlock: 11378571,
    col: true,
  },
  {
    address: '0x754106b2f312c987Dd34161F8b4735392fa93F06',
    liquidationTrigger: '0x0ca1A59a987922375234df94919A456F61e93E1e',
    fromBlock: 11320948,
    toBlock: 	11329829,
    col: true,
  },
  {
    address: '0x211a6d4d4f49c0c5814451589d6378fda614adb9',
    liquidationTrigger: '0x989AC9c8353C3F01412705d7E50B4Ab9E804c227',
    fromBlock: 11373662,
    col: true,
  },
  {
    address: '0x3052764f1af2f8B7a887dEAfA42153530676079B',
    liquidationTrigger: '0x0ca1A59a987922375234df94919A456F61e93E1e',
    fromBlock: 11373663,
    col: true,
  },
  {
    address: '0x54ba276a62e7e3e76d362f672f00ed31a983067b',
    liquidationTrigger: '0x20c854cdd322d3a501da91374027b4b257de57dd',
    fromBlock: 11609549,
  },
  {
    address: '0xD90332DB0FE0e5eA1A195A5Ba6fc8949EaB8AB4E',
    liquidationTrigger: '0x78d09b58402c29016425497289e12fdd12f06027',
    fromBlock: 11610755,
  },
  {
    address: '0xB82c6D510B3a0Dc9f198dE0ad2a3839973c6783c',
    liquidationTrigger: '0xb088c78A8e2E454a6145bFBA37CA5de129688ff7',
    fromBlock: 11888275,
  },
]

export const LIQUIDATIONS_TRIGGERS = [
  '0x989AC9c8353C3F01412705d7E50B4Ab9E804c227',
  '0x0ca1A59a987922375234df94919A456F61e93E1e',
  '0x20c854cdd322d3a501da91374027b4b257de57dd',
  '0x78d09b58402c29016425497289e12fdd12f06027',
  '0xb088c78A8e2E454a6145bFBA37CA5de129688ff7',
]

export const AUCTIONS = [
  '0xa41a3625c02c60Ae932515E7F921ada1811aF6a5',
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
export const LIQUIDATION_CHECK_TIMEOUT = 10

const vaultManagerStandards = [
  {
    address: '0x56DD677842214CbB97Ad88dBAA58DD55e1b179Ea',
    liquidationTrigger: null,
    fromBlock: 11420394,
    col: true,
    toBlock: undefined,
  },
  {
    address: '0x2726ebDf958cC15f5adB01aAd22741329948fbDB',
    liquidationTrigger: null,
    fromBlock: 11316092,
    toBlock: 11486510,
    col: true,
  },
  {
    address: '0x3e7f1d12a7893ba8eb9478b779b648da2bd38ae6',
    liquidationTrigger: null,
    fromBlock: 12011186,
    toBlock: undefined,
  },
]

export let ACTIVE_VAULT_MANAGERS = [...VAULT_MANAGERS, ...vaultManagerStandards].filter(v => !v.toBlock)

export const APP_STATE_FILENAME = 'app.dat'
