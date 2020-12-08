const Web3 = require('web3')
require('dotenv').config()

const web3 = new Web3(process.env.ETHEREUM_WEBSOCKET_URL)

export default web3
