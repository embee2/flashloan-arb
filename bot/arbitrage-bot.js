require("dotenv").config();
const { ethers } = require("ethers");
const ArbABI = require("../artifacts/contracts/FlashloanArbitrage.sol/FlashloanArbitrage.json").abi;
const IRouterABI = require("@uniswap/v2-periphery/build/IUniswapV2Router02.json").abi;

const provider = new ethers.providers.JsonRpcProvider(process.env.POLYGON_RPC_URL);
const wallet   = new ethers.Wallet(process.env.PRIVATE_KEY, provider);

const flash   = new ethers.Contract(process.env.FLASH_CONTRACT, ArbABI, wallet);
const routerA = new ethers.Contract(process.env.QUICKSWAP_ROUTER, IRouterABI, provider);
const routerB = new ethers.Contract(process.env.SUSHISWAP_ROUTER, IRouterABI, provider);

const TOKEN = "0xYourTokenAddress";  // e.g. USDC
const WETH  = "0x7ceB23fD6bC0adD59E62ac25578270cFf1b9f619";

async function scanAndExecute() {
  const amountIn = ethers.utils.parseUnits("50000", 6);  // adjust decimals
  const pathA = [TOKEN, WETH];
  const pathB = [WETH, TOKEN];

  const outA = await routerA.getAmountsOut(amountIn, pathA).catch(() => ethers.BigNumber.from("0"));
  const outB = await routerB.getAmountsOut(outA[1], pathB).catch(() => ethers.BigNumber.from("0"));

  const fee = amountIn.mul(9).div(10000);
  if (outB.gt(amountIn.add(fee))) {
    console.log("Arb found! profit:", ethers.utils.formatUnits(outB.sub(amountIn).sub(fee), 6));
    const tx = await flash.executeFlashloan(
      TOKEN,
      amountIn,
      pathA,
      pathB,
      { gasLimit: 3_000_000 }
    );
    console.log("Sent tx:", tx.hash);
    await tx.wait();
    console.log("Arbitrage executed");
  } else {
    console.log("No opportunity:", ethers.utils.formatUnits(outB.sub(amountIn).sub(fee), 6));
  }
}

setInterval(scanAndExecute, 15_000);
