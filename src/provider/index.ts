const Web3 = require('web3')
require('dotenv').config()

const websocketOptions = {
  clientConfig: {
    keepalive: true,
    keepaliveInterval: 500
  }
}

const WEBSOCKET_URL = process.env[`${process.env.CHAIN_NAME.toUpperCase()}_WEBSOCKET_URL`]

export const web3 = new Web3(new Web3.providers.WebsocketProvider(WEBSOCKET_URL, websocketOptions))
export const web3Proof = process.env.PROOFS_RPC_URL ? new Web3(process.env.PROOFS_RPC_URL) : web3
