export default function DataTable({ columns, rows, renderActions, emptyMessage = 'No records found.' }) {
  if (!rows.length) {
    return <div className="text-gray-500 text-sm py-8 text-center">{emptyMessage}</div>;
  }

  return (
    <div className="overflow-x-auto bg-white rounded-lg shadow">
      <table className="min-w-full text-sm">
        <thead className="bg-gray-100 text-left">
          <tr>
            {columns.map((col) => (
              <th key={col.key} className="px-4 py-2 font-medium text-gray-600">{col.label}</th>
            ))}
            {renderActions && <th className="px-4 py-2" />}
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr key={row.id} className="border-t hover:bg-gray-50">
              {columns.map((col) => (
                <td key={col.key} className="px-4 py-2">{col.render ? col.render(row) : row[col.key]}</td>
              ))}
              {renderActions && <td className="px-4 py-2 text-right">{renderActions(row)}</td>}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
