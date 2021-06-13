const Web3 = require('web3')
require('dotenv').config()

const websocketOptions = {
  clientConfig: {
    keepalive: true,
    keepaliveInterval: 5_000
  }
}

export const web3 = new Web3(new Web3.providers.WebsocketProvider(process.env.ETHEREUM_WEBSOCKET_URL, websocketOptions))
export const web3Proof = process.env.PROOFS_RPC_URL ? new Web3(process.env.PROOFS_RPC_URL) : web3

