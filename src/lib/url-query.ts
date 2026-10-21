/**
 * Query-string updates for filter selections. Next's router.replace updates the address bar asynchronously,
 * so two quick changes (e.g. Batch, then Exam) could each start from the old URL and undo one another.
 * The last query written here is used as the base until the address bar has caught up.
 */

let lastWritten: { path: string; query: string; at: number } | null = null;

export const currentQuery = (pathname: string): URLSearchParams => {
  const live = typeof window === 'undefined' ? '' : window.location.search.replace(/^\?/, '');
  if (lastWritten && lastWritten.path === pathname && live !== lastWritten.query && Date.now() - lastWritten.at < 2000) {
    return new URLSearchParams(lastWritten.query);
  }
  return new URLSearchParams(live);
};

export const replaceQuery = (
  router: { replace: (href: string, options?: { scroll?: boolean }) => void },
  pathname: string,
  params: URLSearchParams,
) => {
  const query = params.toString();
  lastWritten = { path: pathname, query, at: Date.now() };
  router.replace(query ? `${pathname}?${query}` : pathname, { scroll: false });
};
