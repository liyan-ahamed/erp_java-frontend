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
