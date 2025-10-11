import { AddressType, Network } from 'bitcoin-address-validation';

import { sat20Logo } from '../assets/sat20';

import { PsbtInputAccounts, SatsConnector } from './base';

type WalletNetwork = 'livenet' | 'testnet'; // SAT20 uses 'livenet' | 'testnet'

const getLibNetwork = (network: WalletNetwork): Network => {
  switch (network) {
    case 'livenet':
      return Network.mainnet;
    case 'testnet':
      return Network.testnet;
  }
};

const getSat20Network = (network: Network): WalletNetwork => {
  switch (network) {
    default:
    case Network.mainnet:
      return 'livenet';
    case Network.testnet:
      return 'testnet';
  }
};

type AccountsChangedEvent = (event: 'accountsChanged', handler: (accounts: Array<string>) => void) => void;
type NetworkChangedEvent = (event: 'networkChanged', handler: (network: WalletNetwork) => void) => void;
type EnvironmentChangedEvent = (event: 'environmentChanged', handler: (environment: string) => void) => void;

type Balance = { confirmed: number; unconfirmed: number; total: number };

type Inscription = {
  inscriptionId: string;
  inscriptionNumber: string;
  address: string;
  outputValue: string;
  content: string;
  contentLength: string;
  contentType: string;
  preview: string;
  timestamp: number;
  offset: number;
  genesisTransaction: string;
  location: string;
};

type GetInscriptionsResult = { total: number; list: Inscription[] };
type SendInscriptionsResult = { txid: string };

// SAT20 Wallet API interface
type SAT20Wallet = {
  requestAccounts: () => Promise<string[]>;
  getAccounts: () => Promise<string[]>;
  getNetwork: () => Promise<WalletNetwork>;
  switchNetwork: (network: WalletNetwork) => Promise<void>;
  getPublicKey: () => Promise<string>;
  getBalance: () => Promise<Balance>;
  signMessage: (msg: string, type?: 'ecdsa' | 'bip322-simple') => Promise<string>;
  signPsbt: (
    psbtHex: string,
    options?: {
      autoFinalized?: boolean;
      toSignInputs: {
        index: number;
        address?: string;
        publicKey?: string;
        sighashTypes?: number[];
        disableTweakSigner?: boolean;
      }[];
    }
  ) => Promise<string>;
  signPsbts: (
    psbtHexs: string[],
    options?: {
      autoFinalized?: boolean;
      toSignInputs: {
        index: number;
        address?: string;
        publicKey?: string;
        sighashTypes?: number[];
        disableTweakSigner?: boolean;
      };
    }[]
  ) => Promise<string[]>;
  sendBitcoin: (address: string, atomicAmount: number, options?: { feeRate: number }) => Promise<string>;
  pushTx: ({ rawtx }: { rawtx: string }) => Promise<string>;
  pushPsbt: (psbtHex: string) => Promise<string>;
  getInscriptions: (cursor: number, size: number) => Promise<GetInscriptionsResult>;
  sendInscription: (
    address: string,
    inscriptionId: string,
    options?: { feeRate: number }
  ) => Promise<SendInscriptionsResult>;
  addAccounts: (count: number) => Promise<void>;
  on: AccountsChangedEvent & NetworkChangedEvent & EnvironmentChangedEvent;
  removeListener: AccountsChangedEvent & NetworkChangedEvent & EnvironmentChangedEvent;
};

declare global {
  interface Window {
    sat20: SAT20Wallet;
  }
}

class Sat20Connector extends SatsConnector {
  constructor(network: Network) {
    super(network, 'sat20', 'SAT20', 'https://sat20.org/', sat20Logo);
  }

  private getWallet(): SAT20Wallet | undefined {
    return window?.sat20;
  }

