import web3 from '../provider'

export const JOIN_TOPICS = ["0x330a0c3830f9c19654cc3b5701caa3230ec175384311f49b6a927dcc4b32ef4a"]
export const EXIT_TOPICS = ["0x57c3a18962ef5229db59708e9fa0ec7925bf2f15049b6f591b6364d0f0d2aca5"]
export const VAULT_ADDRESS = "0xb1cff81b9305166ff1efc49a129ad2afcd7bcf19"
export const GET_TOTAL_DEBT_SIGNATURE = web3.eth.abi.encodeFunctionSignature('getTotalDebt(address,address)')
export const TRIGGER_LIQUIDATION_SIGNATURE = web3.eth.abi.encodeFunctionSignature('triggerLiquidation(address,address)')

export const VAULT_MANAGERS: {
  address: string
  fromBlock: number
  liquidationTrigger: string
  toBlock?: number
}[] = [
  {
    address: '0x7f50d78062304B6f523f20E9bACa8F3C72197424',
    liquidationTrigger: '0x989AC9c8353C3F01412705d7E50B4Ab9E804c227',
    fromBlock: 11316117,
    toBlock: 11351816,
  },
  {
    address: '0x78727A77028d9130D2772713d570780231E64ECf',
    liquidationTrigger: '0x989AC9c8353C3F01412705d7E50B4Ab9E804c227',
    fromBlock: 11354460,
    toBlock: 11378571,
  },
  {
    address: '0x754106b2f312c987Dd34161F8b4735392fa93F06',
    liquidationTrigger: '0x0ca1A59a987922375234df94919A456F61e93E1e',
    fromBlock: 11320948,
    toBlock: 	11329829,
  },
  {
    address: '0x211a6d4d4f49c0c5814451589d6378fda614adb9',
    liquidationTrigger: '0x989AC9c8353C3F01412705d7E50B4Ab9E804c227',
    fromBlock: 11373662,
  },
  {
    address: '0x3052764f1af2f8B7a887dEAfA42153530676079B',
    liquidationTrigger: '0x0ca1A59a987922375234df94919A456F61e93E1e',
    fromBlock: 11373663,
  },
]

export function liquidationTriggerByVaultManagerAddress(vaultMangerAddress) {
  return VAULT_MANAGERS.find(m => m.address.toLowerCase() === vaultMangerAddress.toLowerCase()).liquidationTrigger
}

export const TRIGGER_LIQUIDATION_EVENT = 'triggerLiquidation'
export const NEW_BLOCK_EVENT = 'newBlock'
export const JOIN_EVENT = 'join'
export const EXIT_EVENT = 'exit'
export const LIQUIDATION_TRIGGERED_EVENT = 'liquidationTriggered'

const vaultManagerStandards = [
  {
    address: '0x56DD677842214CbB97Ad88dBAA58DD55e1b179Ea',
    liquidationTrigger: null,
    fromBlock: 11420394,
  },
  {
    address: '0x2726ebDf958cC15f5adB01aAd22741329948fbDB',
    liquidationTrigger: null,
    fromBlock: 11316092,
  },
]

export let ACTIVE_VAULT_MANAGERS = [...VAULT_MANAGERS.filter(v => !v.toBlock), ...vaultManagerStandards]
