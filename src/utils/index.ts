import { Log } from 'web3-core/types'
import { JoinExit } from 'src/types/JoinExit'
import { Transfer } from 'src/types/Transfer'
import { LiquidationTrigger } from 'src/types/LiquidationTrigger'
import {
  CRV3_REPRESENTATIONS,
  ETH_USD_AGGREGATOR,
  EXIT_TOPICS_WITH_COL,
  JOIN_TOPICS_WITH_COL,
  ORACLE_REGISTRY,
  PRICE_EXCEPTION_LIST,
  SUSHISWAP_FACTORY,
  TRI_POOL,
  UNISWAP_FACTORY,
  VAULT_ADDRESS,
  VAULT_MANAGER_PARAMETERS_ADDRESS,
  VAULT_PARAMETERS_ADDRESS,
  WETH,
  ZERO_ADDRESS,
} from 'src/constants'
import { Buyout } from 'src/types/Buyout'
import { web3 } from 'src/provider'
import { getMerkleProof, lookbackBlocks, ORACLE_TYPES, sushiLPAddress, uniLPAddress } from 'src/utils/oracle'

export function parseJoinExit(event: Log): JoinExit {
  const withCol = event.topics[0] === JOIN_TOPICS_WITH_COL[0] || event.topics[0] === EXIT_TOPICS_WITH_COL[0]
  const token = topicToAddr(event.topics[1])
  const user = topicToAddr(event.topics[2])
  event.data = event.data.substr(2)
  const main = hexToBN(event.data.substr(0, 64))
  let col: bigint, usdp: bigint
  if (withCol) {
    col = hexToBN(event.data.substr(64, 64))
    usdp = hexToBN(event.data.substr(128, 64))
  } else {
    col = BigInt(0)
    usdp = hexToBN(event.data.substr(64, 64))
  }
  const txHash = event.transactionHash
  return {
    token,
    user,
    main,
    col,
    usdp,
    txHash,
    blockHash: event.blockHash,
    blockNumber: event.blockNumber,
    logIndex: event.logIndex,
    txIndex: event.transactionIndex,
  }
}

export function parseLiquidationTrigger(event: Log): LiquidationTrigger {
  const token = topicToAddr(event.topics[1])
  const user = topicToAddr(event.topics[2])
  const txHash = event.transactionHash
  return {
    token,
    user,
    txHash,
    logIndex: event.logIndex,
    blockNumber: event.blockNumber,
    txIndex: event.transactionIndex,
    blockHash: event.blockHash,
  }
}

export function parseBuyout(event: Log): Buyout {
  const token = topicToAddr(event.topics[1])
  const owner = topicToAddr(event.topics[2])
  const liquidator = topicToAddr(event.topics[3])
  event.data = event.data.substr(2)
  const amount = hexToBN(event.data.substr(0, 64))
  const price = hexToBN(event.data.substr(64, 64))
  const penalty = hexToBN(event.data.substr(128, 64))
  const txHash = event.transactionHash
  return {
    token,
    owner,
    liquidator,
    amount,
    price,
    penalty,
    txHash,
    logIndex: event.logIndex,
    blockNumber: event.blockNumber,
    txIndex: event.transactionIndex,
    blockHash: event.blockHash,
  }
}

export function parseTransfer(event: Log): Transfer {
  const to = topicToAddr(event.topics[2])
  event.data = event.data.substr(2)
  const amount = hexToBN(event.data.substr(0, 64))
  const txHash = event.transactionHash
  return {
    to,
    amount,
    txHash,
    logIndex: event.logIndex,
    blockNumber: event.blockNumber,
    txIndex: event.transactionIndex,
    blockHash: event.blockHash,
  }
}

export function topicToAddr(topic) {
  return '0x' + topic.substr(26)
}

export function hexToBN(str) {
  return BigInt('0x' + str)
}

export function formatNumber(x: number) {
  if (x >= 1_000_000) {
    return `${Math.floor(x / 10_000) / 100}M`
  }
  if (x >= 1_000) {
    return `${Math.floor(x / 10) / 100}K`
  }
  if (x >= 1) {
    return `${Math.floor(x * 100) / 100}`
  }

  if (x < 0.0001) {
    return x.toString()
  }

  return `${Math.floor(x * 10_000) / 10_000}`
}

