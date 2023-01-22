import '@/styles/globals.css'

import { WagmiConfig, createClient, configureChains, goerli } from "wagmi";
import { publicProvider } from 'wagmi/providers/public';
import { jsonRpcProvider } from '@wagmi/core/providers/jsonRpc';
import { goerliRpc } from '@/data/constants';
import { CoinbaseWalletConnector } from 'wagmi/connectors/coinbaseWallet';

// Configure chains
const { chains, provider } = configureChains(
  [goerli],
  [
    jsonRpcProvider({
      rpc: (chain) => ({
        http: goerliRpc,
      }),
    }),
    publicProvider(),
  ],
);

// Set up client
const client = createClient({
  autoConnect: true,
  connectors: [
    new CoinbaseWalletConnector({
      chains,
      options: {
        appName: 'quiz-game',
      },
    }),
  ],
  provider,
})

export default function App({ Component, pageProps }) {
  return (
    <WagmiConfig client={client}>
      <Component {...pageProps} />
    </WagmiConfig>
  )
}
