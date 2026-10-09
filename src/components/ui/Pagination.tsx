import { ChevronLeft, ChevronRight } from 'lucide-react';
import { Button } from './Button';
import { PaginatedResponse } from '@/types/api';

interface PaginationProps {
  data: PaginatedResponse<unknown>;
  onPageChange: (page: number) => void;
}

/** Footer pager for server-paginated tables. Shows up to 5 page buttons around the current page. */
export const Pagination = ({ data, onPageChange }: PaginationProps) => {
  if (data.totalPages <= 1) return null;

  const current = data.number;
  const start = Math.max(0, Math.min(current - 2, data.totalPages - 5));
  const pages = Array.from({ length: Math.min(data.totalPages, 5) }, (_, i) => start + i);

  return (
    <div className="flex items-center justify-between px-6 py-4 border-t border-[#F5F5F5]">
      <span className="text-xs text-[#9A9A9A]">
        Showing {current * data.size + 1}–{Math.min(current * data.size + data.content.length, data.totalElements)} of {data.totalElements}
      </span>
      <div className="flex items-center gap-1">
        <Button variant="ghost" size="sm" disabled={current === 0} onClick={() => onPageChange(current - 1)}>
          <ChevronLeft className="w-4 h-4" />
        </Button>
        {pages.map((page) => (
          <Button
            key={page}
            variant={page === current ? 'primary' : 'ghost'}
            size="sm"
            onClick={() => onPageChange(page)}
            className="w-8 h-8 p-0"
          >
            {page + 1}
          </Button>
        ))}
        <Button variant="ghost" size="sm" disabled={current >= data.totalPages - 1} onClick={() => onPageChange(current + 1)}>
          <ChevronRight className="w-4 h-4" />
        </Button>
      </div>
    </div>
  );
};
