import web3 from 'src/provider'

export const JOIN_TOPICS_WITH_COL = [web3.utils.sha3('Join(address,address,uint256,uint256,uint256)')]
export const JOIN_TOPICS = [web3.utils.sha3('Join(address,address,uint256,uint256)')]
export const LIQUIDATION_TRIGGERED_TOPICS = ["0x5b79a897d30813a62a1f95ba180d3320d3701d96605708b81105e00719a069e4"]
// export const LIQUIDATED_TOPICS = [web3.utils.sha3("Liquidated(address,address,uint256,uint256)")]
export const BUYOUT_TOPICS = [web3.utils.sha3("Buyout(address,address,address,uint256,uint256,uint256)")]
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
    liquidationTrigger: '0x0e13ab042ec5ab9fc6f43979406088b9028f66fa',
    fromBlock: 11316117,
    toBlock: 11351816,
    col: true,
  },
  {
    address: '0x78727A77028d9130D2772713d570780231E64ECf',
    liquidationTrigger: '0x0e13ab042ec5ab9fc6f43979406088b9028f66fa',
    fromBlock: 11354460,
    toBlock: 11378571,
    col: true,
  },
  {
    address: '0x754106b2f312c987Dd34161F8b4735392fa93F06',
    liquidationTrigger: '0x0e13ab042ec5ab9fc6f43979406088b9028f66fa',
    fromBlock: 11320948,
    toBlock: 	11329829,
    col: true,
  },
  {
    address: '0x3052764f1af2f8B7a887dEAfA42153530676079B',
    liquidationTrigger: '0x0e13ab042ec5ab9fc6f43979406088b9028f66fa',
    fromBlock: 11373663,
    toBlock: 12072495,
    col: true,
  },
  {
    address: '0x211a6d4d4f49c0c5814451589d6378fda614adb9',
    liquidationTrigger: '0x0e13ab042ec5ab9fc6f43979406088b9028f66fa',
    fromBlock: 11373662,
    toBlock: 12198630,
    col: true,
  },
  {
    address: '0x2637D65912660e527C998824b8933d1A1bD7daA3',
    liquidationTrigger: '0x0e13ab042ec5ab9fc6f43979406088b9028f66fa',
    fromBlock: 	12101566,
    toBlock: 12198630,
  },
  {
    address: '0x54ba276a62e7e3e76d362f672f00ed31a983067b',
    liquidationTrigger: '0x0e13ab042ec5ab9fc6f43979406088b9028f66fa',
    fromBlock: 11609549,
    toBlock: 12198630,
  },
  {
    address: '0xD90332DB0FE0e5eA1A195A5Ba6fc8949EaB8AB4E',
    liquidationTrigger: '0x0e13ab042ec5ab9fc6f43979406088b9028f66fa',
    fromBlock: 11610755,
    toBlock: 	12058830,
  },
  {
    address: '0x18A2381d318EE56D19316f4a7D39a2a7996e8390',
    liquidationTrigger: '0x0e13ab042ec5ab9fc6f43979406088b9028f66fa',
    fromBlock: 12101763,
    toBlock: 12198630,
  },
  {
    address: '0xB82c6D510B3a0Dc9f198dE0ad2a3839973c6783c',
    liquidationTrigger: '0x0e13ab042ec5ab9fc6f43979406088b9028f66fa',
    fromBlock: 11888275,
    toBlock: 12198630,
  },
  {
    address: '0x7a646c42b64d21E6b871EfD85f54d707aCe1f9D1',
    liquidationTrigger: '0x0e13ab042ec5ab9fc6f43979406088b9028f66fa',
    fromBlock: 12070783,
    toBlock: 12198630,
  },
  {
    address: '0x0e13ab042ec5ab9fc6f43979406088b9028f66fa',
    liquidationTrigger: '0x0e13ab042ec5ab9fc6f43979406088b9028f66fa',
    fromBlock: 12198630,
  },
  {
    address: '0xaD3617D11f4c1d30603551eA75e9Ace9CB386e15',
    liquidationTrigger: '0x0e13ab042ec5ab9fc6f43979406088b9028f66fa',
    fromBlock: 12258922,
  },
]

export const LIQUIDATION_TRIGGERS = [
  '0x0e13ab042eC5AB9Fc6F43979406088B9028F66fA',
  '0xad3617d11f4c1d30603551ea75e9ace9cb386e15',
]

