"use client";

import { DataTable, type DataTableColumn, type DataTableProps } from "./data-table";

export type FinancialTableColumn<T> = Omit<DataTableColumn<T>, "align"> & {
  /** Forces right-alignment per docs/frontend/04-design-system.md §3. */
  numeric?: boolean;
};

export type FinancialTableProps<T> = Omit<DataTableProps<T>, "columns"> & {
  columns: FinancialTableColumn<T>[];
};

function FinancialTable<T>({ columns, ...props }: FinancialTableProps<T>) {
  const alignedColumns: DataTableColumn<T>[] = columns.map((column) => ({
    ...column,
    align: column.numeric ? "end" : "start",
  }));

  return <DataTable columns={alignedColumns} {...props} />;
}

export { FinancialTable };
