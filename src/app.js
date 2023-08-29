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
} from "@funkit/react";
import { useEffect, useState } from "react";
import { Token, createSessionUser, ERC20_ABI, sendGetRequest } from "@funkit/core";

// Setting up our default fun wallet configuration
const DEFAULT_FUN_WALLET_CONFIG = {
  apiKey: "hnHevQR0y394nBprGrvNx4HgoZHUwMet5mXTOBhf",
  chain: Goerli,
  gasSponsor: {
    sponsorAddress: "0xCB5D0b4569A39C217c243a436AC3feEe5dFeb9Ad",
  }
};

// Setting up our default connectors
const DEFAULT_CONNECTORS = [
  MetamaskConnector(),
];

// Configuring our FunStore
configureNewFunStore({
  config: DEFAULT_FUN_WALLET_CONFIG,
  connectors: DEFAULT_CONNECTORS,
});

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

// Our list of tokens
const tokens = ["ETH", "USDC"]

export default function App() {
  const { account: connectorAccount, active } = useConnector({ index: 0, autoConnect: true });
  const { account, initializeFunAccount, funWallet } = useCreateFun()
  const { Chain } = useNetwork({ chain: Goerli })

  // Keeping track of our transaction states and balances
  const [txIds, setTxIds] = useState({})
  const [loadings, setLoadings] = useState({})
  const [balance, setBalance] = useState({})
  const [sessionKey, setSessionKey] = useState(null)

  // Automatically fetch balances when things change
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

  // Initialize our FunWallet 
  const initializeSingleAuthFunAccount = async () => {
    if (!connectorAccount) {
      console.log("Please connect your wallet first!")
      return;
    }
    initializeFunAccount({
      users: [{ userId: convertToValidUserId(connectorAccount) }],
      index: 214
    }).catch()
  }

  // Swap ETH for USDC
  const swapEth = async () => {
    if (!funWallet) {
      console.log("Please connect your wallet first!")
      return;
    }
    const op = await funWallet.swap(auth, await auth.getUserId(), { tokenIn: "eth", tokenOut: "usdc", inAmount: 0.001 })
    setLoadings({ ...loadings, swap: true })
    const receipt = await funWallet.executeOperation(auth, op)
    setLoadings({ ...loadings, swap: false })
    setTxIds({ ...txIds, swap: receipt.txId })
  }

  // Create a session key
  const createSessionKey = async () => {
    if (!funWallet) {
      console.log("Please connect your wallet first!")
      return;
    }
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
    setLoadings({ ...loadings, transfer: true })
    const receipt = await funWallet.executeOperation(auth, op)
    setSessionKey(sessionKeyAuth)
    setLoadings({ ...loadings, transfer: false })
    setTxIds({ ...txIds, transfer: receipt.txId })
  }

  // Transfer some USDC
  const transferUsdcWithSessionKey = async () => {
    if (!funWallet) {
      console.log("Please connect your wallet first!")
      return;
    }
    if (!sessionKey) {
      throw new Error("Session Key was not created!")
    }
    const op = await funWallet.transfer(sessionKey, await sessionKey.getUserId(), { amount: 10, to: await auth.getAddress(), token: "usdc" })
    setLoadings({ ...loadings, transferUsdcWithSessionKey: true })
    const receipt = await funWallet.executeOperation(auth, op)
    setLoadings({ ...loadings, transferUsdcWithSessionKey: false })
    setTxIds({ ...txIds, transferUsdcWithSessionKey: receipt.txId })
  }

  // Prefund your FunWallet
  const prefundFunWallet = async () => {
    if (!funWallet) {
      console.log("Please connect your wallet first!")
      return;
    }
    setLoadings({ ...loadings, prefund: true })
    const { txHash } = await sendGetRequest("https://api.fun.xyz", `demo-faucet/get-faucet?token=eth&testnet=goerli&addr=${await funWallet.getAddress()}`, DEFAULT_FUN_WALLET_CONFIG.apiKey)
    const client = await Chain.getClient()
    await client.waitForTransactionReceipt({ hash: txHash })
    setLoadings({ ...loadings, prefund: false })
    setTxIds({ ...txIds, prefund: txHash })
  }

  return (
    <div className="App">
      <h1>Create and Use a Session Key with a FunWallet</h1>
      1. &ensp;<ConnectorButton key={0} index={0} ></ConnectorButton>
      {
        active ?
          <div>
            Success! Metamask Connected!
          </div>
          : <></>
      }
      <br></br>
      <br></br>

      2. &ensp;<button onClick={initializeSingleAuthFunAccount}> Initialize the FunWallet and Auth object.</button>
      {account ?
        <div>
          Success! FunWallet Address: {account}
        </div>
        : <></>
      }
      <br></br>
      <br></br>

      3. &ensp;<button onClick={prefundFunWallet} >Add test ETH to the FunWallet.</button>
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

      4 .&ensp;<button onClick={swapEth} >Swap 0.001 ETH to USDC with a FunWallet.</button>
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

      5. &ensp;<button onClick={createSessionKey}>Create Session Key.</button>
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

      6. &ensp;<button onClick={transferUsdcWithSessionKey} >Transfer 10 USDC with a FunWallet and Session Key. </button>
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