export async function getTokenDecimals(token: string) : Promise<number> {
  const decimalsSignature = web3.eth.abi.encodeFunctionSignature({
    name: 'decimals',
    type: 'function',
    inputs: []
  })

  try {
    return Number(web3.eth.abi.decodeParameter('uint8', await web3.eth.call({
      to: token,
      data: decimalsSignature
    })))
  } catch (e) {
    return 18
  }
}

export async function tryFetchPrice(token: string, amount: bigint, decimals: number) : Promise<string> {

  const oracleType = await getOracleType(token)

  if (PRICE_EXCEPTION_LIST.includes(token.toLowerCase()) || oracleType === 15) {
    return tryFetchNonStandardAssetPrice(token, amount, decimals, oracleType)
  }

  const latestAnswerSignature = web3.eth.abi.encodeFunctionSignature({
    name: 'latestAnswer',
    type: 'function',
    inputs: []
  })

  if (token.toLowerCase() === WETH.toLowerCase()) {
    const latestAnswer = BigInt(web3.eth.abi.decodeParameter('int256', await web3.eth.call({
      to: ETH_USD_AGGREGATOR,
      data: latestAnswerSignature
    })))

    return '$' + formatNumber(Number(amount * latestAnswer / BigInt(1e6) / BigInt(10 ** decimals)) / 100)
  }

  const symbol = await _getTokenSymbol(token)
  const balanceOfSignature = (address) => web3.eth.abi.encodeFunctionCall({
    name: 'balanceOf',
    type: 'function',
    inputs: [{
      type: 'address',
      name: 'who'
    }]
  }, [address])

  const totalSupplySignature = web3.eth.abi.encodeFunctionSignature({
    name: 'totalSupply',
    type: 'function',
    inputs: []
  })

  try {
    if (['UNI-V2', 'SLP'].includes(symbol)) {

      const wethBalance = BigInt(web3.eth.abi.decodeParameter('uint', await web3.eth.call({
        to: WETH,
        data: balanceOfSignature(token)
      })))

      const supply = BigInt(web3.eth.abi.decodeParameter('uint', await web3.eth.call({
        to: token,
        data: totalSupplySignature
      })))

      const latestAnswer = BigInt(web3.eth.abi.decodeParameter('int256', await web3.eth.call({
        to: ETH_USD_AGGREGATOR,
        data: latestAnswerSignature
      })))

      return '$' + formatNumber(Number(amount * latestAnswer * wethBalance * BigInt(2) / supply / BigInt(1e6) / BigInt(10 ** decimals)) / 100)
    }

    const getPairSignature = web3.eth.abi.encodeFunctionCall({
      name: 'getPair',
      type: 'function',
      inputs: [{
        type: 'address',
        name: 'token0'
      }, {
        type: 'address',
        name: 'token1'
      }]
    }, [token, WETH])

    const uniPool = UNISWAP_FACTORY ? web3.eth.abi.decodeParameter('address', await web3.eth.call({
      to: UNISWAP_FACTORY,
      data: getPairSignature
    })) as string : ZERO_ADDRESS

    const sushiPool = web3.eth.abi.decodeParameter('address', await web3.eth.call({
      to: SUSHISWAP_FACTORY,
      data: getPairSignature
    })) as string

    if (sushiPool === ZERO_ADDRESS && uniPool === ZERO_ADDRESS) {
      return 'unknown price'
    }

    const uniWethBalance = BigInt(web3.eth.abi.decodeParameter('uint', await web3.eth.call({
      to: WETH,
      data: balanceOfSignature(uniPool)
    })))

    const sushiWethBalance = BigInt(web3.eth.abi.decodeParameter('uint', await web3.eth.call({
      to: WETH,
      data: balanceOfSignature(sushiPool)
    })))

    const quotingPool = uniWethBalance > sushiWethBalance ? uniPool : sushiPool

    const tokenAmountInLP = BigInt(web3.eth.abi.decodeParameter('uint', await web3.eth.call({
      to: token,
      data: balanceOfSignature(quotingPool)
    })))

    const latestAnswer = BigInt(web3.eth.abi.decodeParameter('int256', await web3.eth.call({
      to: ETH_USD_AGGREGATOR,
      data: latestAnswerSignature
    })))

    return '$' + formatNumber(Number(amount * (latestAnswer * (uniWethBalance > sushiWethBalance ? uniWethBalance : sushiWethBalance) / tokenAmountInLP) / BigInt(1e6) / BigInt(10 ** (18 - decimals)) / BigInt(10 ** decimals)) / 100)

  } catch (e) {
    return 'unknown price'
  }
}

