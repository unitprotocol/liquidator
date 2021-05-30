import { web3, web3Proof } from 'src/provider'
import { Pair, Token } from '@uniswap/sdk'
import { getCreate2Address } from '@ethersproject/address'
import { keccak256, pack } from '@ethersproject/solidity'
import { WETH } from 'src/constants'
import {
  getCollateralAmount,
  getLiquidationRatio,
  getReserves,
  getSupply, getToken0, getToken1,
  getTotalDebt,
  isOracleTypeEnabled,
} from 'src/utils/index'

const Q112 = BigInt('0x10000000000000000000000000000')
export const lookbackBlocks = 119

const ethUsdDenominator = 10n ** 8n

export enum ORACLE_TYPES {
  KEYDONIX_UNI = 1,
  KEYDONIX_LP = 2,
  KEYDONIX_SUSHI = 13,
}

export function sqrt(value: bigint) {
  if (value < 0n) {
    throw new Error('square root of negative numbers is not supported')
  }

  if (value < 2n) {
    return value
  }

  function newtonIteration(n, x0) {
    // eslint-disable-next-line no-bitwise
    const x1 = (n / x0 + x0) >> 1n
    if (x0 === x1 || x0 === x1 - 1n) {
      return x0
    }
    return newtonIteration(n, x1)
  }

  return newtonIteration(value, 1n)
}

export async function _getProof(address: bigint, positions: readonly bigint[], block: bigint) {
  const encodedAddress = bigintToHexAddress(address)
  const encodedPositions = positions.map(bigintToHexQuantity)
  const encodedBlockTag = bigintToHexQuantity(block)

  const result: any = await web3Proof.eth.getProof(encodedAddress, encodedPositions, encodedBlockTag)
  const accountProof = result.accountProof.map(entry => {
    return stringToByteArray(entry)
  })

  const storageProof = result.storageProof.map(entry => {
    return {
      key: BigInt(entry.key),
      value: BigInt(entry.key),
      proof: entry.proof.map(proofEntry => {
        return stringToByteArray(proofEntry)
      }),
    }
  })
  return { accountProof, storageProof }
}

export async function isLiquidatable_Fallback(asset: string, owner: string, blockNumber: number, ethPriceUsd: bigint): Promise<[ORACLE_TYPES, boolean]> {

  const fallbackOracleType = await selectOracle(asset)
  if (!fallbackOracleType) {
    return [undefined, false]
  }

  const [lr, debt, collateralAmount, assetPrice_EthQ112] = await Promise.all([
    getLiquidationRatio(asset),
    getTotalDebt(asset, owner),
    getCollateralAmount(asset, owner),
    getKeydonixPrice_Eth_Q112(asset, fallbackOracleType, blockNumber),
  ])

  const collateralPrice = (collateralAmount * assetPrice_EthQ112 * ethPriceUsd) / ethUsdDenominator / Q112

  return [fallbackOracleType, collateralPrice * lr / 100n <= debt]
}

function bigintToHexAddress(value): string {
  if (typeof value === 'string') return value
  return `0x${value.toString(16).padStart(40, '0')}`
}

function bigintToHexQuantity(value: bigint): string {
  return `0x${value.toString(16)}`
}

function stringToByteArray(hex: string): Uint8Array {
  const match = /^(?:0x)?([a-fA-F0-9]*)$/.exec(hex)
  if (match === null)
    throw new Error(`Expected a hex string encoded byte array with an optional '0x' prefix but received ${hex}`)
  const normalized = match[1]
  if (normalized.length % 2) throw new Error(`Hex string encoded byte array must be an even number of charcaters long.`)
  const bytes: Array<number> = []
  for (let i = 0; i < normalized.length; i += 2) {
    const n = parseInt(`${normalized[i]}${normalized[i + 1]}`, 16)
    bytes.push(n)
  }
  return new Uint8Array(bytes)
}

