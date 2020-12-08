import { Log } from 'web3-core/types'
import { JoinExit } from '../types/JoinExit'

export function parseJoinExit(event: Log): JoinExit {
  const token = topicToAddr(event.topics[1])
  const user = topicToAddr(event.topics[2])
  event.data = event.data.substr(2)
  const main = hexToBN(event.data.substr(0, 64))
  const col = hexToBN(event.data.substr(64, 64))
  const usdp = hexToBN(event.data.substr(128))
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

export function topicToAddr(topic) {
  return '0x' + topic.substr(26)
}

export function hexToBN(str) {
  return BigInt('0x' + str)
}

export function numberWithCommas(x) {
  let y = x.toString()
  const dotIndex = y.indexOf('.')
  if (dotIndex !== -1) {
    let a = y.substr(0, y.indexOf('.'))
    let b = y.substr(y.indexOf('.'))
    return a.replace(/\B(?=(\d{3})+(?!\d))/g, ",") + b
  }
  return y.replace(/\B(?=(\d{3})+(?!\d))/g, ",");
}
