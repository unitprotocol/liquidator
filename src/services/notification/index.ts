import { Transfer } from '../../types/Transfer'

const TelegramBot = require("node-telegram-bot-api");
import Logger from '../../logger'
import { JoinExit } from '../../types/JoinExit'
import { tokenByAddress } from '../../constants/tokens'
import { numberWithCommas } from '../../utils'


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
    if (this.processed.includes(data.txHash)) {
      this.log('.notifyJoin', 'already processed', data)
      return
    }
    if (this.processed.length >= 100) {
      this.processed = this.processed.slice(90)
    }
    this.processed.push(data.txHash)
    const token = tokenByAddress(data.token) || { decimals: 18, symbol: data.token}
    const mainFormatted = Number(data.main / BigInt(10 ** (token.decimals - 4))) / 10000
    const colFormatted = data.col / BigInt(1e18)
    let deposit =
      (mainFormatted > 0 ? numberWithCommas(mainFormatted) + ' ' + token.symbol + ' ' : '')
      + (colFormatted > 0 ? (mainFormatted > 0 ? 'and ': '') + numberWithCommas(colFormatted) + ' COL' : '')

    deposit = deposit === '' ? '' : 'Deposited ' + deposit

    const usdp = Number(data.usdp / BigInt(10 ** 15)) / 1000

    const duckCount = usdp < 1000 ? 1 : (usdp < 5000 ? 2 : (Math.round(usdp / 5000) + 2))
    let minted = data.usdp > 0 ? 'Minted ' + numberWithCommas(usdp) + ' USDP ' + '🦆'.repeat(duckCount) : ''
    minted = minted ? (deposit ? '\n' + minted : minted) : ''

    const text = deposit + minted + '\n' + `<a href="https://etherscan.io/tx/${data.txHash}">Etherscan</a>`
    this.sendMessage(text)
  }

  async notifyExit(data: JoinExit) {
    if (this.processed.includes(data.txHash)) {
      this.log('.notifyExit', 'already processed', data)
      return
    }
    if (this.processed.length >= 100) {
      this.processed = this.processed.slice(90)
    }
    this.processed.push(data.txHash)
    const token = tokenByAddress(data.token) || { decimals: 18, symbol: data.token}
    const mainFormatted = Number(data.main / BigInt(10 ** (token.decimals - 4))) / 10000
    const colFormatted = data.col / BigInt(1e18)
    let withdrawn =
      (mainFormatted > 0 ? numberWithCommas(mainFormatted) + ' ' + token.symbol + ' ' : '')
      + (colFormatted > 0 ? (mainFormatted > 0 ? 'and ': '') + numberWithCommas(colFormatted) + ' COL' : '')

    withdrawn = withdrawn === '' ? '' : 'Withdrawn ' + withdrawn

    const usdp = Number(data.usdp / BigInt(10 ** 15)) / 1000

    let burned = data.usdp > 0 ? 'Burned ' + numberWithCommas(usdp) + ' USDP' : ''
    burned = burned ? (withdrawn ? '\n' + burned : burned) : ''

    const text = withdrawn + burned + '\n' + `<a href="https://etherscan.io/tx/${data.txHash}">Etherscan</a>`
    this.sendMessage(text)
  }

  async notifyDuck(data: Transfer) {
    const amountFormatted = Number(data.amount / BigInt(10 ** (18 - 4))) / 1e4
    const text = `${amountFormatted} DUCK minted\n` + `<a href="https://etherscan.io/tx/${data.txHash}">Etherscan 🦆</a>`
    this.sendMessage(text)
  }

  async notifyTriggered(data) {
    if (this.processed.includes(data.txHash)) {
      this.log('.notifyTriggered', 'already processed', data)
      return
    }
    if (this.processed.length >= 100) {
      this.processed = this.processed.slice(90)
    }
    this.processed.push(data.txHash)
    const token = tokenByAddress(data.mainAsset)

    const text = 'Liquidation triggered'
      + `\nYou can buyout ${token.symbol} collateral`
      + `\nMain asset: ${data.mainAsset}`
      + `\nOwner: ${data.owner}`
      + '\n' + `<a href="https://etherscan.io/tx/${data.txHash}">Etherscan</a>`

    this.sendMessage(text)
  }

  private async sendMessage(text, chatId = this.defaultChatId, form = { parse_mode: 'HTML', disable_web_page_preview: true }) {
    return this.bot.sendMessage(chatId, text, form).catch((e) => {
      this.error('error', e);
    });
  }


  private log(...args) {
    this.logger.info(args)
  }

  private error(...args) {
    this.logger.error(args)
  }
}
