import React, { HTMLAttributes, TdHTMLAttributes, ThHTMLAttributes } from 'react';

/** Forma table: soft header row, 12 px body, dashed row separators, scrolls sideways when narrow. */
export const Table = React.forwardRef<HTMLTableElement, HTMLAttributes<HTMLTableElement>>(
  ({ className = '', ...props }, ref) => (
    <div className="table-wrap">
      <table ref={ref} className={`f-table ${className}`} {...props} />
    </div>
  )
);
Table.displayName = 'Table';

export const TableHeader = React.forwardRef<HTMLTableSectionElement, HTMLAttributes<HTMLTableSectionElement>>(
  ({ className = '', ...props }, ref) => <thead ref={ref} className={className} {...props} />
);
TableHeader.displayName = 'TableHeader';

export const TableBody = React.forwardRef<HTMLTableSectionElement, HTMLAttributes<HTMLTableSectionElement>>(
  ({ className = '', ...props }, ref) => <tbody ref={ref} className={className} {...props} />
);
TableBody.displayName = 'TableBody';

export const TableRow = React.forwardRef<HTMLTableRowElement, HTMLAttributes<HTMLTableRowElement>>(
  ({ className = '', ...props }, ref) => <tr ref={ref} className={`transition-colors ${className}`} {...props} />
);
TableRow.displayName = 'TableRow';

export const TableHead = React.forwardRef<HTMLTableCellElement, ThHTMLAttributes<HTMLTableCellElement>>(
  ({ className = '', ...props }, ref) => <th ref={ref} className={className} {...props} />
);
TableHead.displayName = 'TableHead';

export const TableCell = React.forwardRef<HTMLTableCellElement, TdHTMLAttributes<HTMLTableCellElement>>(
  ({ className = '', ...props }, ref) => <td ref={ref} className={className} {...props} />
);
TableCell.displayName = 'TableCell';
