'use client';

import { UseQueryOptions, useQuery } from '@tanstack/react-query';
import { getBalance } from '@gobob/bob-sdk';

import { useSatsWagmi } from '../provider';
import { INTERVAL } from '../utils';

import { useAccount } from './useAccount';

type GetBalanceReturnType = { confirmed: bigint; unconfirmed: bigint; total: bigint };

type UseBalanceProps = Omit<
  UseQueryOptions<GetBalanceReturnType, unknown, GetBalanceReturnType, (string | undefined)[]>,
  'initialData' | 'queryFn' | 'queryKey' | 'enabled'
>;

const useBalance = (props: UseBalanceProps = {}) => {
  const { network } = useSatsWagmi();
  const { address } = useAccount();

  return useQuery({
    enabled: Boolean(address),
    queryKey: ['sats-balance', network, address],
    refetchInterval: INTERVAL.SECONDS_30,
    queryFn: async () => {
      const balance = await getBalance(address);

      // Convert BigInt to number for React Query serialization
      return {
        confirmed: balance.confirmed,
        unconfirmed: balance.unconfirmed,
        total: balance.total
      };
    },
    structuralSharing: false, // Disable structural sharing to avoid BigInt serialization issues
    ...props
  });
};

export { useBalance };
