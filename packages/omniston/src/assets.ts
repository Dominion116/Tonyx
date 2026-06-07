import type { AssetId, ChainAddress, EvmAssetId } from '@ston-fi/omniston-sdk';
import type { AddressRef, AssetRef, ChainId } from './types.js';

type EvmChainId = Exclude<ChainId, 'ton'>;

const EVM_ASSET_BUILDERS: { [C in EvmChainId]: (value: EvmAssetId) => AssetId } = {
  arbitrum: (value) => ({ chain: { $case: 'arbitrum', value } }),
  avalanche: (value) => ({ chain: { $case: 'avalanche', value } }),
  base: (value) => ({ chain: { $case: 'base', value } }),
  bnb: (value) => ({ chain: { $case: 'bnb', value } }),
  ethereum: (value) => ({ chain: { $case: 'ethereum', value } }),
  polygon: (value) => ({ chain: { $case: 'polygon', value } }),
};

const EVM_ADDRESS_BUILDERS: { [C in EvmChainId]: (value: string) => ChainAddress } = {
  arbitrum: (value) => ({ chain: { $case: 'arbitrum', value } }),
  avalanche: (value) => ({ chain: { $case: 'avalanche', value } }),
  base: (value) => ({ chain: { $case: 'base', value } }),
  bnb: (value) => ({ chain: { $case: 'bnb', value } }),
  ethereum: (value) => ({ chain: { $case: 'ethereum', value } }),
  polygon: (value) => ({ chain: { $case: 'polygon', value } }),
};

/** Converts a wrapper-level asset reference into the SDK's chain-tagged `AssetId`. */
export function buildAssetId(asset: AssetRef): AssetId {
  if (asset.chain === 'ton') {
    return {
      chain: {
        $case: 'ton' as const,
        value: {
          kind:
            asset.kind === 'native'
              ? { $case: 'native' as const, value: {} }
              : { $case: 'jetton' as const, value: asset.address },
        },
      },
    };
  }

  const kind =
    asset.kind === 'native'
      ? { $case: 'native' as const, value: {} }
      : { $case: 'erc20' as const, value: asset.address };
  return EVM_ASSET_BUILDERS[asset.chain]({ kind });
}

/** Converts a wrapper-level address reference into the SDK's chain-tagged `ChainAddress`. */
export function buildChainAddress(address: AddressRef): ChainAddress {
  if (address.chain === 'ton') {
    return { chain: { $case: 'ton' as const, value: address.address } };
  }
  return EVM_ADDRESS_BUILDERS[address.chain](address.address);
}