export async function getMerkleProof(
  exchangeAddress: bigint,
  denominationToken: bigint,
  blockNumber: bigint,
): Promise<[string, string, string, string]> {
  const [token0Address, token1Address, block] = await Promise.all([
    getStorageAt(exchangeAddress, 6n, 'latest'),
    getStorageAt(exchangeAddress, 7n, 'latest'),
    getBlockByNumber(blockNumber),
  ])

  if (denominationToken !== token0Address && denominationToken !== token1Address)
    throw new Error(
      `Denomination token ${addressToString(
        denominationToken,
      )} is not one of the two tokens for the Uniswap exchange at ${addressToString(exchangeAddress)}`,
    )
  const priceAccumulatorSlot = denominationToken === token0Address ? 10n : 9n
  const proof = await _getProof(exchangeAddress, [8n, priceAccumulatorSlot], blockNumber)
  if (block === null) throw new Error(`Received null for block ${Number(blockNumber)}`)
  const blockRlp = rlpEncodeBlock(block)
  const accountProofNodesRlp = rlpEncode(proof.accountProof.map(rlpDecode))
  const reserveAndTimestampProofNodesRlp = rlpEncode(proof.storageProof[0].proof.map(rlpDecode))
  const priceAccumulatorProofNodesRlp = rlpEncode(proof.storageProof[1].proof.map(rlpDecode))

  return [
    `0x${bufferToHex(blockRlp)}`,
    `0x${bufferToHex(accountProofNodesRlp)}`,
    `0x${bufferToHex(reserveAndTimestampProofNodesRlp)}`,
    `0x${bufferToHex(priceAccumulatorProofNodesRlp)}`
  ]
}

async function getKeydonixPrice_Eth_Q112(assetAddress: string, oracleType: ORACLE_TYPES, blockNumber: number): Promise<bigint> {
  if (assetAddress === WETH)
    return BigInt('0x10000000000000000000000000000')

  if (oracleType !== ORACLE_TYPES.KEYDONIX_LP) {
    return _getKeydonixPrice(assetAddress, oracleType, blockNumber)
  }

  const [token0Addr, token1Addr] = await Promise.all([getToken0(assetAddress), getToken1(assetAddress)])
  const [reserve0, reserve1] = await getReserves(assetAddress)
  let tokenReserve: bigint
  let ethReserve: bigint
  let underlyingToken: string
  if (BigInt(token0Addr) === BigInt(WETH)) {
    underlyingToken = token1Addr
    tokenReserve = BigInt(reserve1)
    ethReserve = BigInt(reserve0)
  } else if (BigInt(token1Addr) === BigInt(WETH)) {
    underlyingToken = token0Addr
    tokenReserve = BigInt(reserve0)
    ethReserve = BigInt(reserve1)
  }
  const avgPriceInEth = await _getKeydonixPrice(underlyingToken, await selectOracle(underlyingToken), blockNumber)
  const currPriceInEth = (ethReserve * Q112) / tokenReserve
  let ethReserveCalc: bigint

  if (currPriceInEth < avgPriceInEth) {
    const toSqrt = ethReserve * (ethReserve * BigInt(9) + (tokenReserve * BigInt(3988000) * avgPriceInEth) / Q112)
    const ethReserveChange = (sqrt(toSqrt) - ethReserve * BigInt(1997)) / BigInt(2000)

    ethReserveCalc = ethReserve + ethReserveChange
  } else {
    const a = tokenReserve * avgPriceInEth
    const b = (a * BigInt(9)) / Q112
    const c = ethReserve * BigInt(3988000)
    const sqRoot = sqrt((a / Q112) * (b + c))
    const d = (a * BigInt(3)) / Q112
    ethReserveCalc = ethReserve - (ethReserve - (d + sqRoot) / BigInt(2000))
  }
  const lpSupply = await getSupply(assetAddress)
  return (ethReserveCalc * BigInt(2) * Q112) / lpSupply
}

