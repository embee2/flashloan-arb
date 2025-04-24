require("@nomiclabs/hardhat-ethers");
require("dotenv").config();

async function main() {
  const Flash = await ethers.getContractFactory("FlashloanArbitrage");
  const flash = await Flash.deploy(
    process.env.AAVE_PROVIDER,
    process.env.QUICKSWAP_ROUTER,
    process.env.SUSHISWAP_ROUTER
  );
  await flash.deployed();
  console.log("Deployed to:", flash.address);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
