require("@nomicfoundation/hardhat-toolbox");
require("@nomicfoundation/hardhat-chai-matchers");
require("dotenv").config();

/** @type import('hardhat/config').HardhatUserConfig */
module.exports = {
  solidity: "0.8.17",
  networks: {
    goerli: {
      url: process.env.GOERLI_URL,
      accounts: [
        `0x${process.env.GOERLI_PRIVATE_KEY_ONE}`,
        `0x${process.env.GOERLI_PRIVATE_KEY_TWO}`,
      ],
    },
  },
};
