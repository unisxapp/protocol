require('dotenv').config();
// Default source oracle chain ID is 1, corresponding to the mainnet network.
const SOURCE_ORACLE_CHAIN_ID = process.env.SOURCE_ORACLE_CHAIN_ID || 1;

const func = async function(hre) {
    const { deployments, getNamedAccounts, getChainId } = hre;
    const { deploy } = deployments;
  
    const { deployer } = await getNamedAccounts();

    const chainId = await getChainId()
    const Finder = await deployments.get("Finder");

    const args = [
        Finder.address,
        chainId, // Current chain ID.
        SOURCE_ORACLE_CHAIN_ID // Chain ID where SourceOracle is located that this SinkOracle will make price requests to.
    ]
    await deploy("SinkOracle", {
      from: deployer,
      args,
      log: true
    });
  };
  module.exports = func;
  func.tags = ["SinkOracle"];
  func.dependencies = ['Finder']; 
