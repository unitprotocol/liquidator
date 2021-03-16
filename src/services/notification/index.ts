import { Transfer } from 'src/types/Transfer'

const TelegramBot = require("node-telegram-bot-api");
import Logger from 'src/logger'
import { JoinExit } from 'src/types/JoinExit'
import { tokenByAddress } from 'src/constants/tokens'
import { formatNumber } from 'src/utils'
import { LiquidationTrigger } from 'src/types/LiquidationTrigger'
import { Liquidated } from 'src/types/Liquidated'


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
    if (!this._preNotify(this.notifyJoin.name + ' ' +  data.txHash)) return
    const token = tokenByAddress(data.token) || { decimals: 18, symbol: data.token}
    const mainFormatted = Number(data.main / BigInt(10 ** (token.decimals - 4))) / 10000
    const colFormatted = Number(data.col / BigInt(1e18))
    let deposit =
      (mainFormatted > 0 ? formatNumber(mainFormatted) + ' ' + token.symbol + ' ' : '')
      + (colFormatted > 0 ? (mainFormatted > 0 ? 'and ': '') + formatNumber(colFormatted) + ' COL' : '')

    deposit = deposit === '' ? '' : '#bsc_deposited ' + deposit

    const usdp = Number(data.usdp / BigInt(10 ** 15)) / 1000

    const duckCount = usdp < 1000 ? 1 : (usdp < 5000 ? 2 : (Math.round(usdp / 5000) + 2))
    let minted = data.usdp > 0 ? '#bsc_minted ' + formatNumber(usdp) + ' USDP ' + '🦆'.repeat(duckCount) : ''
    minted = minted ? (deposit ? '\n' + minted : minted) : ''

    const text = deposit + minted + '\n' + `<a href="https://bscscan.com/tx/${data.txHash}">Explorer</a>`
    this.sendMessage(text)
  }

  async notifyExit(data: JoinExit) {
    if (!this._preNotify(this.notifyExit.name + ' ' +  data.txHash)) return
    const token = tokenByAddress(data.token) || { decimals: 18, symbol: data.token}
    const mainFormatted = Number(data.main / BigInt(10 ** (token.decimals - 4))) / 10000
    const colFormatted = Number(data.col / BigInt(1e18))
    let withdrawn =
      (mainFormatted > 0 ? formatNumber(mainFormatted) + ' ' + token.symbol + ' ' : '')
      + (colFormatted > 0 ? (mainFormatted > 0 ? 'and ': '') + formatNumber(colFormatted) + ' COL' : '')

    withdrawn = withdrawn === '' ? '' : '#bsc_withdrawn ' + withdrawn

    const usdp = Number(data.usdp / BigInt(10 ** 15)) / 1000

    let burned = data.usdp > 0 ? '#bsc_burned ' + formatNumber(usdp) + ' USDP' : ''
    burned = burned ? (withdrawn ? '\n' + burned : burned) : ''

    if (withdrawn + burned === '') return

    const text = withdrawn + burned + '\n' + `<a href="https://bscscan.com/tx/${data.txHash}">Explorer</a>`
    this.sendMessage(text)
  }

  async notifyDuck(data: Transfer) {
    const amountFormatted = Number(data.amount / BigInt(10 ** (18 - 4))) / 1e4
    const text = `${amountFormatted} DUCK minted\n` + `<a href="https://bscscan.com/tx/${data.txHash}">Explorer 🦆</a>`
    this.sendMessage(text)
  }

  async notifyTriggered(data: LiquidationTrigger) {
    if (!this._preNotify(this.notifyTriggered.name + ' ' +  data.txHash)) return
    const token = tokenByAddress(data.token)

    const text = '#bsc_liquidation_trigger'
      + `\nYou can buyout ${token.symbol} collateral`
      + `\nMain asset: ${data.token}`
      + `\nOwner: ${data.user}`
      + `\n<a href="https://bsc.liquidation.unit.xyz">Liquidate</a>`
      + `\n<a href="https://bscscan.com/tx/${data.txHash}">Explorer</a>`

    this.sendMessage(text)
  }

  async notifyLiquidated(data: Liquidated) {
    if (!this._preNotify(this.notifyLiquidated.name + ' ' +  data.txHash)) return
    const token = tokenByAddress(data.token)

    const repaymentFormatted = Number(data.repayment / BigInt(10 ** (18 - 4))) / 1e4

    const text = '#bsc_liquidated'
      + `\n${token.symbol} collateral has been liquidated for ${repaymentFormatted} USDP`
      + `\nMain asset: ${data.token}`
      + `\nOwner: ${data.owner}`
      + '\n' + `<a href="https://bscscan.com/tx/${data.txHash}">Explorer</a>`

    this.sendMessage(text)
  }

  async notifyTriggerTx(data: LiquidationTrigger) {
    if (!this._preNotify(this.notifyTriggerTx.name + ' ' +  data.txHash)) return
    const token = tokenByAddress(data.token)

    const text = `Trying to liquidate CDP with ${token.symbol} collateral`
      + `\nMain asset: ${data.token}`
      + `\nOwner: ${data.user}`
      + '\n' + `<a href="https://bscscan.com/tx/${data.txHash}">Explorer</a>`

    this.sendMessage(text)
  }

  private async sendMessage(text, chatId = this.defaultChatId, form = { parse_mode: 'HTML', disable_web_page_preview: true }) {
    return this.bot.sendMessage(chatId, text, form).catch((e) => {
      this.error('error', e);
    });
  }

  private _preNotify(id: string): boolean {
    if (this.processed.includes(id)) {
      this.log('._preNotify', 'already processed', id)
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