export async function selectOracle(tokenAddr: string): Promise<ORACLE_TYPES> {
  const [uni, lp, sushi] = await Promise.all([
    isOracleTypeEnabled(ORACLE_TYPES.KEYDONIX_UNI, tokenAddr),
    isOracleTypeEnabled(ORACLE_TYPES.KEYDONIX_LP, tokenAddr),
    isOracleTypeEnabled(ORACLE_TYPES.KEYDONIX_SUSHI, tokenAddr),
  ])
  return uni ? ORACLE_TYPES.KEYDONIX_UNI : lp ? ORACLE_TYPES.KEYDONIX_LP : sushi ? ORACLE_TYPES.KEYDONIX_SUSHI : undefined
}

async function _getKeydonixPrice(assetAddress: string, oracleType: ORACLE_TYPES, blockNumber: number): Promise<bigint> {
  let uniswapPoolAddress
  if (oracleType === ORACLE_TYPES.KEYDONIX_UNI) {
    uniswapPoolAddress = BigInt(
      Pair.getAddress(
        new Token(1, web3.utils.toChecksumAddress(WETH), 18),
        new Token(1, web3.utils.toChecksumAddress(assetAddress), 18),
      ),
    )
  } else if (oracleType === ORACLE_TYPES.KEYDONIX_SUSHI) {
    uniswapPoolAddress = BigInt(
      getSushiSwapAddress(
        new Token(1, web3.utils.toChecksumAddress(WETH), 18),
        new Token(1, web3.utils.toChecksumAddress(assetAddress), 18),
      ),
    )
  } else {
    throw new Error(`Wrong oracle for asset ${assetAddress} ${oracleType}. KEYDONIX`)
  }

  const proofBlockNumber = blockNumber - lookbackBlocks

  return getPrice(uniswapPoolAddress, BigInt(WETH), BigInt(proofBlockNumber), BigInt(blockNumber))
}

function bufferToHex(buffer: Uint8Array) {
  return [...new Uint8Array(buffer)].map(b => b.toString(16).padStart(2, '0')).join('')
}

function addressToString(value: bigint) {
  return `0x${value.toString(16).padStart(40, '0')}`
}

function rlpEncodeBlock(block) {
  return rlpEncode([
    unsignedIntegerToUint8Array(block.parentHash, 32),
    unsignedIntegerToUint8Array(block.sha3Uncles, 32),
    unsignedIntegerToUint8Array(block.miner, 20),
    unsignedIntegerToUint8Array(block.stateRoot, 32),
    unsignedIntegerToUint8Array(block.transactionsRoot, 32),
    unsignedIntegerToUint8Array(block.receiptsRoot, 32),
    unsignedIntegerToUint8Array(block.logsBloom, 256),
    stripLeadingZeros(unsignedIntegerToUint8Array(block.difficulty, 32)),
    stripLeadingZeros(unsignedIntegerToUint8Array(block.number, 32)),
    stripLeadingZeros(unsignedIntegerToUint8Array(block.gasLimit, 32)),
    stripLeadingZeros(unsignedIntegerToUint8Array(block.gasUsed, 32)),
    stripLeadingZeros(unsignedIntegerToUint8Array(block.timestamp, 32)),
    stripLeadingZeros(block.extraData),
    ...(block.mixHash !== undefined ? [unsignedIntegerToUint8Array(block.mixHash, 32)] : []),
    ...(block.nonce !== null && block.nonce !== undefined ? [unsignedIntegerToUint8Array(block.nonce, 8)] : []),
  ])
}

function rlpEncode(item): Uint8Array {
  if (item instanceof Uint8Array) {
    return rlpEncodeItem(item)
  }
  if (Array.isArray(item)) {
    return rlpEncodeList(item)
  }
  throw new Error(
    `Can only RLP encode Uint8Arrays (items) and arrays (lists).  Please encode your item into a Uint8Array first.\nType: ${typeof item}\n${item}`,
  )
}

