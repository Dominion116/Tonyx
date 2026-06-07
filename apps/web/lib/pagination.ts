/**
 * Resolves Previous/Next hrefs for a cursor-paginated list driven by URL search
 * params. `cursor` is the cursor used to fetch the current page; `stack` is the
 * comma-joined list of cursors used to reach every prior page (page 1's cursor
 * is the empty string), which lets "Previous" navigate backwards through a
 * cursor-only API.
 */
export interface CursorSearchParams {
  cursor?: string;
  stack?: string;
}

export interface CursorPageState {
  /** 1-based page number currently shown. */
  page: number;
  prevHref?: string;
  nextHref?: string;
}

export function resolveCursorPage(
  basePath: string,
  searchParams: CursorSearchParams,
  nextCursor: string | undefined,
  hasMore: boolean,
): CursorPageState {
  const stack = searchParams.stack !== undefined ? searchParams.stack.split(',') : [];
  const cursor = searchParams.cursor;

  let prevHref: string | undefined;
  if (stack.length > 0) {
    const prevCursor = stack[stack.length - 1];
    const newStack = stack.slice(0, -1);
    const params = new URLSearchParams();
    if (prevCursor) params.set('cursor', prevCursor);
    if (newStack.length > 0) params.set('stack', newStack.join(','));
    const qs = params.toString();
    prevHref = qs ? `${basePath}?${qs}` : basePath;
  }

  let nextHref: string | undefined;
  if (hasMore && nextCursor) {
    const params = new URLSearchParams();
    params.set('cursor', nextCursor);
    params.set('stack', [...stack, cursor ?? ''].join(','));
    nextHref = `${basePath}?${params.toString()}`;
  }

  return { page: stack.length + 1, prevHref, nextHref };
}