  async connect(): Promise<void> {
    const wallet = this.getWallet();

    if (!wallet) {
      throw new Error('SAT20 wallet not installed. Please install SAT20 browser extension from https://sat20.org/');
    }

    try {
      // Starting SAT20 connection

      // 首先尝试获取网络信息
      // Getting network from SAT20
      let currentNetwork: WalletNetwork;

      try {
        currentNetwork = (await Promise.race([
          wallet.getNetwork(),
          new Promise((_, reject) => setTimeout(() => reject(new Error('Get network timeout')), 5000))
        ])) as WalletNetwork;
        // Current network obtained
      } catch (networkError) {
        // Failed to get network, using default
        // 如果无法获取网络，使用默认网络
        currentNetwork = this.network === 'mainnet' ? 'livenet' : 'testnet';
        // Using default network
      }

      const mappedNetwork = getLibNetwork(currentNetwork);
      // Network mapping completed

      if (mappedNetwork !== this.network) {
        // Switching network
        try {
          const expectedNetwork = getSat20Network(this.network);

          await Promise.race([
            wallet.switchNetwork(expectedNetwork),
            new Promise((_, reject) => setTimeout(() => reject(new Error('Switch network timeout')), 5000))
          ]);
          // Network switched successfully
        } catch (switchError) {
          // Failed to switch network, continuing with connection
          // 继续连接，不强制切换网络
        }
      }

      // Request accounts first
      // Requesting accounts from SAT20
      let accounts: string[];

      try {
        accounts = (await Promise.race([
          wallet.requestAccounts(),
          new Promise((_, reject) => setTimeout(() => reject(new Error('Request accounts timeout')), 10000))
        ])) as string[];

        if (!accounts || accounts.length === 0) {
          throw new Error('No accounts returned from SAT20 wallet');
        }

        // SAT20 accounts obtained
      } catch (accountsError) {
        // Failed to get accounts
        throw new Error(
          `Failed to get accounts from SAT20 wallet: ${accountsError instanceof Error ? accountsError.message : 'Unknown error'}`
        );
      }

      // Get public key
      // Getting public key from SAT20
      let publicKey: string;

      try {
        publicKey = (await Promise.race([
          wallet.getPublicKey(),
          new Promise((_, reject) => setTimeout(() => reject(new Error('Get public key timeout')), 10000))
        ])) as string;

        if (!publicKey) {
          throw new Error('No public key returned from SAT20 wallet');
        }

        // SAT20 public key obtained
      } catch (publicKeyError) {
        // Failed to get public key
        throw new Error(
          `Failed to get public key from SAT20 wallet: ${publicKeyError instanceof Error ? publicKeyError.message : 'Unknown error'}`
        );
      }

      this.paymentAddress = accounts[0];
      this.ordinalsAddress = accounts[0]; // SAT20 uses same address for both
      this.publicKey = publicKey;

      // SAT20 connection successful

      // Set up event listeners
      wallet.on('accountsChanged', (accounts) => {
        if (accounts && accounts.length > 0) {
          this.changeAccount(accounts[0]).catch(() => {});
        }
      });
      wallet.on('networkChanged', (network) => this.changeNetwork(network));
    } catch (error) {
      // SAT20 connection error occurred

      // 尝试提取更详细的错误信息
      let errorMessage = 'Unknown error';

      if (error instanceof Error) {
        errorMessage = error.message;
      } else if (typeof error === 'string') {
        errorMessage = error;
      } else if (error && typeof error === 'object') {
        // 尝试从错误对象中提取信息
        if ('message' in error && typeof error.message === 'string') {
          errorMessage = error.message;
        } else if ('error' in error && typeof error.error === 'string') {
          errorMessage = error.error;
        } else if ('reason' in error && typeof error.reason === 'string') {
          errorMessage = error.reason;
        } else {
          // 尝试序列化错误对象
          try {
            errorMessage = JSON.stringify(error);
          } catch {
            errorMessage = 'Error object could not be serialized';
          }
        }
      }

      // SAT20 error details logged

      throw new Error(`Failed to connect to SAT20 wallet: ${errorMessage}`);
    }
  }

  async changeAccount(account: string) {
    this.paymentAddress = account;
    this.ordinalsAddress = account;
    const wallet = this.getWallet();

    if (wallet) {
      try {
        this.publicKey = await wallet.getPublicKey();
      } catch (error) {
        // Failed to get public key during account change
      }
    }
  }