function unsignedIntegerToUint8Array(value: bigint | number, widthInBytes: 8 | 20 | 32 | 256 = 32) {
  if (typeof value === 'number') {
    if (!Number.isSafeInteger(value)) throw new Error(`${value} is not able to safely be cast into a bigint.`)
    value = BigInt(value)
  }
  if (value >= BigInt(`0x1${'00'.repeat(widthInBytes)}`) || value < 0n)
    throw new Error(`Cannot fit ${value} into a ${widthInBytes * 8}-bit unsigned integer.`)
  const result = new Uint8Array(widthInBytes)
  if (result.length !== widthInBytes)
    throw new Error(`Cannot a ${widthInBytes} value into a ${result.length} byte array.`)
  for (let i = 0; i < result.length; ++i) {
    // eslint-disable-next-line no-bitwise
    result[i] = Number((value >> BigInt((widthInBytes - i) * 8 - 8)) & 0xffn)
  }
  return result
}

function stripLeadingZeros(byteArray: Uint8Array): Uint8Array {
  let i = 0
  for (; i < byteArray.length; ++i) {
    if (byteArray[i] !== 0) break
  }
  const result = new Uint8Array(byteArray.length - i)
  for (let j = 0; j < result.length; ++j) {
    result[j] = byteArray[i + j]
  }
  return result
}

function rlpEncodeItem(data: Uint8Array): Uint8Array {
  if (data.length === 1 && data[0] < 0x80) return rlpEncodeTiny(data)
  if (data.length <= 55) return rlpEncodeSmall(data)
  return rlpEncodeLarge(data)
}

function rlpEncodeTiny(data: Uint8Array): Uint8Array {
  if (data.length > 1) throw new Error(`rlpEncodeTiny can only encode single byte values.`)
  if (data[0] > 0x80) throw new Error(`rlpEncodeTiny can only encode values less than 0x80`)
  return data
}

function rlpEncodeSmall(data: Uint8Array): Uint8Array {
  if (data.length === 1 && data[0] < 0x80) throw new Error(`rlpEncodeSmall can only encode a value > 0x7f`)
  if (data.length > 55) throw new Error(`rlpEncodeSmall can only encode data that is <= 55 bytes long`)
  const result = new Uint8Array(data.length + 1)
  result[0] = 0x80 + data.length
  result.set(data, 1)
  return result
}

function rlpEncodeLarge(data: Uint8Array): Uint8Array {
  if (data.length <= 55) throw new Error(`rlpEncodeLarge can only encode data that is > 55 bytes long`)
  const lengthBytes = hexStringToUint8Array(data.length.toString(16))
  const result = new Uint8Array(data.length + lengthBytes.length + 1)
  result[0] = 0xb7 + lengthBytes.length
  result.set(lengthBytes, 1)
  result.set(data, 1 + lengthBytes.length)
  return result
}

function hexStringToUint8Array(hex: string): Uint8Array {
  const match = new RegExp(`^(?:0x)?([a-fA-F0-9]*)$`).exec(hex)
  if (match === null)
    throw new Error(`Expected a hex string encoded byte array with an optional '0x' prefix but received ${hex}`)
  const maybeLeadingZero = match[1].length % 2 ? '0' : ''
  const normalized = `${maybeLeadingZero}${match[1]}`
  const byteLength = normalized.length / 2
  const bytes = new Uint8Array(byteLength)
  for (let i = 0; i < byteLength; ++i) {
    bytes[i] = Number.parseInt(`${normalized[i * 2]}${normalized[i * 2 + 1]}`, 16)
  }
  return bytes
}

