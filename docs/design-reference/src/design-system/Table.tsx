import React from 'react';

export const Table = React.forwardRef<HTMLTableElement, React.TableHTMLAttributes<HTMLTableElement>>(
  ({ className = '', children, ...props }, ref) => (
    <div className="relative w-full overflow-auto rounded-lg border border-slate-200 dark:border-white/10 bg-white dark:bg-[#0f111a]">
      <table
        ref={ref}
        className={`w-full caption-bottom text-xs text-left ${className}`}
        {...props}
      >
        {children}
      </table>
    </div>
  )
);
Table.displayName = 'Table';

export const TableHeader = React.forwardRef<HTMLTableSectionElement, React.HTMLAttributes<HTMLTableSectionElement>>(
  ({ className = '', children, ...props }, ref) => (
    <thead
      ref={ref}
      className={`border-b border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-white/[0.02] text-slate-600 dark:text-slate-400 font-semibold tracking-wider uppercase text-[10px] ${className}`}
      {...props}
    >
      {children}
    </thead>
  )
);
TableHeader.displayName = 'TableHeader';

export const TableBody = React.forwardRef<HTMLTableSectionElement, React.HTMLAttributes<HTMLTableSectionElement>>(
  ({ className = '', children, ...props }, ref) => (
    <tbody
      ref={ref}
      className={`divide-y divide-slate-100 dark:divide-white/5 text-slate-800 dark:text-slate-200 ${className}`}
      {...props}
    >
      {children}
    </tbody>
  )
);
TableBody.displayName = 'TableBody';

export const TableRow = React.forwardRef<HTMLTableRowElement, React.HTMLAttributes<HTMLTableRowElement>>(
  ({ className = '', children, ...props }, ref) => (
    <tr
      ref={ref}
      className={`transition-colors hover:bg-slate-50/80 dark:hover:bg-white/[0.03] data-[state=selected]:bg-slate-100 dark:data-[state=selected]:bg-white/[0.06] ${className}`}
      {...props}
    >
      {children}
    </tr>
  )
);
TableRow.displayName = 'TableRow';

export const TableHead = React.forwardRef<HTMLTableCellElement, React.ThHTMLAttributes<HTMLTableCellElement>>(
  ({ className = '', isNumeric = false, children, ...props }: React.ThHTMLAttributes<HTMLTableCellElement> & { isNumeric?: boolean }, ref) => (
    <th
      ref={ref}
      className={`h-9 px-3.5 align-middle font-medium select-none whitespace-nowrap ${
        isNumeric ? 'text-right' : 'text-left'
      } ${className}`}
      {...props}
    >
      {children}
    </th>
  )
);
TableHead.displayName = 'TableHead';

export const TableCell = React.forwardRef<HTMLTableCellElement, React.TdHTMLAttributes<HTMLTableCellElement>>(
  ({ className = '', isNumeric = false, children, ...props }: React.TdHTMLAttributes<HTMLTableCellElement> & { isNumeric?: boolean }, ref) => (
    <td
      ref={ref}
      className={`p-3.5 align-middle ${
        isNumeric ? 'text-right font-mono tabular-nums' : 'text-left'
      } ${className}`}
      {...props}
    >
      {children}
    </td>
  )
);
TableCell.displayName = 'TableCell';
