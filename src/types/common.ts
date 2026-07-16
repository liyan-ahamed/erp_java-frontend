export interface Option<T = string> {
  label: string;
  value: T;
  disabled?: boolean;
}

export type SortOrder = 'asc' | 'desc';

export interface PaginationParams {
  page: number;
  size: number;
  sort?: string;
  order?: SortOrder;
}
