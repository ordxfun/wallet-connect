import type { FormEvent } from 'react';

import { useSendGatewayTransaction } from '@gobob/sats-wagmi';
import { type Hex, parseUnits } from 'viem';

function Gateway() {
  const {
    data: hash,
    error,
    isPending,
    sendGatewayTransaction
  } = useSendGatewayTransaction({ toChain: 'bob-sepolia' });

  async function submit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const formData = new FormData(e.target as HTMLFormElement);
    const evmAddress = formData.get('address') as Hex;
    const value = formData.get('value') as string;

    sendGatewayTransaction({ toToken: 'tBTC', evmAddress, value: parseUnits(value, 8) });
  }

  return (
    <div>
      <h2>BOB Gateway</h2>
      <form onSubmit={submit}>
        <input required name='address' placeholder='EVM Address' />
        <input required name='value' placeholder='Amount (BTC)' step='0.00000001' type='number' />
        <button disabled={isPending} type='submit'>
          {isPending ? 'Confirming...' : 'Send'}
        </button>
      </form>
      {hash && <div>Transaction Hash: {hash}</div>}
      {error && <div>Error: {error.message}</div>}
    </div>
  );
}

export default Gateway;
