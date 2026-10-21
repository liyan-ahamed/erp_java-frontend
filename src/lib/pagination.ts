import { BackendPage, PaginatedResponse } from '@/types/api';

/** Converts the backend paging wrapper into the frontend shape. Items are passed through unchanged. */
export const mapPage = <T>(page: BackendPage<T>): PaginatedResponse<T> => ({
  content: page.content,
  totalElements: page.total_elements,
  totalPages: page.total_pages,
  size: page.size,
  number: page.page,
});

/**
 * One page of a list that is already fully loaded and filtered in the browser, in the same shape as a
 * server page, so the shared Pagination footer works unchanged. `page` is clamped to the last page.
 */
export const paginateLocally = <T>(items: T[], page: number, size: number): PaginatedResponse<T> => {
  const number = Math.min(page, Math.max(0, Math.ceil(items.length / size) - 1));
  return {
    content: items.slice(number * size, number * size + size),
    totalElements: items.length,
    totalPages: Math.ceil(items.length / size),
    size,
    number,
  };
};

/**
 * Loads every page of a list endpoint (100 per request) — for small reference
 * lists used in form dropdowns, never for data tables.
 */
export const fetchAllPages = async <T>(
  fetchPage: (page: number, size: number) => Promise<PaginatedResponse<T>>,
): Promise<T[]> => {
  const items: T[] = [];
  for (let page = 0; ; page++) {
    const result = await fetchPage(page, 100);
    items.push(...result.content);
    if (page >= result.totalPages - 1) return items;
  }
};
