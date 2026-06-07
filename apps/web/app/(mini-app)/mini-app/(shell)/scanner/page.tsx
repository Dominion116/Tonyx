import { getServerWalletAddress, serverApi } from '@/lib/server-api';
import { ScannerView } from '@/components/views/scanner-view';

const BASE_PATH = '/mini-app/scanner';

interface Props {
  searchParams: { page?: string };
}

export default async function MiniAppScanner({ searchParams }: Props) {
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
      page={Number(searchParams.page) || 1}
      basePath={BASE_PATH}
    />
  );
}
