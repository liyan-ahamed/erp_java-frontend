import { PaginatedResponse } from '@/types/api';

interface PaginationProps {
  data: PaginatedResponse<unknown>;
  onPageChange: (page: number) => void;
}

/** Forma table footer for server-paginated tables. Shows up to 5 page buttons around the current page. */
export const Pagination = ({ data, onPageChange }: PaginationProps) => {
  if (data.totalPages <= 1) return null;

  const current = data.number;
  const start = Math.max(0, Math.min(current - 2, data.totalPages - 5));
  const pages = Array.from({ length: Math.min(data.totalPages, 5) }, (_, i) => start + i);

  return (
    <div className="table-foot">
      <span>
        Showing {current * data.size + 1}–{Math.min(current * data.size + data.content.length, data.totalElements)} of{' '}
        {data.totalElements} records
      </span>
      <div className="pagination">
        <button type="button" className="f-btn" disabled={current === 0} onClick={() => onPageChange(current - 1)} aria-label="Previous page">
          ‹
        </button>
        {pages.map((page) => (
          <button
            type="button"
            key={page}
            className={`f-btn ${page === current ? 'current' : ''}`}
            aria-current={page === current ? 'page' : undefined}
            onClick={() => onPageChange(page)}
          >
            {page + 1}
          </button>
        ))}
        <button
          type="button"
          className="f-btn"
          disabled={current >= data.totalPages - 1}
          onClick={() => onPageChange(current + 1)}
          aria-label="Next page"
        >
          ›
        </button>
      </div>
    </div>
  );
};
