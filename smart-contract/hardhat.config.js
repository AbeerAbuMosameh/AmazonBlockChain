require('@nomiclabs/hardhat-waffle')

task('accounts', 'Prints the list of accounts', async (taskArgs, hre) => {
  const accounts = await hre.ethers.getSigners()

  for (const account of accounts) {
    console.log(account.address)
  }
})
module.exports = {
  solidity: "0.8.0",
  networks: {
    ropsten: {
      url: `https://speedy-nodes-nyc.moralis.io/b565eaae686ea9ec32eee925/eth/ropsten/archive`,
      accounts: [`9385023bf865c4a664b184d0bb15b93fef90536f3e97520cc2b7ba8f2b17000a`]
    }
  }
};