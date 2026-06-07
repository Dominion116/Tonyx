import { getServerWalletAddress, serverApi } from '@/lib/server-api';
import { ScannerView } from '@/components/views/scanner-view';

export default async function ScannerPage() {
  const address = await getServerWalletAddress();
  const [pools, balance] = await Promise.all([
    serverApi.getPools(),
    address ? serverApi.getBalance(address) : Promise.resolve(null),
  ]);

  return (
    <ScannerView
      pools={pools?.pools}
      cachedAt={pools?.cachedAt}
      idleUsdt={balance?.idleUsdt ?? 0}
    />
  );
}
