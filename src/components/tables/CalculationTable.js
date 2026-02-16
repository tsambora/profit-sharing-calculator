"use client";

const formatNumber = (n) => {
  if (n == null || isNaN(n)) return "-";
  return Math.round(n).toLocaleString("id-ID");
};

const formatDecimal = (n) => {
  if (n == null || isNaN(n)) return "-";
  return n.toLocaleString("id-ID", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
};

export default function CalculationTable({
  title,
  columns,
  data,
  filterFn,
}) {
  const filtered = filterFn
    ? data.filter((row, idx) => filterFn(row, idx > 0 ? data[idx - 1] : null))
    : data;

  if (filtered.length === 0) return null;

  return (
    <div className="mb-6">
      <h3 className="text-sm font-semibold mb-2">{title}</h3>
      <div className="max-h-96 overflow-y-auto border border-gray-200 rounded">
        <table className="w-full text-sm">
          <thead className="sticky top-0 bg-gray-100 z-10">
            <tr>
              {columns.map((col, i) => (
                <th
                  key={i}
                  className="px-3 py-2 text-left font-medium text-gray-700 border-b border-gray-200 whitespace-nowrap"
                >
                  {col.header}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {filtered.map((row, rowIdx) => {
              const prevRow = rowIdx > 0 ? filtered[rowIdx - 1] : null;
              return (
                <tr
                  key={rowIdx}
                  className={rowIdx % 2 === 0 ? "bg-white" : "bg-gray-50"}
                >
                  {columns.map((col, colIdx) => {
                    const value = col.accessor(row, prevRow);
                    let display;
                    if (col.format === "decimal") {
                      display = formatDecimal(value);
                    } else if (col.format === "number") {
                      display = formatNumber(value);
                    } else if (col.format === "formula") {
                      display = (
                        <code className="text-xs text-gray-600 whitespace-nowrap">
                          {value}
                        </code>
                      );
                    } else {
                      display = value;
                    }
                    return (
                      <td
                        key={colIdx}
                        className="px-3 py-1.5 border-b border-gray-100 whitespace-nowrap"
                      >
                        {display}
                      </td>
                    );
                  })}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

export { formatNumber, formatDecimal };
