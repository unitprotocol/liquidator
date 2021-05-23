import { Transfer } from 'src/types/Transfer'
import Logger from 'src/logger'
import { JoinExit } from 'src/types/JoinExit'
import { formatNumber, getLiquidationPrice, getTokenDecimals, getTokenSymbol, tryFetchPrice } from 'src/utils'
import { LiquidationTrigger } from 'src/types/LiquidationTrigger'
import { Buyout } from 'src/types/Buyout'
import { BasicEvent } from 'src/types/BasicEvent'
import { NotificationState } from 'src/services/statemanager'
import BigNumber from 'bignumber.js'

const TelegramBot = require("node-telegram-bot-api");

export type LogStore = {
  blockHash: string
  txIndex: number
  logIndexes: number[]
}

export default class NotificationService {
  private readonly bot
  private readonly logger
  private readonly defaultChatId
  private readonly processed: Map<string, LogStore>

  constructor(notificationState: NotificationState) {
    this.logger = Logger(NotificationService.name)
    const botToken = process.env.TELEGRAM_BOT_TOKEN
    this.defaultChatId = process.env.TELEGRAM_CHAT_ID
    this.bot = new TelegramBot(botToken, { polling: false });

    this.processed = new Map()

    try {
      Object.keys(notificationState.logs).forEach((txHash) => {
        this.processed.set(txHash, notificationState.logs[txHash])
      })
      this.log(`Loaded notification state, processed notifications count: ${this.processed.size}`)
    } catch (e) { }
  }

  async notifyJoin(data: JoinExit) {
    const msg = await this.toMsg(data, true)
    if (msg) {
      return this.sendMessage(msg)
    }
  }

  async toMsg(data: JoinExit, isJoin) {
    if (!this._shouldNotify(data)) return

    let assetAction = '', usdpAction = ''

    const assetChange = data.main > 0

    const symbol = await getTokenSymbol(data.token)

    if (assetChange) {
      const assetPrefix = isJoin ? '#deposited' : '#withdrawn'
      const decimals = await getTokenDecimals(data.token)
      const assetValue = new BigNumber(data.main.toString()).div(10 ** decimals).toNumber()

      const assetPrice = await tryFetchPrice(data.token, data.main, decimals);

      assetAction = `${assetPrefix} ${formatNumber(assetValue)} ${symbol} (${assetPrice})`
    }

    const usdpChange = data.usdp > 0

    if (usdpChange) {
      const usdpPrefix = (assetChange ? '\n' : '') + (isJoin ? '#minted' : '#burned')
      const usdp = Number(data.usdp / BigInt(10 ** 15)) / 1000
      const duckCount = isJoin ? usdp < 1_000 ? 1 : (usdp < 5_000 ? 2 : (Math.round(usdp / 5_000) + 2)) : 0

      const collateralInfo = assetChange ? '' : `(${symbol}) `

      usdpAction = `${usdpPrefix} ${formatNumber(usdp)} USDP ${collateralInfo}${'🦆'.repeat(duckCount)}`
    }

    return assetAction + usdpAction + '\n' + `<a href="https://etherscan.io/tx/${data.txHash}">Etherscan</a>`
  }

  async notifyExit(data: JoinExit) {
    const msg = await this.toMsg(data, false)
    if (msg) {
      return this.sendMessage(msg)
    }
  }

  async notifyDuck(data: Transfer) {
    const amountFormatted = Number(data.amount / BigInt(10 ** (18 - 4))) / 1e4
    const text = `${amountFormatted} DUCK minted\n` + `<a href="https://etherscan.io/tx/${data.txHash}">Etherscan 🦆</a>`
    return this.sendMessage(text)
  }

  async notifyTriggered(data: LiquidationTrigger) {
    if (!this._shouldNotify(data)) return
    const symbol = await getTokenSymbol(data.token)

    const liquidationPrice = await getLiquidationPrice(data.token, data.user)
    const liquidationPriceFormatted = Number(liquidationPrice / BigInt(10 ** (18 - 2))) / 1e2

    const text = '#liquidation_trigger'
      + `\nLiquidation auction for ${symbol} just started`
      + `\nInitial price ${liquidationPriceFormatted} USDP`
      + `\nAsset ${data.token}`
      + `\nOwner ${data.user}`
      + `\n<a href="https://liquidation.unit.xyz">Liquidate</a>`
      + `\n<a href="https://etherscan.io/tx/${data.txHash}">Etherscan</a>`

    return this.sendMessage(text)
  }

  async notifyLiquidated(data: Buyout) {
    if (!this._shouldNotify(data)) return
    const symbol = await getTokenSymbol(data.token)

    const decimals = await getTokenDecimals(data.token)

    const assetPrice = await tryFetchPrice(data.token, data.amount, decimals);

    const usdpPriceFormatted: number | string = Number(data.price / BigInt(10 ** (18 - 2))) / 1e2

    const price = usdpPriceFormatted === 0 ? 'free' : `${usdpPriceFormatted} USDP`

    const assetAmount = new BigNumber(data.amount.toString()).div(10 ** decimals).toNumber()

    const text = '#liquidated'
      + `\n${formatNumber(assetAmount)} ${symbol} (${assetPrice}) for ${price}`
      + `\nAsset ${data.token}`
      + `\nOwner ${data.owner}`
      + `\nLiquidator ${data.liquidator}`
      + '\n' + `<a href="https://etherscan.io/tx/${data.txHash}">Etherscan</a>`

    return this.sendMessage(text)
  }

  async notifyTriggerTx(data: LiquidationTrigger) {
    if (!this._shouldNotify(data)) return
    const symbol = await getTokenSymbol(data.token)

    const text = `Trying to liquidate CDP with ${symbol} collateral`
      + `\nAsset ${data.token}`
      + `\nOwner ${data.user}`
      + '\n' + `<a href="https://etherscan.io/tx/${data.txHash}">Etherscan</a>`

    return this.sendMessage(text)
  }

  private async sendMessage(text, chatId = this.defaultChatId, form = { parse_mode: 'HTML', disable_web_page_preview: true }) {
    return this.bot.sendMessage(chatId, text, form).catch((e) => {
      this.error('error', e);
    });
  }

  private _shouldNotify(n: BasicEvent): boolean {
    const exists = this._isExists(n)
    return !exists
  }

  private log(...args) {
    this.logger.info(args)
  }

  private error(...args) {
    this.logger.error(args)
  }

  public getState(): NotificationState {
    return {
      logs: Object.fromEntries(this.processed.entries())
    }
  }

  private _isExists(n: BasicEvent): boolean {
    if (!this.processed.get(n.txHash)) {
      this.processed.set(n.txHash, { blockHash: n.blockHash, txIndex: n.txIndex, logIndexes: [n.logIndex] })
      return false
    }
    const logStore = this.processed.get(n.txHash);
    if (logStore.txIndex === n.txIndex && logStore.blockHash === n.blockHash) {
      if (logStore.logIndexes.includes(n.logIndex)) {
        return true
      }
      this.processed.set(n.txHash, { blockHash: n.blockHash, txIndex: n.txIndex, logIndexes: [ ...logStore.logIndexes, n.logIndex] })
      return false
    } else {
      return true
    }
  }
}