  async changeNetwork(network: WalletNetwork) {
    this.network = getLibNetwork(network);
  }

  async isReady(): Promise<boolean> {
    const wallet = this.getWallet();

    this.ready = !!wallet;

    if (!this.ready) {
      // SAT20 wallet not detected
    }

    return this.ready;
  }

  async signMessage(message: string): Promise<string> {
    const wallet = this.getWallet();

    if (!wallet) {
      throw new Error('SAT20 wallet not installed');
    }

    return wallet.signMessage(message);
  }

  async signPsbt(psbtHex: string, psbtInputAccounts: PsbtInputAccounts[]): Promise<string> {
    const wallet = this.getWallet();

    if (!wallet) {
      throw new Error('SAT20 wallet not installed');
    }

    if (!this.publicKey) {
      throw new Error('Something went wrong while connecting');
    }

    // Extract all inputs to be signed
    let inputs: number[] = [];

    for (const input of psbtInputAccounts) {
      for (const index of input.signingIndexes) {
        inputs.push(index);
      }
    }

    if (!this.paymentAddress) {
      throw new Error('No payment address specified');
    }

    const toSignInputs = inputs.map((index) => {
      return {
        index,
        publicKey: this.publicKey,
        disableTweakSigner: this.getAddressType(this.paymentAddress!) !== AddressType.p2tr
      };
    });

    const signedPsbtHex = await wallet.signPsbt(psbtHex, {
      autoFinalized: false,
      toSignInputs: toSignInputs
    });

    return signedPsbtHex;
  }

  async sendToAddress(toAddress: string, amount: number): Promise<string> {
    const wallet = this.getWallet();

    if (!wallet) {
      throw new Error('SAT20 wallet not installed');
    }

    return wallet.sendBitcoin(toAddress, amount);
  }

  async signPsbts(psbtHexs: string[], options?: any): Promise<string[]> {
    const wallet = this.getWallet();

    if (!wallet) {
      throw new Error('SAT20 wallet not installed');
    }

    return wallet.signPsbts(psbtHexs, options);
  }

  async pushTx(rawTx: string): Promise<string> {
    const wallet = this.getWallet();

    if (!wallet) {
      throw new Error('SAT20 wallet not installed');
    }

    return wallet.pushTx({ rawtx: rawTx });
  }

  async pushPsbt(psbtHex: string): Promise<string> {
    const wallet = this.getWallet();

    if (!wallet) {
      throw new Error('SAT20 wallet not installed');
    }

    return wallet.pushPsbt(psbtHex);
  }

  async getInscriptions(cursor: number, size: number): Promise<GetInscriptionsResult> {
    const wallet = this.getWallet();

    if (!wallet) {
      throw new Error('SAT20 wallet not installed');
    }

    return wallet.getInscriptions(cursor, size);
  }

  async sendInscription(
    address: string,
    inscriptionId: string,
    options?: { feeRate: number }
  ): Promise<SendInscriptionsResult> {
    const wallet = this.getWallet();

    if (!wallet) {
      throw new Error('SAT20 wallet not installed');
    }

    return wallet.sendInscription(address, inscriptionId, options);
  }

  async addAccounts(count: number): Promise<void> {
    const wallet = this.getWallet();

    if (!wallet) {
      throw new Error('SAT20 wallet not installed');
    }

    return wallet.addAccounts(count);
  }

  on(callback: (account: string) => void): void {
    const wallet = this.getWallet();

    if (!wallet) {
      return;
    }
    wallet.on('accountsChanged', (accounts) => {
      if (accounts && accounts.length > 0) {
        callback(accounts[0]);
        this.changeAccount(accounts[0]).catch(() => {});
      }
    });
  }

  removeListener(callback: (account: string) => void): void {
    const wallet = this.getWallet();

    if (!wallet) {
      return;
    }
    wallet.removeListener('accountsChanged', (accounts) => {
      if (accounts && accounts.length > 0) {
        callback(accounts[0]);
        this.changeAccount(accounts[0]).catch(() => {});
      }
    });
  }
}

export { Sat20Connector };
