import "@nomicfoundation/hardhat-toolbox";
import * as dotenv from "dotenv";

dotenv.config(); // Load environment variables from .env

const PRIVATE_KEY = process.env.PRIVATE_KEY || "";
const ETHERSCAN_API_KEY = process.env.ETHERSCAN_API_KEY || "";

const config = {
  solidity: {
    version: "0.8.28",
    settings: {
      optimizer: {
        enabled: true,
        runs: 200,
      },
    },
  },
  paths: {
    sources: "./contracts",
    tests: "./test",
    cache: "./cache",
    artifacts: "./artifacts",
  },
  mocha: {
    timeout: 40000,
  },
  defaultNetwork: "hardhat",
  networks: {
    hardhat: {
      chainId: 1337,
    },
    sepolia: {
      url: "https://sepolia.drpc.org",
      accounts: PRIVATE_KEY ? [PRIVATE_KEY] : [],
    },
    bnb: {
      url: "https://bsc-dataseed.binance.org/",
      accounts: PRIVATE_KEY ? [PRIVATE_KEY] : [],
    },
    polygon: {
      url: "https://polygon-rpc.com/",
      accounts: PRIVATE_KEY ? [PRIVATE_KEY] : [],
    },
    arbitrum: {
      url: "https://arb1.arbitrum.io/rpc",
      accounts: PRIVATE_KEY ? [PRIVATE_KEY] : [],
    },
    optimism: {
      url: "https://mainnet.optimism.io",
      accounts: PRIVATE_KEY ? [PRIVATE_KEY] : [],
    },
    fantom: {
      url: "https://rpcapi.fantom.network",
      accounts: PRIVATE_KEY ? [PRIVATE_KEY] : [],
    },
    xdai: {
      url: "https://rpc.xdaichain.com/",
      accounts: PRIVATE_KEY ? [PRIVATE_KEY] : [],
    },
    heco: {
      url: "https://http-mainnet.hecochain.com",
      accounts: PRIVATE_KEY ? [PRIVATE_KEY] : [],
    },
    avalanche: {
      url: "https://api.avax.network/ext/bc/C/rpc",
      accounts: PRIVATE_KEY ? [PRIVATE_KEY] : [],
    },
    celo: {
      url: "https://forno.celo.org",
      accounts: PRIVATE_KEY ? [PRIVATE_KEY] : [],
    },
    moonriver: {
      url: "https://rpc.moonriver.moonbeam.network",
      accounts: PRIVATE_KEY ? [PRIVATE_KEY] : [],
    },
    harmony: {
      url: "https://api.harmony.one",
      accounts: PRIVATE_KEY ? [PRIVATE_KEY] : [],
    },
    optimismkovan: {
      url: "https://kovan.optimism.io",
      accounts: PRIVATE_KEY ? [PRIVATE_KEY] : [],
    },
    arbitrumkovan: {
      url: "https://kovan3.arbitrum.io/rpc",
      accounts: PRIVATE_KEY ? [PRIVATE_KEY] : [],
    },
    fantomtestnet: {
      url: "https://rpc.testnet.fantom.network",
      accounts: PRIVATE_KEY ? [PRIVATE_KEY] : [],
    },
    xdaitestnet: {
      url: "https://rpc.xdaichain.com/",
      accounts: PRIVATE_KEY ? [PRIVATE_KEY] : [],
    },
    hecotestnet: {
      url: "https://http-testnet.hecochain.com",
      accounts: PRIVATE_KEY ? [PRIVATE_KEY] : [],
    },
    avalanchefuji: {
      url: "https://api.avax-test.network/ext/bc/C/rpc",
      accounts: PRIVATE_KEY ? [PRIVATE_KEY] : [],
    },
    celotestnet: {
      url: "https://alfajores-forno.celo-testnet.org",
      accounts: PRIVATE_KEY ? [PRIVATE_KEY] : [],
    },
    harmonytestnet: {
      url: "https://api.s0.b.hmny.io",
      accounts: PRIVATE_KEY ? [PRIVATE_KEY] : [],
    },
    moonbeamtestnet: {
      url: "https://rpc.testnet.moonbeam.network",
      accounts: PRIVATE_KEY ? [PRIVATE_KEY] : [],
    },
    vsgtestnet: {
      url: "https://testnet-rpc.vsgofficial.com",
      accounts: PRIVATE_KEY ? [PRIVATE_KEY] : [],
    },
  },
  ignition: {},
  etherscan: {
    apiKey: ETHERSCAN_API_KEY,
  },
};

export default config;
