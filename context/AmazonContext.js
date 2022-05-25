import { createContext, useEffect, useState } from "react";
import { useMoralis, useMoralisQuery } from "react-moralis";
import { amazonAbi, amazonCoinAddress } from '../lib/constants'
import { ethers } from 'ethers'

export const AmazonContext = createContext()

export const AmazonProvider = ({ children }) => {
  const [nickname, setNickname] = useState('')
  const [username, setUsername] = useState('')
  const [assets, setAssets] = useState([])
  const [currentAccount, setCurrentAccount] = useState('')
  const [formattedAccount, setFormattedAccount] = useState('')
  const [balance, setBalance] = useState('')
  const [tokenAmount, setTokenAmount] = useState('')
  const [amountDue, setAmountDue] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [etherscanLink, setEtherscanLink] = useState('')
  const [recentTransactions, setRecentTransactions] = useState([])
  const [ownedItems, setOwnedItems] = useState([])

  const {
    authenticate,
    isAuthenticated,
    enableWeb3,
    Moralis,
    user,
    ethtransactions,
    isWeb3Enabled,
  } = useMoralis()

  const {
    data: userData,
    error: userDataError,
    isLoading: userDataIsLoading,
  } = useMoralisQuery('_User')

  const {
    data: assetsData,
    error: assetsDataError,
    isLoading: assetsDataIsLoading,
  } = useMoralisQuery('Assets')

  // let Parse = require('parse/node');
  // let LiveQueryClient = Parse.LiveQueryClient;
  // let client = new LiveQueryClient({
  //   applicationId: '',
  //   serverURL: '',
  //   javascriptKey: '',
  //   masterKey: ''
  //  });

  useEffect(() => {
    ; (async () => {
      await enableWeb3()
      await getAssets()
      await getOwnedAssets()

    })()
  }, [userData, assetsData, assetsDataIsLoading, userDataIsLoading])


  useEffect(() => {
    ; (async () => {
      if (!isWeb3Enabled) {
        await enableWeb3()
      }
      await listenToUpdates()

      if (isAuthenticated) {
        await getBalance()
        const currentUsername = await user?.get('nickname')
        setUsername(currentUsername)
        const account = await user?.get('ethAddress')
        setCurrentAccount(account)
        const formatAccount = account.slice(0, 2) + '...' + account.slice(-2)
        setFormattedAccount(formatAccount)
      } else {
        setCurrentAccount('')
        setFormattedAccount('')
        setBalance('')
      }

    })()
  }, [isWeb3Enabled,
    isAuthenticated,
    balance,
    setBalance,
    authenticate,
    currentAccount,
    setUsername,
    user,
    username,])



  const connectWallet = async () => {
    await enableWeb3()
    await authenticate()
  }

  const buyTokens = async () => {
    if (!isAuthenticated) {
      await connectWallet()
    }

    const amount = ethers.BigNumber.from(tokenAmount)
    //wei to 1AC -- 0. 0001 eth
    const price = ethers.BigNumber.from('100000000000000')
    const calcPrice = amount.mul(price)

    // console.log(amazonCoinAddress)

    let options = {
      contractAddress: amazonCoinAddress,
      functionName: 'mint',
      abi: amazonAbi,
      msgValue: calcPrice,
      params: {
        amount,
      },
    }
    const transaction = await Moralis.executeFunction(options)
    const receipt = await transaction.wait()
    setIsLoading(false)

    console.log(receipt)
    setEtherscanLink(
      `https://ropsten.etherscan.io/tx/${receipt.transactionHash}`,
    )
  }

  const handleSetUsername = () => {
    if (user) {
      if (nickname) {
        user.set('nickname', nickname)
        user.save()
        setNickname('')
      } else {
        console.log("Can't set empty nickname")
      }
    } else {
      console.log('No user')
    }

  }
  // Moralis.initialize("2CKrWmzQxrRvl9ka31zPBYMjLTKNAcYgin9K9OLp");
  // Moralis.serverURL="https://zicud1qlgayx.usemoralis.com:2053/server";

  const listenToUpdates = async () => {
    let query = new Moralis.Query("TransferTransactions")
    let subscription = await query.subscribe()
    subscription.on('update', async object => {
      console.log("Transaction created");
      console.log(object);
      setRecentTransactions([object])
    });

  }

  const getBalance = async () => {
    try {
      if (!isAuthenticated || !currentAccount) return
      const options = {
        contractAddress: amazonCoinAddress,
        functionName: 'balanceOf',
        abi: amazonAbi,
        params: {
          account: currentAccount,
        },
      }

      if (isWeb3Enabled) {
        const response = await Moralis.executeFunction(options)
        // console.log(response.toString())
        setBalance(response.toString())
      }
    } catch (error) {
      // console.log(error)
    }
  }

  const getAssets = async () => {
    try {
      await enableWeb3()
      const query = new Moralis.Query('Assets')
      query.equalTo("Deleted", false);
      const results = await query.find()
      // console.log(results)
      setAssets(results)

    } catch (error) {
      console.log(error)
    }


  }

  const buyAsset = async (price, asset) => {
    try {
      if (!isAuthenticated) return
      // console.log('price: ', price)
      // console.log('asset: ', asset.name)
      // console.log(userData)

      const options = {
        type: 'erc20',
        amount: price,
        receiver: amazonCoinAddress,
        contractAddress: amazonCoinAddress,
      }

      let transaction = await Moralis.transfer(options)

      const receipt = await transaction.wait()
      if (receipt) {
        //You can do this but it's not necessary with Moralis hooks!
        const query = new Moralis.Query('_User')
        const results = await query.find()

        const res = results[0].add('ownedAsset', {
          ...asset,
          purchaseDate: Date.now(),
          etherscanLink: `https://ropsten.etherscan.io/tx/${receipt.transactionHash}`,
        })


        const query2 = new Moralis.Query('Assets')
        query2.equalTo("name", asset.name);
        const item = await query2.first();
        if (item) {
          item.set("Deleted", true);
          await item.save();
        }
        await res.save().then(() => {
          alert("You've successfully purchased this asset!")
        })

      }
    } catch (error) {
      console.log(error.message)
    }
  }

  const getOwnedAssets = async () => {
    try {
      let query = new Moralis.Query('_User')
      let results = await query.find()

      if (userData[0].attributes.ownedAsset) {
        setOwnedItems(prevItems => [
          ...prevItems,
          userData[0].attributes.ownedAsset,
        ])
      }
    } catch (error) {
      console.log(error)
    }
  }

  return (
    <AmazonContext.Provider
      value={{
        formattedAccount,
        isAuthenticated,
        buyTokens,
        getBalance,
        balance,
        setTokenAmount,
        tokenAmount,
        amountDue,
        setAmountDue,
        isLoading,
        setIsLoading,
        setEtherscanLink,
        etherscanLink,
        buyAsset,
        currentAccount,
        nickname,
        setNickname,
        username,
        setUsername,
        handleSetUsername,
        assets,
        recentTransactions,
        ownedItems,
      }}
    >
      {children}
    </AmazonContext.Provider>
  )
}