export async function tryFetchNonStandardAssetPrice(token: string, amount: bigint, decimals: number, oracleType: number) : Promise<string> {
  if (oracleType === 15) {
    return fetchYearnAssetPrice(token, amount, decimals)
  }
  if (CRV3_REPRESENTATIONS.includes(token.toLowerCase())) {
    return fetch3crvPrice(amount)
  }
  throw new Error(`Unknown non standard asset: ${token}`)
}

export async function fetch3crvPrice(amount: bigint) : Promise<string> {
  const virtualPriceSig = web3.eth.abi.encodeFunctionSignature({
    name: 'get_virtual_price',
    type: 'function',
    inputs: []
  })

  try {
    const virtualPrice = BigInt(web3.eth.abi.decodeParameter('uint', await web3.eth.call({
      to: TRI_POOL,
      data: virtualPriceSig
    })))

    return '$' + formatNumber(Number(amount * virtualPrice / 10n ** 34n) / 100)
  } catch (e) {
    return 'unknown price'
  }
}

export async function fetchYearnAssetPrice(token: string, amount: bigint, decimals: number) : Promise<string> {
  const pricePerShareSig = web3.eth.abi.encodeFunctionSignature({
    name: 'pricePerShare',
    type: 'function',
    inputs: []
  })
  const tokenSig = web3.eth.abi.encodeFunctionSignature({
    name: 'token',
    type: 'function',
    inputs: []
  })

  try {
    const pricePerShare = BigInt(web3.eth.abi.decodeParameter('uint', await web3.eth.call({
      to: token,
      data: pricePerShareSig
    })))
    const underlyingToken = String(web3.eth.abi.decodeParameter('address', await web3.eth.call({
      to: token,
      data: tokenSig
    })))

    const underlyingAmount = amount * pricePerShare / BigInt(10 ** decimals)

    return tryFetchPrice(underlyingToken, underlyingAmount, decimals)
  } catch (e) {
    return 'unknown price'
  }
}

async function _getTokenSymbol(token: string) {
  const symbolSignature = web3.eth.abi.encodeFunctionSignature({
    name: 'symbol',
    type: 'function',
    inputs: []
  })

  try {
    const symbolRaw = await web3.eth.call({
      to: token,
      data: symbolSignature
    })
    return parseSymbol(symbolRaw)
  } catch (e) {
    return token
  }
}

export function encodeLiquidationTriggerWithProof(asset: string, owner: string, proof: [string, string, string, string]) {
  return web3.eth.abi.encodeFunctionCall({
      type: 'function',
      name: 'triggerLiquidation',
      inputs: [{
        type: 'address',
        name: 'asset',
      }, {
        type: 'address',
        name: 'owner',
      }, {
        type: 'tuple',
        name: 'proof',
        components: [{
          type: 'bytes',
          name: 'block',
        }, {
          type: 'bytes',
          name: 'accountProofNodesRlp',
        }, {
          type: 'bytes',
          name: 'reserveAndTimestampProofNodesRlp',
        }, {
          type: 'bytes',
          name: 'priceAccumulatorProofNodesRlp',
        }]
      }]
    },
    [asset, owner, proof]
  );
}

export async function getOracleType(token: string): Promise<number> {
  const oracleTypeByAssetSignature = web3.eth.abi.encodeFunctionCall({
    name: 'oracleTypeByAsset',
    type: 'function',
    inputs: [{
      type: 'address',
      name: 'asset'
    }]
  }, [token])

  try {
    const typeRaw = await web3.eth.call({
      to: ORACLE_REGISTRY,
      data: oracleTypeByAssetSignature
    })
    return Number(web3.eth.abi.decodeParameter('uint', typeRaw))
  } catch (e) {
    return 0
  }
}

