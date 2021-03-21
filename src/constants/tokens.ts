const collaterals = {
  1: {
    '0x92e187a03b6cd19cb6af293ba17f2745fd2357d5': {
      symbol: 'DUCK',
      defaultOracleType: 3,
      decimals: 18,
      logoUrl: `${process.env.PUBLIC_URL}/images/duck_logo.png`,
    },
    '0xc02aaa39b223fe8d0a0e5c4f27ead9083c756cc2': {
      symbol: 'ETH',
      decimals: 18,
      defaultOracleType: 3,
    },
    '0x2260fac5e5542a773aa44fbcfedf7c193bc2c599': {
      symbol: 'WBTC',
      defaultOracleType: 3,
      decimals: 8,
    },
    '0x0ae055097c6d159879521c384f1d2123d1f195e6': {
      symbol: 'STAKE',
      defaultOracleType: 3,
      decimals: 18,
    },
    '0x0bc529c00c6401aef6d220be8c6ea1667f6ad93e': {
      symbol: 'YFI',
      defaultOracleType: 3,
      decimals: 18,
    },
    '0x9f8f72aa9304c8b593d555f12ef6589cc3a579a2': {
      symbol: 'MKR',
      defaultOracleType: 3,
      decimals: 18,
    },
    '0xd533a949740bb3306d119cc777fa900ba034cd52': {
      symbol: 'CRV',
      defaultOracleType: 3,
      decimals: 18,
    },
    '0x1ceb5cb57c4d4e2b2433641b95dd330a33185a44': {
      symbol: 'KP3R',
      defaultOracleType: 3,
      decimals: 18,
    },
    '0x1f9840a85d5af5bf1d1762f925bdaddc4201f984': {
      symbol: 'UNI',
      defaultOracleType: 3,
      decimals: 18,
    },
    '0x7fc66500c84a76ad7e9c93437bfc5ac33e2ddae9': {
      symbol: 'AAVE',
      defaultOracleType: 3,
      decimals: 18,
    },
    '0xc00e94cb662c3520282e6f5717214004a7f26888': {
      symbol: 'COMP',
      defaultOracleType: 3,
      decimals: 18,
    },
    '0xc011a73ee8576fb46f5e1c5751ca3b9fe0af2a6f': {
      symbol: 'SNX',
      defaultOracleType: 3,
      decimals: 18,
    },
    '0x514910771af9ca656af840dff83e8264ecf986ca': {
      symbol: 'LINK',
      defaultOracleType: 3,
      decimals: 18,
    },
    '0x04fa0d235c4abf4bcf4787af4cf447de572ef828': {
      symbol: 'UMA',
      defaultOracleType: 3,
      decimals: 18,
    },
    '0xeb4c2781e4eba804ce9a9803c67d0893436bb27d': {
      symbol: 'renBTC',
      defaultOracleType: 3,
      decimals: 8,
    },
    '0x584bc13c7d411c00c01a62e8019472de68768430': {
      symbol: 'HEGIC',
      defaultOracleType: 3,
      decimals: 18,
    },
    '0xc76fb75950536d98fa62ea968e1d6b45ffea2a55': {
      symbol: 'COL',
      defaultOracleType: 3,
      decimals: 18,
    },
    '0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48': {
      symbol: 'USDC',
      defaultOracleType: 7,
      decimals: 6,
    },
    '0xdac17f958d2ee523a2206206994597c13d831ec7': {
      symbol: 'USDT',
      defaultOracleType: 7,
      decimals: 6,
    },
    '0x6b175474e89094c44da98b954eedeac495271d0f': {
      symbol: 'DAI',
      defaultOracleType: 7,
      decimals: 18,
    },
    '0x57ab1ec28d129707052df4df418d58a2d46d5f51': {
      symbol: 'sUSD',
      defaultOracleType: 7,
      decimals: 18,
    },
    '0x1494ca1f11d487c2bbe4543e90080aeba4ba3c2b': {
      symbol: 'DPI',
      defaultOracleType: 3,
      decimals: 18,
    },
    '0xba11d00c5f74255f56a5e366f4f77f5a186d7f55': {
      symbol: 'BAND',
      defaultOracleType: 3,
      decimals: 18,
    },
    '0x408e41876cccdc0f92210600ef50372656052a38': {
      symbol: 'REN',
      defaultOracleType: 3,
      decimals: 18,
    },
    '0x6b3595068778dd592e39a122f4f5a5cf09c90fe2': {
      symbol: 'SUSHI',
      defaultOracleType: 7,
      decimals: 18,
    },
    '0xc944e90c64b2c07662a292be6244bdf05cda44a7': {
      symbol: 'GRT',
      defaultOracleType: 3,
      decimals: 18,
    },
    '0xa3bed4e1c75d00fa6f4e5e6922db7261b5e9acd2': {
      symbol: 'MTA',
      defaultOracleType: 3,
      decimals: 18,
    },
    '0x429881672b9ae42b8eba0e26cd9c73711b891ca5': {
      symbol: 'PICKLE',
      defaultOracleType: 3,
      decimals: 18,
    },
    '0xbc396689893d065f41bc2c6ecbee5e0085233447': {
      symbol: 'PERP',
      defaultOracleType: 3,
      decimals: 18,
    },
    '0x967da4048cd07ab37855c090aaf366e4ce1b9f48': {
      symbol: 'OCEAN',
      defaultOracleType: 3,
      decimals: 18,
    },
    '0xba100000625a3754423978a60c9317c58a424e3d': {
      symbol: 'BAL',
      defaultOracleType: 3,
      decimals: 18,
    },
    '0x2ba592f78db6436527729929aaf6c908497cb200': {
      symbol: 'CREAM',
      defaultOracleType: 3,
      decimals: 18,
    },
    '0x5bc25f649fc4e26069ddf4cf4010f9f706c23831': {
      symbol: 'DUSD',
      defaultOracleType: 3,
      decimals: 18,
      logoUrl: `${process.env.PUBLIC_URL}/images/ic-dusd.png`,
    },
    '0xe2f2a5c287993345a840db3b0845fbc70f5935a5': {
      symbol: 'mUSD',
      defaultOracleType: 3,
      decimals: 18,
    },
    '0xd26114cd6ee289accf82350c8d8487fedb8a0c07': {
      symbol: 'OMG',
      defaultOracleType: 3,
      decimals: 18,
    },
    '0x4e15361fd6b4bb609fa63c81a2be19d873717870': {
      symbol: 'FTM',
      defaultOracleType: 7,
      decimals: 18,
    },
    '0x4688a8b1f292fdab17e9a90c8bc379dc1dbd8713': {
      symbol: 'COVER',
      defaultOracleType: 7,
      decimals: 18,
    },
    '0x0aacfbec6a24756c20d41914f2caba817c0d8521': {
      symbol: 'YAM',
      defaultOracleType: 7,
      decimals: 18,
    },
    '0x8798249c2e607446efb7ad49ec89dd1865ff4272': {
      symbol: 'XSUSHI',
      defaultOracleType: 9,
      decimals: 18,
    },
    '0xf99d58e463a2e07e5692127302c20a191861b4d6': {
      symbol: 'ANY',
      defaultOracleType: 7,
      decimals: 18,
    },
    '0x1337def16f9b486faed0293eb623dc8395dfe46a': {
      symbol: 'ARMOR',
      defaultOracleType: 7,
      decimals: 18,
    },
    '0x3c9d6c1c73b31c837832c72e04d3152f051fc1a9': {
      symbol: 'BOR',
      defaultOracleType: 7,
      decimals: 18,
    },
    '0xb753428af26e81097e7fd17f40c88aaa3e04902c': {
      symbol: 'SFI',
      defaultOracleType: 3,
      decimals: 18,
    },
    '0x23b608675a2b2fb1890d3abbd85c5775c51691d5': {
      symbol: 'SOCKS',
      defaultOracleType: 3,
      decimals: 18,
    },
    '0xd291e7a03283640fdc51b121ac401383a46cc623': {
      symbol: 'RGT',
      defaultOracleType: 7,
      decimals: 18,
    },
    '0x1c5db575e2ff833e46a2e9864c22f4b22e0b37c2': {
      symbol: 'renZEC',
      defaultOracleType: 3,
      decimals: 8,
    },
    '0xd5147bc8e386d91cc5dbe72099dac6c9b99276f5': {
      symbol: 'renFIL',
      defaultOracleType: 3,
      decimals: 18,
    },
    '0x3832d2f059e55934220881f831be501d180671a7': {
      symbol: 'renDOGE',
      defaultOracleType: 7,
      decimals: 8,
    },

    '0xe41d2489571d322189246dafa5ebde1f4699f498': {
      symbol: 'ZRX',
      defaultOracleType: 5,
      decimals: 18,
    },
    '0x0d8775f648430679a709e98d2b0cb6250d2887ef': {
      symbol: 'BAT',
      defaultOracleType: 5,
      decimals: 18,
    },
    '0xdd974d5c2e2928dea5f71b9825b8b646686bd200': {
      symbol: 'KNC',
      defaultOracleType: 5,
      decimals: 18,
    },
    '0xbbbbca6a901c926f240b89eacb641d8aec7aeafd': {
      symbol: 'LRC',
      defaultOracleType: 5,
      decimals: 18,
    },
    '0x0f5d2fb29fb7d3cfee444a200298f468908cc942': {
      symbol: 'MANA',
      defaultOracleType: 5,
      decimals: 18,
    },
    '0x221657776846890989a759ba2973e427dff5c9bb': {
      symbol: 'REP',
      defaultOracleType: 5,
      decimals: 18,
    },
    '0xf629cbd94d3791c9250152bd8dfbdf380e2a3b9c': {
      symbol: 'ENJ',
      defaultOracleType: 5,
      decimals: 18,
    },
    '0xade00c28244d5ce17d72e40330b1c318cd12b7c3': {
      symbol: 'ADX',
      defaultOracleType: 5,
      decimals: 18,
    },
    '0xd46ba6d942050d489dbd938a2c909a5d5039a161': {
      symbol: 'AMPL',
      defaultOracleType: 5,
      decimals: 18,
    },
    '0xa117000000f279d81a1d3cc75430faa017fa5a2e': {
      symbol: 'ANT',
      defaultOracleType: 5,
      decimals: 18,
    },
    '0x56d811088235f11c8920698a204a5010a788f4b3': {
      symbol: 'BZRX',
      defaultOracleType: 5,
      decimals: 18,
    },
    '0xa0b73e1ff0b80914ab6fe0444e65848c4c34450b': {
      symbol: 'CRO',
      defaultOracleType: 5,
      decimals: 18,
    },
    '0xe28b3b32b6c345a34ff64674606124dd5aceca30': {
      symbol: 'INJ',
      defaultOracleType: 5,
      decimals: 18,
    },
    '0x7d1afa7b718fb893db30a3abc0cfc608aacfebb0': {
      symbol: 'MATIC',
      defaultOracleType: 5,
      decimals: 18,
    },
    '0x1776e1f26f98b1a5df9cd347953a26dd3cb46671': {
      symbol: 'NMR',
      defaultOracleType: 5,
      decimals: 18,
    },
    '0x8207c1ffc5b6804f6024322ccf34f29c3541ae26': {
      symbol: 'OGN',
      defaultOracleType: 5,
      decimals: 18,
    },
    '0x0258f474786ddfd37abce6df6bbb1dd5dfc4434a': {
      symbol: 'ORN',
      defaultOracleType: 5,
      decimals: 18,
    },
    '0x4575f41308ec1483f3d399aa9a2826d74da13deb': {
      symbol: 'OXT',
      defaultOracleType: 5,
      decimals: 18,
    },
    '0x8ce9137d39326ad0cd6491fb5cc0cba0e089b6a9': {
      symbol: 'SXP',
      defaultOracleType: 5,
      decimals: 18,
    },
    '0x4c19596f5aaff459fa38b0f7ed92f11ae6543784': {
      symbol: 'TRU',
      defaultOracleType: 5,
      decimals: 18,
    },

    '0xe6c804ff4ec692e6808c0d032cdbc03772fc4d42': {
      symbol: 'UNISWAP LP renZEC-ETH',
      defaultOracleType: 4,
      poolTokens: ['0x1c5db575e2ff833e46a2e9864c22f4b22e0b37c2', '0xc02aaa39b223fe8d0a0e5c4f27ead9083c756cc2'],
      decimals: 18,
    },
    '0x4423be2173401e96065953a3e962ba7b8fdba68a': {
      symbol: 'UNISWAP LP renFIL-ETH',
      defaultOracleType: 4,
      poolTokens: ['0xd5147bc8e386d91cc5dbe72099dac6c9b99276f5', '0xc02aaa39b223fe8d0a0e5c4f27ead9083c756cc2'],
      decimals: 18,
    },
    '0xb46736888247c68c995b156ca86426ff32e27cc9': {
      symbol: 'SUSHISWAP LP renDOGE-ETH',
      defaultOracleType: 8,
      poolTokens: ['0x3832d2f059e55934220881f831be501d180671a7', '0xc02aaa39b223fe8d0a0e5c4f27ead9083c756cc2'],
      decimals: 18,
    },
    '0xc3601f3e1c26d1a47571c559348e4156786d1fec': {
      symbol: 'UNISWAP LP DUCK-ETH',
      defaultOracleType: 4,
      poolTokens: ['0x92e187a03b6cd19cb6af293ba17f2745fd2357d5', '0xc02aaa39b223fe8d0a0e5c4f27ead9083c756cc2'],
      decimals: 18,
    },
    '0xbb2b8038a1640196fbe3e38816f3e67cba72d940': {
      symbol: 'UNISWAP LP WBTC-ETH',
      defaultOracleType: 4,
      poolTokens: ['0x2260fac5e5542a773aa44fbcfedf7c193bc2c599', '0xc02aaa39b223fe8d0a0e5c4f27ead9083c756cc2'],
      decimals: 18,
    },
    '0x87febfb3ac5791034fd5ef1a615e9d9627c2665d': {
      symbol: 'UNISWAP LP KP3R-ETH',
      defaultOracleType: 4,
      poolTokens: ['0x1ceb5cb57c4d4e2b2433641b95dd330a33185a44', '0xc02aaa39b223fe8d0a0e5c4f27ead9083c756cc2'],
      decimals: 18,
    },
    '0x3da1313ae46132a397d90d95b1424a9a7e3e0fce': {
      symbol: 'UNISWAP LP CRV-ETH',
      defaultOracleType: 4,
      poolTokens: ['0xd533a949740bb3306d119cc777fa900ba034cd52', '0xc02aaa39b223fe8d0a0e5c4f27ead9083c756cc2'],
      decimals: 18,
    },
    '0x3b3d4eefdc603b232907a7f3d0ed1eea5c62b5f7': {
      symbol: 'UNISWAP LP STAKE-ETH',
      defaultOracleType: 4,
      poolTokens: ['0x0ae055097c6d159879521c384f1d2123d1f195e6', '0xc02aaa39b223fe8d0a0e5c4f27ead9083c756cc2'],
      decimals: 18,
    },
    '0x2fdbadf3c4d5a8666bc06645b8358ab803996e28': {
      symbol: 'UNISWAP LP YFI-ETH',
      defaultOracleType: 4,
      poolTokens: ['0x0bc529c00c6401aef6d220be8c6ea1667f6ad93e', '0xc02aaa39b223fe8d0a0e5c4f27ead9083c756cc2'],
      decimals: 18,
    },
    '0xc2adda861f89bbb333c90c492cb837741916a225': {
      symbol: 'UNISWAP LP MKR-ETH',
      defaultOracleType: 4,
      poolTokens: ['0x9f8f72aa9304c8b593d555f12ef6589cc3a579a2', '0xc02aaa39b223fe8d0a0e5c4f27ead9083c756cc2'],
      decimals: 18,
    },
    '0x0d4a11d5eeaac28ec3f61d100daf4d40471f1852': {
      symbol: 'UNISWAP LP USDT-ETH',
      defaultOracleType: 4,
      poolTokens: ['0xdac17f958d2ee523a2206206994597c13d831ec7', '0xc02aaa39b223fe8d0a0e5c4f27ead9083c756cc2'],
      decimals: 18,
    },
    '0xb4e16d0168e52d35cacd2c6185b44281ec28c9dc': {
      symbol: 'UNISWAP LP USDC-ETH',
      defaultOracleType: 4,
      poolTokens: ['0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48', '0xc02aaa39b223fe8d0a0e5c4f27ead9083c756cc2'],
      decimals: 18,
    },
    '0xa478c2975ab1ea89e8196811f51a7b7ade33eb11': {
      symbol: 'UNISWAP LP DAI-ETH',
      defaultOracleType: 4,
      poolTokens: ['0x6b175474e89094c44da98b954eedeac495271d0f', '0xc02aaa39b223fe8d0a0e5c4f27ead9083c756cc2'],
      decimals: 18,
    },
    '0xd3d2e2692501a5c9ca623199d38826e513033a17': {
      symbol: 'UNISWAP LP UNI-ETH',
      defaultOracleType: 4,
      poolTokens: ['0x1f9840a85d5af5bf1d1762f925bdaddc4201f984', '0xc02aaa39b223fe8d0a0e5c4f27ead9083c756cc2'],
      decimals: 18,
    },
    '0xa2107fa5b38d9bbd2c461d6edf11b11a50f6b974': {
      symbol: 'UNISWAP LP LINK-ETH',
      defaultOracleType: 4,
      poolTokens: ['0x514910771af9ca656af840dff83e8264ecf986ca', '0xc02aaa39b223fe8d0a0e5c4f27ead9083c756cc2'],
      decimals: 18,
    },
    '0xdfc14d2af169b0d36c4eff567ada9b2e0cae044f': {
      symbol: 'UNISWAP LP AAVE-ETH',
      defaultOracleType: 4,
      poolTokens: ['0x7fc66500c84a76ad7e9c93437bfc5ac33e2ddae9', '0xc02aaa39b223fe8d0a0e5c4f27ead9083c756cc2'],
      decimals: 18,
    },
    '0x81fbef4704776cc5bba0a5df3a90056d2c6900b3': {
      symbol: 'UNISWAP LP renBTC-ETH',
      defaultOracleType: 4,
      poolTokens: ['0xeb4c2781e4eba804ce9a9803c67d0893436bb27d', '0xc02aaa39b223fe8d0a0e5c4f27ead9083c756cc2'],
      decimals: 18,
    },
    '0x43ae24960e5534731fc831386c07755a2dc33d47': {
      symbol: 'UNISWAP LP SNX-ETH',
      defaultOracleType: 4,
      poolTokens: ['0xc011a73ee8576fb46f5e1c5751ca3b9fe0af2a6f', '0xc02aaa39b223fe8d0a0e5c4f27ead9083c756cc2'],
      decimals: 18,
    },
    '0xcffdded873554f362ac02f8fb1f02e5ada10516f': {
      symbol: 'UNISWAP LP COMP-ETH',
      defaultOracleType: 4,
      poolTokens: ['0xc00e94cb662c3520282e6f5717214004a7f26888', '0xc02aaa39b223fe8d0a0e5c4f27ead9083c756cc2'],
      decimals: 18,
    },
    '0x88d97d199b9ed37c29d846d00d443de980832a22': {
      symbol: 'UNISWAP LP UMA-ETH',
      defaultOracleType: 4,
      poolTokens: ['0x04fa0d235c4abf4bcf4787af4cf447de572ef828', '0xc02aaa39b223fe8d0a0e5c4f27ead9083c756cc2'],
      decimals: 18,
    },
    '0x1273ad5d8f3596a7a39efdb5a4b8f82e8f003fc3': {
      symbol: 'UNISWAP LP HEGIC-ETH',
      defaultOracleType: 4,
      poolTokens: ['0x584bc13c7d411c00c01a62e8019472de68768430', '0xc02aaa39b223fe8d0a0e5c4f27ead9083c756cc2'],
      decimals: 18,
    },
    '0x795065dcc9f64b5614c407a6efdc400da6221fb0': {
      symbol: 'SUSHISWAP LP SUSHI-ETH',
      defaultOracleType: 8,
      poolTokens: ['0x6b3595068778dd592e39a122f4f5a5cf09c90fe2', '0xc02aaa39b223fe8d0a0e5c4f27ead9083c756cc2'],
      decimals: 18,
    },
    '0x001b6450083e531a5a7bf310bd2c1af4247e23d4': {
      symbol: 'SUSHISWAP LP UMA-ETH',
      defaultOracleType: 8,
      poolTokens: ['0x04fa0d235c4abf4bcf4787af4cf447de572ef828', '0xc02aaa39b223fe8d0a0e5c4f27ead9083c756cc2'],
      decimals: 18,
    },
    '0x06da0fd433c1a5d7a4faa01111c044910a184553': {
      symbol: 'SUSHISWAP LP USDT-ETH',
      defaultOracleType: 8,
      poolTokens: ['0xdac17f958d2ee523a2206206994597c13d831ec7', '0xc02aaa39b223fe8d0a0e5c4f27ead9083c756cc2'],
      decimals: 18,
    },
    '0x088ee5007c98a9677165d78dd2109ae4a3d04d0c': {
      symbol: 'SUSHISWAP LP YFI-ETH',
      defaultOracleType: 8,
      poolTokens: ['0x0bc529c00c6401aef6d220be8c6ea1667f6ad93e', '0xc02aaa39b223fe8d0a0e5c4f27ead9083c756cc2'],
      decimals: 18,
    },
    '0x31503dcb60119a812fee820bb7042752019f2355': {
      symbol: 'SUSHISWAP LP COMP-ETH',
      defaultOracleType: 8,
      poolTokens: ['0xc00e94cb662c3520282e6f5717214004a7f26888', '0xc02aaa39b223fe8d0a0e5c4f27ead9083c756cc2'],
      decimals: 18,
    },
    '0x397ff1542f962076d0bfe58ea045ffa2d347aca0': {
      symbol: 'SUSHISWAP LP USDC-ETH',
      defaultOracleType: 8,
      poolTokens: ['0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48', '0xc02aaa39b223fe8d0a0e5c4f27ead9083c756cc2'],
      decimals: 18,
    },
    '0x58dc5a51fe44589beb22e8ce67720b5bc5378009': {
      symbol: 'SUSHISWAP LP CRV-ETH',
      defaultOracleType: 8,
      poolTokens: ['0xd533a949740bb3306d119cc777fa900ba034cd52', '0xc02aaa39b223fe8d0a0e5c4f27ead9083c756cc2'],
      decimals: 18,
    },
    '0x611cde65dea90918c0078ac0400a72b0d25b9bb1': {
      symbol: 'SUSHISWAP LP REN-ETH',
      defaultOracleType: 8,
      poolTokens: ['0x408e41876cccdc0f92210600ef50372656052a38', '0xc02aaa39b223fe8d0a0e5c4f27ead9083c756cc2'],
      decimals: 18,
    },
    '0xa1d7b2d891e3a1f9ef4bbc5be20630c2feb1c470': {
      symbol: 'SUSHISWAP LP SNX-ETH',
      defaultOracleType: 8,
      poolTokens: ['0xc011a73ee8576fb46f5e1c5751ca3b9fe0af2a6f', '0xc02aaa39b223fe8d0a0e5c4f27ead9083c756cc2'],
      decimals: 18,
    },
    '0xa75f7c2f025f470355515482bde9efa8153536a8': {
      symbol: 'SUSHISWAP LP BAND-ETH',
      defaultOracleType: 8,
      poolTokens: ['0xba11d00c5f74255f56a5e366f4f77f5a186d7f55', '0xc02aaa39b223fe8d0a0e5c4f27ead9083c756cc2'],
      decimals: 18,
    },
    '0xc3d03e4f041fd4cd388c549ee2a29a9e5075882f': {
      symbol: 'SUSHISWAP LP DAI-ETH',
      defaultOracleType: 8,
      poolTokens: ['0x6b175474e89094c44da98b954eedeac495271d0f', '0xc02aaa39b223fe8d0a0e5c4f27ead9083c756cc2'],
      decimals: 18,
    },
    '0xc40d16476380e4037e6b1a2594caf6a6cc8da967': {
      symbol: 'SUSHISWAP LP LINK-ETH',
      defaultOracleType: 8,
      poolTokens: ['0x514910771af9ca656af840dff83e8264ecf986ca', '0xc02aaa39b223fe8d0a0e5c4f27ead9083c756cc2'],
      decimals: 18,
    },
    '0xceff51756c56ceffca006cd410b03ffc46dd3a58': {
      symbol: 'SUSHISWAP LP WBTC-ETH',
      defaultOracleType: 8,
      poolTokens: ['0x2260fac5e5542a773aa44fbcfedf7c193bc2c599', '0xc02aaa39b223fe8d0a0e5c4f27ead9083c756cc2'],
      decimals: 18,
    },
    '0xd75ea151a61d06868e31f8988d28dfe5e9df57b4': {
      symbol: 'SUSHISWAP LP AAVE-ETH',
      defaultOracleType: 8,
      poolTokens: ['0x7fc66500c84a76ad7e9c93437bfc5ac33e2ddae9', '0xc02aaa39b223fe8d0a0e5c4f27ead9083c756cc2'],
      decimals: 18,
    },
    '0xdafd66636e2561b0284edde37e42d192f2844d40': {
      symbol: 'SUSHISWAP LP UNI-ETH',
      defaultOracleType: 8,
      poolTokens: ['0x1f9840a85d5af5bf1d1762f925bdaddc4201f984', '0xc02aaa39b223fe8d0a0e5c4f27ead9083c756cc2'],
      decimals: 18,
    },
    '0x3472a5a71965499acd81997a54bba8d852c6e53d': {
      symbol: 'BADGER',
      defaultOracleType: 3,
      decimals: 18,
    },
    '0xc5bddf9843308380375a611c18b50fb9341f502a': {
      symbol: 'yveCRV-DAO',
      defaultOracleType: 7,
      decimals: 18,
      logoUrl: `${process.env.PUBLIC_URL}/images/ic-yveCrv-DAO.png`,
    },
    '0x10b47177e92ef9d5c6059055d92ddf6290848991': {
      symbol: 'SUSHISWAP LP yveCRV-DAO-ETH',
      defaultOracleType: 8,
      poolTokens: ['0xc5bddf9843308380375a611c18b50fb9341f502a', '0xc02aaa39b223fe8d0a0e5c4f27ead9083c756cc2'],
      decimals: 18,
    },
  },
}

const toLowerCase = (address) => address.toLowerCase()

Object.keys(collaterals).forEach(chainId => {
  Object.keys(collaterals[chainId]).forEach(
    assetAddress => {
      if (collaterals[chainId][assetAddress].poolTokens) {
        collaterals[chainId][assetAddress].poolTokens = collaterals[chainId][assetAddress].poolTokens.map(toLowerCase)
      }
      const fixed = toLowerCase(assetAddress)
      const broken = assetAddress !== fixed
      if (!broken) return
      collaterals[chainId][fixed] = { ...collaterals[chainId][broken] }
      delete collaterals[chainId][broken]
    }
  )
})

export function tokenByAddress(address, chainId = 1) {
  return collaterals[chainId][toLowerCase(address)]
}
