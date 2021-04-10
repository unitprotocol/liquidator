import { Log } from 'web3-core/types'
import { JoinExit } from 'src/types/JoinExit'
import { Transfer } from 'src/types/Transfer'
import { LiquidationTrigger } from 'src/types/LiquidationTrigger'
import {
  ETH_USD_AGGREGATOR,
  EXIT_TOPICS_WITH_COL,
  JOIN_TOPICS_WITH_COL,
  ORACLE_REGISTRY,
  SUSHISWAP_FACTORY,
  UNISWAP_FACTORY,
  WETH,
  ZERO_ADDRESS,
} from 'src/constants'
import { Liquidated } from 'src/types/Liquidated'
import web3 from 'src/provider'

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
    txIndex: event.transactionIndex,
    blockHash: event.blockHash,
  }
}

export function parseLiquidated(event: Log): Liquidated {
  const token = topicToAddr(event.topics[1])
  const user = topicToAddr(event.topics[2])
  event.data = event.data.substr(2)
  const repayment = hexToBN(event.data.substr(0, 64))
  const penalty = hexToBN(event.data.substr(64, 64))
  const txHash = event.transactionHash
  return {
    token,
    owner: user,
    penalty,
    repayment,
    txHash,
    logIndex: event.logIndex,
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

  const y = x.toString()
  const dotIndex = y.indexOf('.')
  if (dotIndex !== -1) {
    const a = y.substr(0, y.indexOf('.'))
    const b = y.substr(y.indexOf('.'))
    return a.replace(/\B(?=(\d{3})+(?!\d))/g, ",") + b
  }
  return y.replace(/\B(?=(\d{3})+(?!\d))/g, ",");
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

    const uniPool = web3.eth.abi.decodeParameter('address', await web3.eth.call({
      to: UNISWAP_FACTORY,
      data: getPairSignature
    })) as string

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