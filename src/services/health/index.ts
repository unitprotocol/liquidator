import http from 'http';
import Logger from "src/logger";
import StateManagerService from "src/services/statemanager";
import Web3 from "web3";
import {BLOCKS_CHECK_DELAY, CHAIN_NAME, MIN_BALANCE} from "src/constants";
import {web3} from "src/provider";

const PORT = 3000
const RPC_LAG_THRESHOLD = 300;
const PROCESSED_BLOCK_LAG_THRESHOLD = BLOCKS_CHECK_DELAY * 3;

class HealthService {
    private readonly server: http.Server
    private readonly logger;

    private readonly web3: Web3
    private stateManager: StateManagerService

    constructor(web3, stateManager: StateManagerService) {
        this.logger = Logger('HealthService')
        this.web3 = web3
        this.stateManager = stateManager

        this.server = http.createServer(async (req, res) => {
            res.setHeader('Content-Type', 'application/json');
            if (req.method !== 'GET') {
                res.end(`{"error": "${http.STATUS_CODES[405]}"}`)
                return;
            } else {
                if (req.url === '/health') {
                    res.end(JSON.stringify(await this.checkHealth()))
                    return;
                }
            }
            res.end(`{"error": "${http.STATUS_CODES[404]}"}`)
        })

        this.server.listen(PORT, () => {
            this.logger.info([`Health http server listening on port ${PORT}`]);
        })
    }

    private async checkHealth() {
        let resultRpc = true;
        let resultEvents = true;
        let resultLiquidator = true;
        let resultBalance = true;

        const currentTs = Math.floor(Date.now() / 1000)
        const lastBlock = await this.web3.eth.getBlock('latest')

        if (lastBlock.timestamp < currentTs - RPC_LAG_THRESHOLD) {
            resultRpc = false;
        }

        const state = this.stateManager.loadState();
        if (state.lastProcessedBlock < lastBlock.number - PROCESSED_BLOCK_LAG_THRESHOLD) {
            resultEvents = false
        }
        if (state.lastLiquidationCheck < lastBlock.number - PROCESSED_BLOCK_LAG_THRESHOLD) {
            resultLiquidator = false;
        }

        const balance = await web3.eth.getBalance(process.env.ETHEREUM_ADDRESS)
        if (balance < MIN_BALANCE) {
            resultBalance = false;
        }

        return {
            health: resultRpc && resultEvents && resultLiquidator && resultBalance,
            health_rpc: resultRpc,
            health_events: resultEvents,
            health_liquidator: resultLiquidator,
            health_balance: resultBalance,
            chain: CHAIN_NAME,
            ts: currentTs,
            rpcLastBlock: lastBlock.number,
            rpcLastBlockTs: lastBlock.timestamp,
            eventsLastProcessedBlock: state.lastProcessedBlock,
            liquidatorLastProcessedBlock: state.lastLiquidationCheck,
            min_balance: MIN_BALANCE.toString(),
            current_balance: balance.toString(),
        };
    }
}

export default HealthService