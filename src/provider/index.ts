const Web3 = require('web3')
require('dotenv').config()

const websocketOptions = {
  // Enable auto reconnection
  reconnect: {
    auto: true,
    delay: 1000, // ms
    maxAttempts: 100,
    onTimeout: false,
  },
}

const web3 = new Web3(new Web3.providers.WebsocketProvider(process.env.ETHEREUM_WEBSOCKET_URL, websocketOptions))

export default web3
