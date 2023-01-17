const { ethers } = require("hardhat");
const { assert, expect } = require("chai");
const contractAddresses = require("../constants/contractAddresses.json");
const tokenArtifacts = require("../artifacts/contracts/MyToken.sol/MyToken.json");
const governorArtifacts = require("../artifacts/contracts/MyGovernor.sol/MyGovernor.json");
const { mine } = require("@nomicfoundation/hardhat-network-helpers");

describe("interacting with votingToken and Governor", function () {
  let tokenContract, governorContract, ownerSigner, ownerAddress;
  let balanceOwner;
  let chainId;
  let proposalId;
  let target, values, calldata, description;
  before("instantiate contracts and signer", async function () {
    let network = await ethers.provider.getNetwork();
    chainId = network.chainId;
    ownerSigner = ethers.provider.getSigner();
    ownerAddress = await ownerSigner.getAddress();
    tokenContract = new ethers.Contract(
      contractAddresses.tokenContract[`${chainId}`],
      tokenArtifacts.abi,
      ownerSigner
    );
    governorContract = new ethers.Contract(
      contractAddresses.governorContract[`${chainId}`],
      governorArtifacts.abi,
      ownerSigner
    );
  });
  it("should obtain balance owner and contract addresses", async function () {
    balanceOwner = await tokenContract.balanceOf(ownerAddress);
    console.log(
      "ethers.utils.formatEther(balanceOwner):",
      ethers.utils.formatEther(balanceOwner)
    );
    assert(
      ethers.utils.formatEther(balanceOwner) != null,
      "correct balance not retrieved, something is wrong"
    );
    assert(
      tokenContract.address === contractAddresses.tokenContract[`${chainId}`],
      "token contract address incorrect"
    );
    assert(
      governorContract.address ===
        contractAddresses.governorContract[`${chainId}`],
      "governor contract address incorrect"
    );
  });

  describe("testing token.delegate function", function () {
    it("should delegate 10000 votes to the owner", async function () {
      let votesOwner;
      try {
        const tx = await tokenContract.delegate(ownerAddress);
        await tx.wait();
        votesOwner = await tokenContract.getVotes(ownerAddress);
        console.log("");
      } catch (error) {
        console.log(error);
      }
      assert(
        Number(ethers.utils.formatEther(votesOwner)) ===
          Number(ethers.utils.formatEther(balanceOwner)),
        "votes owner incorrect"
      );
    });
  });
  describe("testing governor.propose() function", function () {
    it("should submit a proposal", async function () {
      let proposalState;
      try {
        target = [tokenContract.address];
        values = [0];
        calldata = [
          tokenContract.interface.encodeFunctionData("mint", [
            ownerAddress,
            ethers.utils.parseEther("15000"),
          ]),
        ];
        description = "Mint 15000 to owner";
        tx = await governorContract.propose(
          target,
          values,
          calldata,
          description
        );
        const receipt = await tx.wait();
        proposalId = receipt.events.find((x) => x.event === "ProposalCreated")
          .args[0];
        proposalState = await governorContract.state(
          ethers.BigNumber.from(proposalId)
        );
      } catch (error) {
        console.log(error);
      }
      assert(proposalState === 0);
    });
  });
  describe("testing castVote() function", function () {
    const support = 1;
    it("should revert if vote cast before expiry initial voting period", async function () {
      await expect(
        governorContract.castVote(proposalId, support)
      ).to.be.revertedWith("Governor: vote not currently active");
    });
    it("should caste the owner's votes if cast after initial expiry period", async function () {
      try {
        await mine(11);
      } catch (error) {
        console.log(error);
      }
      await expect(governorContract.castVote(proposalId, support))
        .to.emit(governorContract, "VoteCast")
        .withArgs(
          ownerAddress,
          proposalId,
          support,
          ethers.utils.parseEther("10000"),
          ""
        );
    });
  });
  describe("testing governor.execute() function", function () {
    it("should revert if execution is attempted before expiry of voting period", async function () {
      await expect(
        governorContract.execute(
          target,
          values,
          calldata,
          ethers.utils.keccak256(ethers.utils.toUtf8Bytes(description))
        )
      ).to.be.revertedWith("Governor: proposal not successful");
    });
    it("should execute the proposal after expiry of voting period", async function () {
      await mine(21);
      await expect(
        governorContract.execute(
          target,
          values,
          calldata,
          ethers.utils.keccak256(ethers.utils.toUtf8Bytes(description))
        )
      )
        .to.emit(governorContract, "ProposalExecuted")
        .withArgs(proposalId);
    });
  });
});
