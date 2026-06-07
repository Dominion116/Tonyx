import { getServerWalletAddress, serverApi } from '@/lib/server-api';
import { OverviewView } from '@/components/views/overview-view';

export default async function OverviewPage() {
  const address = await getServerWalletAddress();
  const balance = address ? await serverApi.getBalance(address) : null;

  return <OverviewView balance={balance} />;
}
