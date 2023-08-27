// 🎉 Importing all the magic tools we need! 🧙‍♂️
import {
  convertToValidUserId,
  useConnector,
  useCreateFun,
  configureNewFunStore,
  MetamaskConnector,
  Goerli,
  usePrimaryAuth,
  useNetwork,
} from "@fun-xyz/react";
import { useEffect, useState } from "react";
import { Token, createSessionUser, ERC20_ABI } from "@fun-xyz/core";

// 🌟 Setting up our default FUN wallet configuration! 🎩✨
const DEFAULT_FUN_WALLET_CONFIG = {
  apiKey: "hnHevQR0y394nBprGrvNx4HgoZHUwMet5mXTOBhf",
  chain: Goerli,
  gasSponsor: {
    sponsorAddress: "0xCB5D0b4569A39C217c243a436AC3feEe5dFeb9Ad",
  }
};

// 🌐 Our trusty connectors! 🌍
const DEFAULT_CONNECTORS = [
  MetamaskConnector(),
];

// 🛠 Let's configure our FUN store! 🎊
configureNewFunStore({
  config: DEFAULT_FUN_WALLET_CONFIG,
  connectors: DEFAULT_CONNECTORS,
});

// 🖲 The button that lets us connect or disconnect! 🎮
const ConnectorButton = ({ index }) => {
  const { active, activate, deactivate, connectorName, connector } = useConnector({ index });

  return (<button
    onClick={() => {
      if (active) {
        deactivate(connector)
        return
      }
      activate(connector)
    }
    }>{active ? ("Unconnected") : ("Connect")} {connectorName} </button>)
}

// 💰 Our list of tokens! 🪙
const tokens = ["ETH", "USDC"]