function rlpEncodeList(items): Uint8Array {
  const encodedItems = items.map(rlpEncode)
  const encodedItemsLength = encodedItems.reduce((total, item) => total + item.length, 0)
  if (encodedItemsLength <= 55) {
    const result = new Uint8Array(encodedItemsLength + 1)
    result[0] = 0xc0 + encodedItemsLength
    let offset = 1
    // eslint-disable-next-line no-restricted-syntax
    for (const encodedItem of encodedItems) {
      result.set(encodedItem, offset)
      offset += encodedItem.length
    }
    return result
  }
  const lengthBytes = hexStringToUint8Array(encodedItemsLength.toString(16))
  const result = new Uint8Array(1 + lengthBytes.length + encodedItemsLength)
  result[0] = 0xf7 + lengthBytes.length
  result.set(lengthBytes, 1)
  let offset = 1 + lengthBytes.length
  // eslint-disable-next-line no-restricted-syntax
  for (const encodedItem of encodedItems) {
    result.set(encodedItem, offset)
    offset += encodedItem.length
  }
  return result
}

function rlpDecode(data: Uint8Array) {
  return rlpDecodeItem(data).decoded
}

function rlpDecodeItem(data: Uint8Array): { decoded; consumed: number } {
  if (data.length === 0) throw new Error(`Cannot RLP decode a 0-length byte array.`)
  if (data[0] <= 0x7f) {
    const consumed = 1
    const decoded = data.slice(0, consumed)
    return { decoded, consumed }
  }
  if (data[0] <= 0xb7) {
    const byteLength = data[0] - 0x80
    if (byteLength > data.length - 1)
      throw new Error(`Encoded data length (${byteLength}) is larger than remaining data (${data.length - 1}).`)
    const consumed = 1 + byteLength
    const decoded = data.slice(1, consumed)
    if (byteLength === 1 && decoded[0] <= 0x7f)
      throw new Error(`A tiny value (${decoded[0].toString(16)}) was found encoded as a small value (> 0x7f).`)
    return { decoded, consumed }
  }
  if (data[0] <= 0xbf) {
    const lengthBytesLength = data[0] - 0xb7
    if (lengthBytesLength > data.length - 1)
      throw new Error(
        `Encoded length of data length (${lengthBytesLength}) is larger than the remaining data (${data.length - 1})`,
      )
    // the conversion to Number here is lossy, but we throw on the following line in that case so "meh"
    const length = decodeLength(data, 1, lengthBytesLength)
    if (length > data.length - 1 - lengthBytesLength)
      throw new Error(
        `Encoded data length (${length}) is larger than the remaining data (${data.length - 1 - lengthBytesLength})`,
      )
    const consumed = 1 + lengthBytesLength + length
    const decoded = data.slice(1 + lengthBytesLength, consumed)
    if (length <= 0x37) throw new Error(`A small value (<= 55 bytes) was found encoded in a large value (> 55 bytes)`)
    return { decoded, consumed }
  }
  if (data[0] <= 0xf7) {
    const length = data[0] - 0xc0
    if (length > data.length - 1)
      throw new Error(`Encoded array length (${length}) is larger than remaining data (${data.length - 1}).`)
    let offset = 1
    const results = []
    while (offset !== length + 1) {
      const { decoded, consumed } = rlpDecodeItem(data.slice(offset))
      results.push(decoded)
      offset += consumed
      if (offset > length + 1)
        throw new Error(
          `Encoded array length (${length}) doesn't align with the sum of the lengths of the encoded elements (${offset})`,
        )
    }
    return { decoded: results, consumed: offset }
  }
  const lengthBytesLength = data[0] - 0xf7
  // the conversion to Number here is lossy, but we throw on the following line in that case so "meh"
  const length = decodeLength(data, 1, lengthBytesLength)
  if (length > data.length - 1 - lengthBytesLength)
    throw new Error(
      `Encoded array length (${length}) is larger than the remaining data (${data.length - 1 - lengthBytesLength})`,
    )
  let offset = 1 + lengthBytesLength
  const results = []
  while (offset !== length + 1 + lengthBytesLength) {
    const { decoded, consumed } = rlpDecodeItem(data.slice(offset))
    results.push(decoded)
    offset += consumed
    if (offset > length + 1 + lengthBytesLength)
      throw new Error(
        `Encoded array length (${length}) doesn't align with the sum of the lengths of the encoded elements (${offset})`,
      )
  }
  return { decoded: results, consumed: offset }
}

