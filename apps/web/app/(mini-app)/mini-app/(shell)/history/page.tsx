import { HistoryView } from '@/components/views/history-view';
import { getServerWalletAddress, serverApi } from '@/lib/server-api';

export default async function MiniAppHistory() {
  const address = await getServerWalletAddress();
  const data = address ? await serverApi.getRuns(address) : null;

  return <HistoryView runs={data?.runs ?? []} />;
}
