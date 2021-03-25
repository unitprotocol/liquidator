import { Log } from 'web3-core/types'
import { JoinExit } from 'src/types/JoinExit'
import { Transfer } from 'src/types/Transfer'
import { LiquidationTrigger } from 'src/types/LiquidationTrigger'
import { EXIT_TOPICS_WITH_COL, JOIN_TOPICS_WITH_COL } from 'src/constants'
import { Liquidated } from 'src/types/Liquidated'

export function parseJoinExit(event: Log): JoinExit {
  const withCol = event.topics[0] === JOIN_TOPICS_WITH_COL[0] || event.topics[0] === EXIT_TOPICS_WITH_COL[0]
  const token = topicToAddr(event.topics[1])
  const user = topicToAddr(event.topics[2])
  event.data = event.data.substr(2)
  const main = hexToBN(event.data.substr(0, 64))
  let col, usdp
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
  }
}

export function parseLiquidated(event: Log): Liquidated {
  const token = topicToAddr(event.topics[1])
  const user = topicToAddr(event.topics[2])
  event.data = event.data.substr(2)
  const amount = hexToBN(event.data.substr(0, 64))
  const price = hexToBN(event.data.substr(64, 64))
  const penalty = hexToBN(event.data.substr(128, 64))
  const txHash = event.transactionHash
  return {
    token,
    owner: user,
    penalty,
    amount,
    price,
    txHash,
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

  const y = x.toString()
  const dotIndex = y.indexOf('.')
  if (dotIndex !== -1) {
    const a = y.substr(0, y.indexOf('.'))
    const b = y.substr(y.indexOf('.'))
    return a.replace(/\B(?=(\d{3})+(?!\d))/g, ",") + b
  }
  return y.replace(/\B(?=(\d{3})+(?!\d))/g, ",");
}
