import clsx from 'clsx';
import { ChevronDown, ChevronUp, ChevronsUpDown, Inbox } from 'lucide-react';
import { useMemo, useState, type ReactNode } from 'react';

export type Column<T> = {
  key: string;
  header: string;
  render?: (row: T) => ReactNode;
  width?: string;
  sortable?: boolean;
};

type SortDirection = 'asc' | 'desc';

interface DataTableProps<T> {
  columns: Column<T>[];
  data: T[];
  isLoading: boolean;
  emptyMessage?: string;
  onRowClick?: (row: T) => void;
}

function toComparableValue(value: unknown) {
  if (typeof value === 'number') {
    return value;
  }

  if (value instanceof Date) {
    return value.getTime();
  }

  if (typeof value === 'string') {
    return value.toLowerCase();
  }

  if (value === null || value === undefined) {
    return '';
  }

  return String(value).toLowerCase();
}

export default function DataTable<T extends Record<string, unknown>>({
  columns,
  data,
  isLoading,
  emptyMessage = 'No records found.',
  onRowClick,
}: DataTableProps<T>) {
  const [sortKey, setSortKey] = useState<string | null>(null);
  const [sortDir, setSortDir] = useState<SortDirection>('asc');

  const sortedData = useMemo(() => {
    if (!sortKey) {
      return data;
    }

    const sortColumn = columns.find((column) => column.key === sortKey && column.sortable);
    if (!sortColumn) {
      return data;
    }

    return [...data].sort((leftRow, rightRow) => {
      const leftRecord = leftRow as Record<string, unknown>;
      const rightRecord = rightRow as Record<string, unknown>;

      const leftValue = toComparableValue(leftRecord[sortKey]);
      const rightValue = toComparableValue(rightRecord[sortKey]);

      if (leftValue === rightValue) {
        return 0;
      }

      if (leftValue > rightValue) {
        return sortDir === 'asc' ? 1 : -1;
      }

      return sortDir === 'asc' ? -1 : 1;
    });
  }, [columns, data, sortDir, sortKey]);

  const handleSort = (column: Column<T>) => {
    if (!column.sortable) {
      return;
    }

    if (sortKey !== column.key) {
      setSortKey(column.key);
      setSortDir('asc');
      return;
    }

    setSortDir((previousDirection) => (previousDirection === 'asc' ? 'desc' : 'asc'));
  };

  const renderSortIcon = (column: Column<T>) => {
    if (!column.sortable) {
      return null;
    }

    if (sortKey !== column.key) {
      return <ChevronsUpDown className="h-4 w-4 text-gray-400" aria-hidden="true" />;
    }

    return sortDir === 'asc' ? (
      <ChevronUp className="h-4 w-4 text-amber-600" aria-hidden="true" />
    ) : (
      <ChevronDown className="h-4 w-4 text-amber-600" aria-hidden="true" />
    );
  };

  const columnCount = Math.max(columns.length, 1);

  return (
    <div className="overflow-x-auto rounded-xl border border-gray-200 bg-white shadow-sm">
      <table className="min-w-full border-separate border-spacing-0 text-sm">
        <thead>
          <tr className="text-left text-xs uppercase tracking-wide text-gray-500">
            {columns.map((column) => (
              <th
                key={column.key}
                className="sticky top-0 z-10 border-b border-gray-200 bg-gray-50 px-4 py-3 font-semibold"
                style={column.width ? { width: column.width } : undefined}
                scope="col"
              >
                {column.sortable ? (
                  <button
                    type="button"
                    className="inline-flex items-center gap-1.5 transition-colors hover:text-amber-700"
                    onClick={() => handleSort(column)}
                  >
                    <span>{column.header}</span>
                    {renderSortIcon(column)}
                  </button>
                ) : (
                  column.header
                )}
              </th>
            ))}
          </tr>
        </thead>

        <tbody>
          {isLoading
            ? Array.from({ length: 6 }).map((_, rowIndex) => (
                <tr key={`loading-row-${rowIndex}`} className={rowIndex % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                  {columns.map((column, colIndex) => (
                    <td key={`${column.key}-loading-${colIndex}`} className="border-b border-gray-100 px-4 py-3">
                      <div
                        className="h-4 animate-pulse rounded bg-gray-200"
                        style={{ width: `${Math.max(35, 70 - colIndex * 7)}%` }}
                      />
                    </td>
                  ))}
                </tr>
              ))
            : null}

          {!isLoading && sortedData.length === 0 ? (
            <tr>
              <td colSpan={columnCount} className="px-6 py-14">
                <div className="flex flex-col items-center justify-center text-center">
                  <div className="mb-3 rounded-full bg-gray-100 p-3 text-gray-400">
                    <Inbox className="h-6 w-6" aria-hidden="true" />
                  </div>
                  <p className="text-sm font-medium text-gray-600">{emptyMessage}</p>
                </div>
              </td>
            </tr>
          ) : null}

          {!isLoading
            ? sortedData.map((row, rowIndex) => {
                const rowRecord = row as Record<string, unknown>;

                return (
                  <tr
                    key={`row-${rowIndex}`}
                    className={clsx(
                      'border-b border-gray-100 transition-colors last:border-b-0',
                      rowIndex % 2 === 0 ? 'bg-white' : 'bg-gray-50',
                      onRowClick ? 'cursor-pointer hover:bg-amber-50' : undefined,
                    )}
                    onClick={onRowClick ? () => onRowClick(row) : undefined}
                  >
                    {columns.map((column) => (
                      <td
                        key={`${column.key}-${rowIndex}`}
                        className="border-b border-gray-100 px-4 py-3 text-gray-700"
                        style={column.width ? { width: column.width } : undefined}
                      >
                        {column.render ? column.render(row) : String(rowRecord[column.key] ?? '-')}
                      </td>
                    ))}
                  </tr>
                );
              })
            : null}
        </tbody>
      </table>
    </div>
  );
}