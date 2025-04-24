require("dotenv").config();
require("@nomiclabs/hardhat-ethers");

const MUMBAI = process.env.MUMBAI_RPC_URL && process.env.MUMBAI_RPC_URL.trim();
const POLYGON = process.env.POLYGON_RPC_URL && process.env.POLYGON_RPC_URL.trim();

console.log("⛓️ Mumbai RPC URL:", MUMBAI);

module.exports = {
  solidity: "0.8.20",
  networks: {
    mumbai: {
      url: MUMBAI,
      accounts: process.env.PRIVATE_KEY ? [process.env.PRIVATE_KEY.trim()] : []
    },
    polygon: {
      url: POLYGON,
      accounts: process.env.PRIVATE_KEY ? [process.env.PRIVATE_KEY.trim()] : []
    }
  }
};