export async function getLiquidationBlock(asset: string, owner): Promise<number> {
  const sig = web3.eth.abi.encodeFunctionCall({
    name: 'liquidationBlock',
    type: 'function',
    inputs: [{
      type: 'address',
      name: 'asset'
    }, {
      type: 'address',
      name: 'owner'
    }]
  }, [asset, owner])

  try {
    const raw = await web3.eth.call({
      to: VAULT_ADDRESS,
      data: sig
    })
    return Number(web3.eth.abi.decodeParameter('uint', raw))
  } catch (e) {
    return 0
  }
}

export async function isOracleTypeEnabled(type: number, token: string): Promise<boolean> {
  const oracleTypeByAssetSignature = web3.eth.abi.encodeFunctionCall({
    name: 'isOracleTypeEnabled',
    type: 'function',
    inputs: [{
      type: 'uint256',
      name: 'oracleType'
    }, {
      type: 'address',
      name: 'asset'
    }]
  }, [type.toString(), token])

  try {
    const raw = await web3.eth.call({
      to: VAULT_PARAMETERS_ADDRESS,
      data: oracleTypeByAssetSignature
    })
    return Boolean(web3.eth.abi.decodeParameter('bool', raw))
  } catch (e) {
    return false
  }
}

export async function getProof(token: string, oracleType: ORACLE_TYPES, blockNumber: number): Promise<[string, string, string,string]> {

  const proofBlockNumber = blockNumber - lookbackBlocks
  const denominationToken = BigInt(WETH)
  switch (oracleType) {
    case ORACLE_TYPES.KEYDONIX_LP:
      return getMerkleProof(BigInt(token), denominationToken, BigInt(proofBlockNumber))
    case ORACLE_TYPES.KEYDONIX_UNI:
      return getMerkleProof(BigInt(uniLPAddress(token, WETH)), denominationToken, BigInt(proofBlockNumber))
    case ORACLE_TYPES.KEYDONIX_SUSHI:
      return getMerkleProof(BigInt(sushiLPAddress(token, WETH)), denominationToken, BigInt(proofBlockNumber))
    default:
      throw new Error(`Incorrect keydonix oracle type: ${oracleType}`)
  }
}

export async function getKeydonixOracleTypes(): Promise<number[]> {
  const sig = web3.eth.abi.encodeFunctionCall({
    name: 'getKeydonixOracleTypes',
    type: 'function',
    inputs: []
  }, [])

  try {
    const raw = await web3.eth.call({
      to: ORACLE_REGISTRY,
      data: sig
    })
    return web3.eth.abi.decodeParameter('uint[]', raw).map(Number)
  } catch (e) {
    return []
  }
}

export async function getTotalDebt(asset: string, owner: string): Promise<bigint> {
  const sig = web3.eth.abi.encodeFunctionCall({
    name: 'getTotalDebt',
    type: 'function',
    inputs: [{
      type: 'address',
      name: 'asset'
    }, {
      type: 'address',
      name: 'owner'
    }]
  }, [asset, owner])

  try {
    const raw = await web3.eth.call({
      to: VAULT_ADDRESS,
      data: sig
    })
    return BigInt(web3.eth.abi.decodeParameter('uint', raw))
  } catch (e) {
    return 0n
  }
}

export async function getCollateralAmount(asset: string, owner: string): Promise<bigint> {
  const sig = web3.eth.abi.encodeFunctionCall({
    name: 'collaterals',
    type: 'function',
    inputs: [{
      type: 'address',
      name: 'asset'
    }, {
      type: 'address',
      name: 'owner'
    }]
  }, [asset, owner])

  try {
    const raw = await web3.eth.call({
      to: VAULT_ADDRESS,
      data: sig
    })
    return BigInt(web3.eth.abi.decodeParameter('uint', raw))
  } catch (e) {
    return 0n
  }
}

