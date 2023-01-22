// Standard Next and CSS imports
import Head from 'next/head'
import styles from '@/styles/Home.module.css'
import { useRouter } from "next/router";
import { useState, useEffect, Fragment } from "react";
import { ethers } from 'ethers';

// Imports from the constants.js file
import { username, password, contractAddress } from "@/data/constants";

// Wagmi import for coinbase wallet
import { useAccount } from "wagmi";

// Contract ABI
import contract from '@/contracts/QuizRewards.json';

// Extract ABI from the ABI JSON file
const abi = contract.abi;

export default function Home() {

  // Next router hook
  const router = useRouter();

  // Get connected wallet address and connection status
  const { address, isConnected } = useAccount();

  // Page mounting info to prevent hydration errors
  const [hasMounted, setHasMounted] = useState(false);

  // Variable that holds all collections
  const [collections, setCollections] = useState([]);

  // Variable that holds the correct answer
  const [answer, setAnswer] = useState(null);
  const [image, setImage] = useState(null);

  // Player guess
  const [guess, setGuess] = useState(null);

  // Game State
  const [gameState, setGameState] = useState('current');

  // Mounting fix to avoid hydration errors
  useEffect(() => {
    setHasMounted(true)
  }, []);

  // Get 20 collections at random
  useEffect(() => {

    let headers = new Headers();
    headers.append('Content-Type', 'application/json');
    headers.set('Authorization', 'Basic ' + Buffer.from(username + ":" + password).toString('base64'));

    const options = { method: 'GET', headers: headers };

    const fetchUrl = `https://mainnet.ethereum.coinbasecloud.net/api/nft/v2/contracts?networkName=ethereum-mainnet&pageSize=20&page=2`

    fetch(fetchUrl, options)
      .then(response => response.json())
      .then(response => setCollections(response.collectionList))
      .catch(err => console.error(err));
  }, [])

  // Choose a collection for an answer
  useEffect(() => {
    if (collections.length === 0) return;
    if (answer !== null) return;

    // Choose a random collection
    let idx = Math.floor(Math.random() * 10);
    let chosen = collections[idx];
    setAnswer(chosen);

  }, [collections])

  // Get a sample NFT from the answer collection
  useEffect(() => {

    if (answer === null) return;

    let addr = answer.contractAddress;

    let headers = new Headers();
    headers.append('Content-Type', 'application/json');
    headers.set('Authorization', 'Basic ' + Buffer.from(username + ":" + password).toString('base64'));

    const options = { method: 'GET', headers: headers };

    const fetchUrl = `https://mainnet.ethereum.coinbasecloud.net/api/nft/v2/contracts/${addr}/tokens?networkName=ethereum-mainnet&pageSize=1`;

    fetch(fetchUrl, options)
      .then(response => response.json())
      //.then(console.log)
      .then(response => setImage(response.tokenList[0].imageUrl.cachedPath))
      .catch(err => console.error(err));

  }, [answer])

  // Do not render until entire UI is mounted  
  if (!hasMounted) return null;

  // Redirect to Connect page if Coinbase wallet not connected
  if (!isConnected) {
    router.replace('/connect');
  }

  // Form handlers
  const guessHandler = (e) => {
    setGuess(e.target.value);
  }

  const formHandler = (e) => {

    e.preventDefault();
    if (guess === answer.collectionName) {
      setGameState('success');
    } else {
      setGameState('fail');
    }
  }


  // Function that mints rewards
  const mintHandler = async (e) => {

    // Call the mint function from connected wallet
    try {
      const { ethereum } = window;

      if (ethereum) {
        const provider = new ethers.providers.Web3Provider(ethereum);
        const signer = provider.getSigner();
        const nftContract = new ethers.Contract(contractAddress, abi, signer);

        console.log("Initialize payment");
        let nftTxn = await nftContract.mintReward(guess);

        console.log("Mining... please wait");
        await nftTxn.wait();

        console.log(`Mined, see transaction: https://goerli.etherscan.io/tx/${nftTxn.hash}`);
        setGameState('minted');

      } else {
        console.log("Ethereum object does not exist");
      }

    } catch (err) {
      console.log(err);
    }
  }

  return (
    <Fragment>

      <Head>
        <title>The Coinbase Quiz Game</title>
        <meta name="description" content="A simple NFT based game" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <link rel="icon" href="/favicon.ico" />
      </Head>

      <main className={styles.main}>
        <h1>The Coinbase Quiz Game</h1>
        <h2>Guess which collection this artwork belongs to!</h2>
        <br />

        {image && <img className={styles.ques} src={image} />}
        {/* {answer && <p>{answer.collectionName}</p>} */}

        {gameState === 'current' && <form className={styles.guess_form} onSubmit={formHandler}>
          <select name="guess" id="guess" value={guess} onChange={guessHandler}>
            <option value="">---</option>
            {collections.map(collection => {
              return <option value={collection.collectionName}
                key={collection.collectionName}>{collection.collectionName}</option>
            })}
          </select>
          <button type='submit'>Submit</button>
        </form>}

        {gameState === 'fail' && <p className={styles.fail}>
          Sorry! The correct answer is {answer.collectionName}. Refresh page to try again.</p>}

        {gameState === 'success' && <div className={styles.success}>
          <p>Congratulations! That is the correct answer. You've won an NFT!</p>
          <button onClick={mintHandler}>Mint Reward</button>
        </div>}

        {gameState === 'minted' && <p className={styles.minted}>NFT has been minted! Check it out on OpenSea Testnets.</p>}
      </main>
    </Fragment>
  )
}
