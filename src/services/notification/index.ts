import { Transfer } from 'src/types/Transfer'
import Logger from 'src/logger'
import { JoinExit } from 'src/types/JoinExit'
import { formatNumber, getTokenDecimals, getTokenSymbol, tryFetchPrice } from 'src/utils'
import { LiquidationTrigger } from 'src/types/LiquidationTrigger'
import { Liquidated } from 'src/types/Liquidated'

const TelegramBot = require("node-telegram-bot-api");


export default class NotificationService {
  private readonly bot
  private readonly logger
  private readonly defaultChatId
  private processed

  constructor() {
    this.logger = Logger(NotificationService.name)
    const botToken = process.env.TELEGRAM_BOT_TOKEN
    this.defaultChatId = process.env.TELEGRAM_CHAT_ID
    this.bot = new TelegramBot(botToken, { polling: false });
    this.processed = []
  }

  async notifyJoin(data: JoinExit) {
    const msg = await this.toMsg(data, true)
    if (msg) {
      return this.sendMessage(msg)
    }
  }

  async toMsg(data: JoinExit, isJoin) {
    if (!this._shouldNotify((isJoin ? this.notifyJoin.name : this.notifyExit.name) + ' ' +  data.txHash)) return

    let assetAction = '', usdpAction = ''

    const assetChange = data.main > 0

    const symbol = await getTokenSymbol(data.token)

    if (assetChange) {
      const assetPrefix = isJoin ? '#deposited' : '#withdrawn'
      const decimals = await getTokenDecimals(data.token)
      const assetValue = Number(data.main / BigInt(10 ** (decimals - 4))) / 10000

      const assetPrice = await tryFetchPrice(data.token, assetValue);

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
    if (!this._shouldNotify(this.notifyTriggered.name + ' ' +  data.txHash)) return
    const symbol = await getTokenSymbol(data.token)

    const text = '#liquidation_trigger'
      + `\nYou can buyout ${symbol} collateral`
      + `\nMain asset: ${data.token}`
      + `\nOwner: ${data.user}`
      + `\n<a href="https://liquidation.unit.xyz">Liquidate</a>`
      + `\n<a href="https://etherscan.io/tx/${data.txHash}">Etherscan</a>`

    return this.sendMessage(text)
  }

  async notifyLiquidated(data: Liquidated) {
    if (!this._shouldNotify(this.notifyLiquidated.name + ' ' +  data.txHash)) return
    const symbol = await getTokenSymbol(data.token)

    const repaymentFormatted = Number(data.repayment / BigInt(10 ** (18 - 4))) / 1e4

    const text = '#liquidated'
      + `\n${symbol} collateral has been liquidated for ${repaymentFormatted} USDP`
      + `\nMain asset: ${data.token}`
      + `\nOwner: ${data.owner}`
      + '\n' + `<a href="https://etherscan.io/tx/${data.txHash}">Etherscan</a>`

    return this.sendMessage(text)
  }

  async notifyTriggerTx(data: LiquidationTrigger) {
    if (!this._shouldNotify(this.notifyTriggerTx.name + ' ' +  data.txHash)) return
    const symbol = await getTokenSymbol(data.token)

    const text = `Trying to liquidate CDP with ${symbol} collateral`
      + `\nMain asset: ${data.token}`
      + `\nOwner: ${data.user}`
      + '\n' + `<a href="https://etherscan.io/tx/${data.txHash}">Etherscan</a>`

    return this.sendMessage(text)
  }

  private async sendMessage(text, chatId = this.defaultChatId, form = { parse_mode: 'HTML', disable_web_page_preview: true }) {
    return this.bot.sendMessage(chatId, text, form).catch((e) => {
      this.error('error', e);
    });
  }

  private _shouldNotify(id: string): boolean {
    if (this.processed.includes(id)) {
      return false
    }
    if (this.processed.length >= 100) {
      this.processed = this.processed.slice(90)
    }
    this.processed.push(id)
    return true
  }

  private log(...args) {
    this.logger.info(args)
  }

  private error(...args) {
    this.logger.error(args)
  }
}
