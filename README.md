# Unit Protocol Liquidator

Monitors Unit Protocol for liquidation opportunities and triggers liquidations

This code is responsible for [Unit Protocol Monitoring Telegram Bot](https://t.me/unit_protocol_pulse) as well

### Starting your own liquidator

#### Requirements
1. [Git](https://git-scm.com/book/en/v2/Getting-Started-Installing-Git)
1. [Node v18](https://nodejs.org/en/download/)
1. [Yarn](https://www.npmjs.com/package/yarn)
1. [Typescript](https://www.npmjs.com/package/typescript)
1. [pm2](https://www.npmjs.com/package/pm2)
1. [Telegram bot token](https://t.me/botfather)
1. [Ethereum websocket provider](https://infura.io/)
1. [Ethereum private key with ETH](https://ethereum.org/en/get-eth/)


#### Developing mode

1. ```git clone https://github.com/unitprotocol/liquidator```
2. ```cd liquidator && cp .env.example .env```
3. Change variable values to your own in .env
4. ```yarn install --frozen-lockfile```
5. ```yarn start```

#### Production mode
1. ```git clone https://github.com/unitprotocol/liquidator```
2. ```cd liquidator && cp .env.example .env```
3. Change variable values to your own in .env
4. ```docker-compose up --build```
