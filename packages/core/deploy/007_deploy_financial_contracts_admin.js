const func = async function (hre) {
  const { deployments, getNamedAccounts } = hre;
  const { deploy } = deployments;

  const { deployer } = await getNamedAccounts();

  await deploy("FinancialContractsAdmin", { from: deployer, log: true });
};
module.exports = func;
func.tags = ["FinancialContractsAdmin", "dvm"];