export const NEW_VERSION_OF_LIQUIDATION_TRIGGER = {
  '0x78d09b58402c29016425497289e12fdd12f06027': '0x0e13ab042ec5ab9fc6f43979406088b9028f66fa',
  '0x0ca1a59a987922375234df94919a456f61e93e1e': '0x0e13ab042ec5ab9fc6f43979406088b9028f66fa',
  '0x989ac9c8353c3f01412705d7e50b4ab9e804c227': '0x0e13ab042ec5ab9fc6f43979406088b9028f66fa',
  '0xfeacfc01e122bb6b17dc4aef4f0e3be20fca888d': '0x0e13ab042ec5ab9fc6f43979406088b9028f66fa',
  '0x20c854cdd322d3a501da91374027b4b257de57dd': '0x0e13ab042ec5ab9fc6f43979406088b9028f66fa',
  '0x88f2ec209b58076db31e4221a737313941be2ef8': '0x0e13ab042ec5ab9fc6f43979406088b9028f66fa',
  '0xb088c78a8e2e454a6145bfba37ca5de129688ff7': '0x0e13ab042ec5ab9fc6f43979406088b9028f66fa',
  '0x97d940afe6cb90bea9e7562d8f3fdc1fc3e691f4': '0x0e13ab042ec5ab9fc6f43979406088b9028f66fa',
  '0xad3617d11f4c1d30603551ea75e9ace9cb386e15': '0x0e13ab042ec5ab9fc6f43979406088b9028f66fa',
}

export const AUCTIONS = [
  '0xaef1ed4c492bf4c57221be0706def67813d79955',
]

export function liquidationTriggerByVaultManagerAddress(vaultMangerAddress) {
  return VAULT_MANAGERS.find(m => m.address.toLowerCase() === vaultMangerAddress.toLowerCase()).liquidationTrigger
}

export const SYNCHRONIZER_TRIGGER_LIQUIDATION_EVENT = 'SYNCHRONIZER_TRIGGER_LIQUIDATION_EVENT'
export const SYNCHRONIZER_NEW_BLOCK_EVENT = 'SYNCHRONIZER_NEW_BLOCK_EVENT'
export const SYNCHRONIZER_JOIN_EVENT = 'SYNCHRONIZER_JOIN_EVENT'
export const SYNCHRONIZER_EXIT_EVENT = 'SYNCHRONIZER_EXIT_EVENT'
export const LIQUIDATOR_LIQUIDATION_TX_SENT = 'LIQUIDATOR_LIQUIDATION_TX_SENT'
export const SYNCHRONIZER_SAVE_STATE_REQUEST = 'SYNCHRONIZER_SAVE_STATE_REQUEST'
export const SYNCHRONIZER_LIQUIDATION_TRIGGERED_EVENT = 'SYNCHRONIZER_LIQUIDATION_TRIGGERED_EVENT'
export const SYNCHRONIZER_LIQUIDATED_EVENT = 'SYNCHRONIZER_LIQUIDATED_EVENT'
export const SYNCHRONIZER_DUCK_CREATION_EVENT = 'SYNCHRONIZER_DUCK_CREATION_EVENT'
export const CONFIRMATIONS_THRESHOLD = 3
export const LIQUIDATION_CHECK_TIMEOUT = 10

const vaultManagerStandards = [
  {
    address: '0x56DD677842214CbB97Ad88dBAA58DD55e1b179Ea',
    liquidationTrigger: null,
    fromBlock: 11420394,
    col: true,
    toBlock: 12011695,
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
    toBlock: 12205690,
  },
]

export const UNISWAP_FACTORY = '0x5C69bEe701ef814a2B6a3EDD4B1652CB9cc5aA6f'
export const SUSHISWAP_FACTORY = '0xC0AEe478e3658e2610c5F7A4A2E1777cE9e4f2Ac'
export const WETH = '0xc02aaa39b223fe8d0a0e5c4f27ead9083c756cc2'
export const ZERO_ADDRESS = '0x' + '0'.repeat(40)
export const ETH_USD_AGGREGATOR = '0x5f4eC3Df9cbd43714FE2740f5E3616155c5b8419'

export const ORACLE_REGISTRY = '0x75fBFe26B21fd3EA008af0C764949f8214150C8f'

export let ACTIVE_VAULT_MANAGERS = [...VAULT_MANAGERS, ...vaultManagerStandards].filter(v => !v.toBlock)

export const APP_STATE_FILENAME = 'app.dat'
