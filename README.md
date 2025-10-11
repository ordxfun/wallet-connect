<p align="center">
      <h1 align="center">Wallet-Connect</h1>
</p>
</br>

Wallet-Connect is a library with a handful of BTC wallet connectors, leaving aside the need of the developer to integrate each one individually. The library also exports useful React hooks that mimic the standard followed in the original EVM wagmi library.

This project is inspired by and builds upon the excellent work done in [sats-wagmi](https://github.com/bob-collective/sats-wagmi) by the Bob Collective team.

The package is still in an infancy state, but feel free to recommend any adjustments that you see fit.

## Table of contents

- 🚀 [Features](#features)
- 📦 [Installation](#installation)
- 💻 [Usage](#usage)
- 📝 [Contributing](#contributing)
- ⚖️ [License](#license)

## Features

- BTC Wallet connectors:
  - Metamask Snap
  - Unisat
  - Leather
  - Xverse
  - Bitget
  - OKX Wallet
  - SAT20
- BTC functionality:
  - send BTC
  - sign PSBTs
- React hooks
- Planned BTC functionality
  - inscribe (text and images)
  - send inscription
  - etch runes
  - send runes

## Installation

To use wallet-connect, all you need to do is install the
`@ordxfun/wallet-connect`:

```sh
# with Yarn
$ yarn add @ordxfun/wallet-connect

# with npm
$ npm i @ordxfun/wallet-connect

# with pnpm
$ pnpm add @ordxfun/wallet-connect

# with Bun
$ bun add @ordxfun/wallet-connect
```

## Usage

### Connector

```ts
import { MMSnapConnector } from './connectors';

const mmSnap = new MMSnapConnector(network);

mmSnap.connect();
```

### React Hooks

1. Wrap your application with the `WalletConnectConfig` provided by **@ordxfun/wallet-connect**.

```tsx
import { WalletConnectConfig } from '@ordxfun/wallet-connect';

// Do this at the root of your application
function App({ children }) {
  return <WalletConnectConfig network='testnet'>{children}</WalletConnectConfig>;
}
```

2. Now start by connecting:

```tsx
import { useConnect, WalletConnector } from '@ordxfun/wallet-connect';

function Example() {
  const { connectors, connect } = useConnect();

  const handleConnect = (connector: WalletConnector) => {
    connect({
      connector
    });
  };

  return (
    <div>
      {connectors.map((connector) => (
        <button key={connector.name} onClick={() => handleConnect(connector)}>
          {connector.name}
        </button>
      ))}
    </div>
  );
}
```

3. Once connected, you should be able to use the connector utility and have access to the connected BTC account:

```tsx
import { useConnect, WalletConnector } from '@ordxfun/wallet-connect';

function Example() {
  const { address, connector } = useWalletAccount();

  const handleTransfer = () => {
    connector?.sendToAddress('tb1p9gl248kp19jgennea98e2tv8acfrvfv0yws2tc5j6u72e84caapsh2hexs', 100000000);
  };

  return (
    <div>
      <p>Address: {address}</p>
      <button onClick={handleTransfer}>Transfer 1 BTC</button>
    </div>
  );
}
```

## Contributing

Contributions are always welcome!

See [CONTRIBUTING.md](./CONTRIBUTING.MD) for ways to get started.

## License

[MIT](https://choosealicense.com/licenses/mit/)