// 🚀 Let's launch our app! 🌌
export default function App() {
  const { account: connectorAccount, active } = useConnector({ index: 0, autoConnect: true });
  const { account, initializeFunAccount, funWallet } = useCreateFun()
  const { Chain } = useNetwork({ chain: Goerli })

  // 🔄 Keeping track of our transaction states and balances! 📊
  const [txIds, setTxIds] = useState({})
  const [loadings, setLoadings] = useState({})
  const [balance, setBalance] = useState({})
  const [sessionKey, setSessionKey] = useState(null)

  // 🔐 Create our Session Key! ⏰



  // 🤖 Automatically fetch balances when things change! 🔄
  useEffect(() => {
    const getBalance = async () => {
      if (funWallet) {
        const walletAddr = await funWallet.getAddress()
        let out = { ...balance }
        await Promise.all(tokens.map(async (token) => {
          out[token] = await Token.getBalance(token, walletAddr)
        }))
        setBalance(out)
      }
    }
    getBalance()
  }, [txIds, funWallet])

  const [auth] = usePrimaryAuth()

  // 🎈 Initialize our FunWallet! 🎉
  const initializeSingleAuthFunAccount = async () => {
    initializeFunAccount({
      users: [{ userId: convertToValidUserId(connectorAccount) }],
      index: 214
    }).catch()
  }

  // 🔄 Swap that ETH for some USDC! 💱
  const swapEth = async () => {
    const op = await funWallet.swap(auth, await auth.getUserId(), { tokenIn: "eth", tokenOut: "usdc", inAmount: 0.001 })
    setLoadings({ ...loadings, swap: true }) // 🕒 Loading time!
    const receipt = await funWallet.executeOperation(auth, op)
    setTxIds({ ...txIds, swap: receipt.txId })
    setLoadings({ ...loadings, swap: false }) // 🎉 Done swapping!
  }

  // 🚀 Let's transfer some ETH! 💸
  const createSessionKey = async () => {
    // 1 hour from now
    const deadline = Date.now() + 60 * 60 * 1000
    const tokenAddress = await Token.getAddress("usdc")
    const sessionKeyAuth = createSessionUser()
    const sessionKeyParams = {
      // which addresses we want the session key to be able to interact with
      targetWhitelist: [tokenAddress],
      // which functions we want the session key to be able to interact with
      actionWhitelist: [{
        abi: ERC20_ABI,
        functionWhitelist: ["transfer"]
      }],
      // the deadline when we want the session key to be deactivated
      deadline,

      user: sessionKeyAuth,
    }
    const op = await funWallet.createSessionKey(auth, await auth.getUserId(), sessionKeyParams)
    setLoadings({ ...loadings, transfer: true }) // 🕒 Loading time!
    const receipt = await funWallet.executeOperation(auth, op)
    setSessionKey(sessionKeyAuth)
    setTxIds({ ...txIds, transfer: receipt.txId })
    setLoadings({ ...loadings, transfer: false }) // 🎉 Done transferring!
  }

  // 🌱 Time to stake some ETH! 🌳
  const transferUsdcWithSessionKey = async () => {
    if (!sessionKey) {
      throw new Error("Session Key was not created!")
    }
    const op = await funWallet.transfer(sessionKey, await sessionKey.getUserId(), { amount: 10, to: await auth.getAddress(), token: "usdc" })
    setLoadings({ ...loadings, transferUsdcWithSessionKey: true }) // 🕒 Loading time!
    const receipt = await funWallet.executeOperation(auth, op)
    setTxIds({ ...txIds, transferUsdcWithSessionKey: receipt.txId })
    setLoadings({ ...loadings, transferUsdcWithSessionKey: false }) // 🎉 Done staking!
  }

  // 💧 Prefund your FunWallet! 🌧
  const prefundFunWallet = async () => {
    setLoadings({ ...loadings, prefund: true }) // 🕒 Loading time!
    const { txHash } = await fetch(`https://api.fun.xyz/demo-faucet/get-faucet?token=eth&testnet=goerli&addr=${await funWallet.getAddress()}`).then(res => res.json())
    const client = await Chain.getClient()
    await client.waitForTransactionReceipt({ hash: txHash })
    setTxIds({ ...txIds, prefund: txHash })
    setLoadings({ ...loadings, prefund: false }) // 🎉 Done prefunding!
  }

  return (
    <div className="App">
      <h1>Create and Use a Session Key with a FunWallet</h1>
      1. Connect Metamask.
      <ConnectorButton key={0} index={0} ></ConnectorButton>
      {
        active ?
          <div>
            Success! Metamask Connected!
          </div>
          : <></>
      }
      <br></br>
      <br></br>

      2. Initialize the FunWallet and Auth object.
      <button onClick={initializeSingleAuthFunAccount}>Initialize FunWallet</button>
      {account ?
        <div>
          Success! FunWallet Address: {account}
        </div>
        : <></>
      }
      <br></br>
      <br></br>

      3. Add test ETH to the FunWallet.
      <button onClick={prefundFunWallet} >Add Funds</button>
      {loadings.prefund ?
        <div>
          Loading...
        </div>
        : <></>
      }
      {txIds.prefund ?
        <div>
          Success! View on <a href={`https://goerli.etherscan.io/tx/${txIds.prefund}`} target="_blank" rel="noreferrer"> block explorer. </a>
        </div>
        : <></>
      }
      <br></br>
      <br></br>
      {funWallet && <>Wallet balance: {tokens.map(token => (<div key={token}>&emsp;{balance[token] ?? 0} {token} < br /></div>))}   <br></br>
        <br></br></>}

      4. Swap 0.001 ETH to USDC with a FunWallet.<button onClick={swapEth} >Swap</button>
      {loadings.swap &&
        <div>
          Loading...
        </div>
      }
      {txIds.swap ?
        <div>
          Success! View on <a href={`https://goerli.etherscan.io/tx/${txIds.swap}`} target="_blank" rel="noreferrer"> block explorer. </a>
        </div>
        : <></>
      }
      <br></br>
      <br></br>

      5. Create Session Key.<button onClick={createSessionKey}>Create</button>
      {loadings.transfer ?
        <div>
          Loading...
        </div>
        : <></>
      }
      {txIds.transfer ?
        <div>
          Success! View on <a href={`https://goerli.etherscan.io/tx/${txIds.transfer}`} target="_blank" rel="noreferrer"> block explorer. </a>
        </div>
        : <></>
      }
      <br></br>
      <br></br>

      6. Transfer 10 USDC with a FunWallet and Session Key.<button onClick={transferUsdcWithSessionKey} >Transfer </button>
      {loadings.transferUsdcWithSessionKey ?
        <div>
          Loading...
        </div>
        : <></>
      }
      {txIds.transferUsdcWithSessionKey ?
        <div>
          Success! View on <a href={`https://goerli.etherscan.io/tx/${txIds.transferUsdcWithSessionKey}`} target="_blank" rel="noreferrer"> block explorer. </a>
        </div>
        : <></>
      }
    </div >
  );


}