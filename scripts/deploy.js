const { ethers } = require("hardhat");
const fs = require("fs");
let storedContractAddresses =
  require("../constants/contractAddresses.json") || {};

async function main() {
  const ownerSigner = ethers.provider.getSigner();
  const ownerAddress = await ownerSigner.getAddress();
  const transactionCount = await ownerSigner.getTransactionCount();

  // gets the address of the token before it is deployed
  const futureAddress = ethers.utils.getContractAddress({
    from: ownerAddress,
    nonce: transactionCount + 1,
  });

  const MyGovernor = await ethers.getContractFactory("MyGovernor");
  const governor = await MyGovernor.deploy(futureAddress);

  const MyToken = await ethers.getContractFactory("MyToken");
  const token = await MyToken.deploy(governor.address);

  console.log(
    `Governor deployed to ${governor.address}`,
    `Token deployed to ${token.address}`
  );

  const { chainId } = await ethers.provider.getNetwork();

  let contractAddresses = {
    ...storedContractAddresses,
    tokenContract: storedContractAddresses.tokenContract || {},
    governorContract: storedContractAddresses.governorContract || {},
    tokenContract: {
      ...storedContractAddresses.tokenContract,
      [`${chainId}`]: token.address,
    },
    governorContract: {
      ...storedContractAddresses.governorContract,
      [`${chainId}`]: governor.address,
    },
  };

  fs.writeFileSync(
    "./constants/contractAddresses.json",
    JSON.stringify(contractAddresses),
    "utf-8"
  );
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
