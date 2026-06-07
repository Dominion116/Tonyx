import { HistoryView } from '@/components/views/history-view';
import { getServerWalletAddress, serverApi } from '@/lib/server-api';
import { resolveCursorPage } from '@/lib/pagination';

const BASE_PATH = '/mini-app/history';

interface Props {
  searchParams: { cursor?: string; stack?: string };
}

export default async function MiniAppHistory({ searchParams }: Props) {
  const address = await getServerWalletAddress();
  const data = address ? await serverApi.getRuns(address, searchParams.cursor) : null;
  const { page, prevHref, nextHref } = resolveCursorPage(
    BASE_PATH,
    searchParams,
    data?.nextCursor,
    data?.hasMore ?? false,
  );

  return <HistoryView runs={data?.runs ?? []} page={page} prevHref={prevHref} nextHref={nextHref} />;
}
