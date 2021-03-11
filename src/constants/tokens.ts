import { CHAIN_ID } from 'src/constants/index'

const collaterals = {
  56: {
    '0x2170ed0880ac9a755fd29b2688956bd959f933f8': {
      symbol: 'ETH',
      defaultOracleType: 7,
      decimals: 18,
    },
    '0xbb4cdb9cbd36b01bd1cbaebf2de08d9173bc095c': {
      symbol: 'BNB',
      defaultOracleType: 7,
      decimals: 18,
    },
    '0x0e09fabb73bd3ade0a17ecc321fd13a19e81ce82': {
      symbol: 'CAKE',
      defaultOracleType: 7,
      decimals: 18,
    },
    '0xf8a0bf9cf54bb92f17374d9e9a321e6a111a51bd': {
      symbol: 'LINK',
      defaultOracleType: 7,
      decimals: 18,
    },
    '0x3ee2200efb3400fabb9aacf31297cbdd1d435d47': {
      symbol: 'ADA',
      defaultOracleType: 7,
      decimals: 18,
    },
    '0x0eb3a705fc54725037cc9e008bdede697f62f335': {
      symbol: 'ATOM',
      defaultOracleType: 7,
      decimals: 18,
    },
    '0xad6caeb32cd2c308980a548bd0bc5aa4306c6c18': {
      symbol: 'BAND',
      defaultOracleType: 7,
      decimals: 18,
    },
    '0x8ff795a6f4d97e7887c79bea79aba5cc76444adf': {
      symbol: 'BCH',
      defaultOracleType: 7,
      decimals: 18,
    },
    '0x67ee3cb086f8a16f34bee3ca72fad36f7db929e2': {
      symbol: 'DODO',
      defaultOracleType: 7,
      decimals: 18,
    },
    '0x7083609fce4d1d8dc0c979aab8c869ea2c873402': {
      symbol: 'DOT',
      defaultOracleType: 7,
      decimals: 18,
    },
    '0x56b6fb708fc5732dec1afc8d8556423a2edccbd6': {
      symbol: 'EOS',
      defaultOracleType: 7,
      decimals: 18,
    },
    '0x0d8ce2a99bb6e3b7db580ed848240e4a0f9ae153': {
      symbol: 'FIL',
      defaultOracleType: 7,
      decimals: 18,
    },
    '0x4338665cbb7b2485a8855a139b75d5e34ab0db94': {
      symbol: 'LTC',
      defaultOracleType: 7,
      decimals: 18,
    },
    '0x4b0f1812e5df2a09796481ff14017e6005508003': {
      symbol: 'TWT',
      defaultOracleType: 7,
      decimals: 18,
    },
    '0xbf5140a22578168fd562dccf235e5d43a02ce9b1': {
      symbol: 'UNI',
      defaultOracleType: 7,
      decimals: 18,
    },
    '0x1d2f0da169ceb9fc7b3144628db156f3f6c60dbe': {
      symbol: 'XRP',
      defaultOracleType: 7,
      decimals: 18,
    },
    '0x16939ef78684453bfdfb47825f8a5f714f12623a': {
      symbol: 'XTZ',
      defaultOracleType: 7,
      decimals: 18,
    },
    '0x88f1a5ae2a3bf98aeaf342d26b30a79438c9142e': {
      symbol: 'YFI',
      defaultOracleType: 7,
      decimals: 18,
    },
    '0x7f70642d88cf1c4a3a7abb072b53b929b653eda5': {
      symbol: 'YFII',
      defaultOracleType: 7,
      decimals: 18,
    },
    '0x55d398326f99059ff775485246999027b3197955': {
      symbol: 'BUSD-T',
      defaultOracleType: 7,
      decimals: 18,
    },
    '0xe9e7cea3dedca5984780bafc599bd69add087d56': {
      symbol: 'BUSD',
      defaultOracleType: 7,
      decimals: 18,
    },
  },
}

const toLowerCase = (address) => address.toLowerCase()

Object.keys(collaterals).forEach(chainId => {
  Object.keys(collaterals[chainId]).forEach(
    assetAddress => {
      if (collaterals[chainId][assetAddress].poolTokens) {
        collaterals[chainId][assetAddress].poolTokens = collaterals[chainId][assetAddress].poolTokens.map(toLowerCase)
      }
      const fixed = toLowerCase(assetAddress)
      const broken = assetAddress !== fixed
      if (!broken) return
      collaterals[chainId][fixed] = { ...collaterals[chainId][broken] }
      delete collaterals[chainId][broken]
    }
  )
})

export function tokenByAddress(address, chainId = CHAIN_ID) {
  return collaterals[chainId][toLowerCase(address)]
}
