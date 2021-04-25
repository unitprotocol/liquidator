const Web3 = require('web3')
require('dotenv').config()

const websocketOptions = {
  clientConfig: {
    keepalive: true,
    keepaliveInterval: 500
  }
}

const web3 = new Web3(new Web3.providers.WebsocketProvider(process.env.ETHEREUM_WEBSOCKET_URL, websocketOptions))

export default web3