export async function getLiquidationRatio(asset: string): Promise<bigint> {
  const sig = web3.eth.abi.encodeFunctionCall({
    name: 'liquidationRatio',
    type: 'function',
    inputs: [{
      type: 'address',
      name: 'asset'
    }]
  }, [asset])

  try {
    const raw = await web3.eth.call({
      to: VAULT_MANAGER_PARAMETERS_ADDRESS,
      data: sig
    })
    return BigInt(web3.eth.abi.decodeParameter('uint', raw))
  } catch (e) {
    return 0n
  }
}

export async function getEthPriceInUsd(): Promise<bigint> {
  const sig = web3.eth.abi.encodeFunctionCall({
    name: 'latestRoundData',
    type: 'function',
    inputs: []
  }, [])

  try {
    const raw = await web3.eth.call({
      to: ETH_USD_AGGREGATOR,
      data: sig
    })
    const res = web3.eth.abi.decodeParameters(['uint80', 'int256', 'uint256', 'uint256', 'uint80'], raw)
    return BigInt(res[1])
  } catch (e) {
    return 0n
  }
}

export async function getReserves(pool: string): Promise<[bigint, bigint, bigint]> {
  const sig = web3.eth.abi.encodeFunctionCall({
    name: 'getReserves',
    type: 'function',
    inputs: []
  }, [])

  try {
    const raw = await web3.eth.call({
      to: pool,
      data: sig
    })
    const res = web3.eth.abi.decodeParameters(['uint112', 'uint112', 'uint32'], raw)
    return [res[0], res[1], res[2]].map(BigInt) as [bigint, bigint, bigint]
  } catch (e) {
    return [0n, 0n, 0n]
  }
}

export async function getToken0(pool: string): Promise<string> {
  const sig = web3.eth.abi.encodeFunctionCall({
    name: 'token0',
    type: 'function',
    inputs: []
  }, [])

  try {
    const raw = await web3.eth.call({
      to: pool,
      data: sig
    })
    return String(web3.eth.abi.decodeParameter('address', raw))

  } catch (e) {
    return '0x0000000000000000000000000000000000000000'
  }
}

export async function getToken1(pool: string): Promise<string> {
  const sig = web3.eth.abi.encodeFunctionCall({
    name: 'token1',
    type: 'function',
    inputs: []
  }, [])

  try {
    const raw = await web3.eth.call({
      to: pool,
      data: sig
    })
    return String(web3.eth.abi.decodeParameter('address', raw))

  } catch (e) {
    return '0x0000000000000000000000000000000000000000'
  }
}

export async function getSupply(token: string): Promise<bigint> {
  const sig = web3.eth.abi.encodeFunctionCall({
    name: 'totalSupply',
    type: 'function',
    inputs: []
  }, [])

  try {
    const raw = await web3.eth.call({
      to: token,
      data: sig
    })
    return BigInt(web3.eth.abi.decodeParameter('uint', raw))
  } catch (e) {
    return 0n
  }
}

export async function getTokenSymbol(token: string) {

  let symbol = await _getTokenSymbol(token)

  try {
    if (['UNI-V2', 'SLP'].includes(symbol)) {
      const token0 = web3.eth.abi.decodeParameter('address', await web3.eth.call({
        to: token,
        data: '0x0dfe1681'
      })) as string

      const token1 = web3.eth.abi.decodeParameter('address', await web3.eth.call({
        to: token,
        data: '0xd21220a7'
      })) as string

      const symbol0 = await _getTokenSymbol(token0)
      const symbol1 = await _getTokenSymbol(token1)

      symbol += ` ${symbol0}-${symbol1}`
    }
  } catch (e) { }

  return symbol

}

function parseSymbol(hex): string {
  try {
    return web3.eth.abi.decodeParameter('string', hex) as string
  } catch (e) {
    return web3.utils.toUtf8(hex)
  }
}

export async function getLiquidationFee(asset: string, owner: string): Promise<bigint> {
  const sig = web3.eth.abi.encodeFunctionCall({
    name: 'liquidationFee',
    type: 'function',
    inputs: [{
      type: 'address',
      name: 'asset'
    }, {
      type: 'address',
      name: 'owner'
    }]
  }, [asset, owner])

  try {
    const raw = await web3.eth.call({
      to: VAULT_ADDRESS,
      data: sig
    })
    return BigInt(web3.eth.abi.decodeParameter('uint', raw))
  } catch (e) {
    return 0n
  }
}