function decodeLength(data: Uint8Array, offset: number, lengthBytesLength: number): number {
  const lengthBytes = data.slice(offset, offset + lengthBytesLength)
  let length = 0
  if (lengthBytes.length >= 1) length = lengthBytes[0]
  // eslint-disable-next-line no-bitwise
  if (lengthBytes.length >= 2) length = (length << 8) | lengthBytes[1]
  // eslint-disable-next-line no-bitwise
  if (lengthBytes.length >= 3) length = (length << 8) | lengthBytes[2]
  // eslint-disable-next-line no-bitwise
  if (lengthBytes.length >= 4) length = (length << 8) | lengthBytes[3]
  if (lengthBytes.length >= 5) throw new Error(`Unable to decode RLP item or array with a length larger than 2**32`)
  return length
}

async function getStorageAt(address: bigint, position: bigint, block: bigint | 'latest') {
  const encodedAddress = bigintToHexAddress(address)
  const encodedPosition = bigintToHexQuantity(position)
  const encodedBlockTag = block === 'latest' ? 'latest' : bigintToHexQuantity(block)

  const result = await web3.eth.getStorageAt(encodedAddress, encodedPosition, encodedBlockTag)
  if (typeof result !== 'string') {
    throw new Error(`Expected eth_getStorageAt to return a string but instead returned a ${typeof result}`)
  }
  return BigInt(result)
}

async function getBlockByNumber(blockNumber: bigint | string) {
  const block: any = await web3.eth.getBlock(blockNumber.toString())

  return {
    parentHash: stringToBigint(block.parentHash),
    sha3Uncles: stringToBigint(block.sha3Uncles),
    miner: stringToBigint(block.miner),
    stateRoot: stringToBigint(block.stateRoot),
    transactionsRoot: stringToBigint(block.transactionsRoot),
    receiptsRoot: stringToBigint(block.receiptsRoot),
    logsBloom: stringToBigint(block.logsBloom),
    difficulty: BigInt(block.difficulty),
    number: BigInt(block.number),
    gasLimit: BigInt(block.gasLimit),
    gasUsed: BigInt(block.gasUsed),
    timestamp: BigInt(block.timestamp),
    extraData: stringToByteArray(block.extraData),
    mixHash: stringToBigint(block.mixHash),
    nonce: stringToBigint(block.nonce),
  }
}

function stringToBigint(hex: string): bigint {
  const match = /^(?:0x)?([a-fA-F0-9]*)$/.exec(hex)
  if (match === null)
    throw new Error(`Expected a hex string encoded number with an optional '0x' prefix but received ${hex}`)
  const normalized = match[1]
  return BigInt(`0x${normalized}`)
}

export function uniLPAddress(asset1: string, asset2: string): string {
  return Pair.getAddress(
    new Token(1, web3.utils.toChecksumAddress(asset1), 18),
    new Token(1, web3.utils.toChecksumAddress(asset2), 18),
  ).toLowerCase()
}

export function sushiLPAddress(asset1: string, asset2: string): string {
  return getSushiSwapAddress(
    new Token(1, web3.utils.toChecksumAddress(asset1), 18),
    new Token(1, web3.utils.toChecksumAddress(asset2), 18),
  ).toLowerCase()
}

function getSushiSwapAddress(tokenA: Token, tokenB: Token): string {
  const tokens = tokenA.sortsBefore(tokenB) ? [tokenA, tokenB] : [tokenB, tokenA] // does safety checks

  return getCreate2Address(
    '0xC0AEe478e3658e2610c5F7A4A2E1777cE9e4f2Ac',
    keccak256(['bytes'], [pack(['address', 'address'], [tokens[0].address, tokens[1].address])]),
    '0xe18a34eb0e04b04f7a0ac29a6e80748dca96319b42c54d679cb821dca90c6303'
  )
}

async function getPrice(
  exchangeAddress: bigint,
  denominationToken: bigint,
  proofBlockNumber: bigint,
  currentBlockNumber: bigint,
): Promise<bigint> {
  async function getAccumulatorValue(innerBlockNumber: bigint, timestamp: bigint): Promise<bigint> {
    const [token0, token1, reservesAndTimestamp, accumulator0, accumulator1] = await Promise.all([
      getStorageAt(exchangeAddress, 6n, innerBlockNumber),
      getStorageAt(exchangeAddress, 7n, innerBlockNumber),
      getStorageAt(exchangeAddress, 8n, innerBlockNumber),
      getStorageAt(exchangeAddress, 9n, innerBlockNumber),
      getStorageAt(exchangeAddress, 10n, innerBlockNumber),
    ])
    // eslint-disable-next-line no-bitwise
    const blockTimestampLast = reservesAndTimestamp >> (112n + 112n)
    // eslint-disable-next-line no-bitwise
    const reserve1 = (reservesAndTimestamp >> 112n) & (BigInt('0x10000000000000000000000000000') - 1n)
    // eslint-disable-next-line no-bitwise
    const reserve0 = reservesAndTimestamp & (BigInt('0x10000000000000000000000000000') - 1n)
    if (token0 !== denominationToken && token1 !== denominationToken)
      throw new Error(
        `Denomination token ${addressToString(
          denominationToken,
        )} is not one of the tokens for exchange ${exchangeAddress}`,
      )
    if (reserve0 === 0n)
      throw new Error(`Exchange ${addressToString(exchangeAddress)} does not have any reserves for token0.`)
    if (reserve1 === 0n)
      throw new Error(`Exchange ${addressToString(exchangeAddress)} does not have any reserves for token1.`)
    if (blockTimestampLast === 0n)
      throw new Error(
        `Exchange ${addressToString(exchangeAddress)} has not had its first accumulator update (or it is year 2106).`,
      )
    if (accumulator0 === 0n)
      throw new Error(
        `Exchange ${addressToString(
          exchangeAddress,
        )} has not had its first accumulator update (or it is 136 years since launch).`,
      )
    if (accumulator1 === 0n)
      throw new Error(
        `Exchange ${addressToString(
          exchangeAddress,
        )} has not had its first accumulator update (or it is 136 years since launch).`,
      )
    const numeratorReserve = token0 === denominationToken ? reserve0 : reserve1
    const denominatorReserve = token0 === denominationToken ? reserve1 : reserve0
    const accumulator = token0 === denominationToken ? accumulator1 : accumulator0
    const timeElapsedSinceLastAccumulatorUpdate = timestamp - blockTimestampLast
    const priceNow = (numeratorReserve * BigInt('0x10000000000000000000000000000')) / denominatorReserve
    return accumulator + timeElapsedSinceLastAccumulatorUpdate * priceNow
  }
  const [latestBlock, historicBlock] = await Promise.all([getBlockByNumber(currentBlockNumber), getBlockByNumber(proofBlockNumber)])
  if (latestBlock === null) throw new Error(`Block ${currentBlockNumber} does not exist.`)
  if (historicBlock === null) throw new Error(`Block ${proofBlockNumber} does not exist.`)
  const [latestAccumulator, historicAccumulator] = await Promise.all([
    getAccumulatorValue(latestBlock.number, latestBlock.timestamp),
    getAccumulatorValue(proofBlockNumber, historicBlock.timestamp),
  ])
  const accumulatorDelta = latestAccumulator - historicAccumulator
  const timeDelta = BigInt(latestBlock.timestamp) - BigInt(historicBlock.timestamp)
  return accumulatorDelta / timeDelta
}