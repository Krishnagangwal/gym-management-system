import { Fragment, useState } from 'react';
import { IconBox, IconChevronRight } from './icons.jsx';

export default function DataTable({ columns, rows, renderActions, renderExpanded, emptyMessage = 'No records found.' }) {
  const [expandedId, setExpandedId] = useState(null);

  if (!rows.length) {
    return (
      <div className="card py-16 flex flex-col items-center justify-center text-center">
        <div className="w-12 h-12 rounded-xl bg-gray-100 flex items-center justify-center mb-3">
          <IconBox className="w-6 h-6 text-gray-400" />
        </div>
        <p className="text-gray-500 text-sm">{emptyMessage}</p>
      </div>
    );
  }

  const colSpan = columns.length + (renderExpanded ? 1 : 0) + (renderActions ? 1 : 0);

  return (
    <div className="card overflow-hidden">
      <div className="overflow-x-auto">
        <table className="min-w-full text-sm">
          <thead>
            <tr className="bg-gray-50/80 border-b border-gray-100">
              {renderExpanded && <th className="px-3 py-3.5 w-8" />}
              {columns.map((col) => (
                <th key={col.key} className="px-5 py-3.5 text-left font-semibold text-gray-500 text-xs uppercase tracking-wider">
                  {col.label}
                </th>
              ))}
              {renderActions && <th className="px-5 py-3.5" />}
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {rows.map((row) => {
              const isExpanded = renderExpanded && expandedId === row.id;
              return (
                <Fragment key={row.id}>
                  <tr
                    className={`hover:bg-indigo-50/40 transition-colors ${renderExpanded ? 'cursor-pointer' : ''}`}
                    onClick={renderExpanded ? () => setExpandedId(isExpanded ? null : row.id) : undefined}
                  >
                    {renderExpanded && (
                      <td className="px-3 py-3.5">
                        <IconChevronRight
                          className={`w-3.5 h-3.5 text-gray-400 transition-transform ${isExpanded ? 'rotate-90' : ''}`}
                          style={{ width: 14, height: 14 }}
                        />
                      </td>
                    )}
                    {columns.map((col) => (
                      <td key={col.key} className="px-5 py-3.5 text-gray-700">{col.render ? col.render(row) : row[col.key]}</td>
                    ))}
                    {renderActions && (
                      <td className="px-5 py-3.5 text-right" onClick={(e) => e.stopPropagation()}>{renderActions(row)}</td>
                    )}
                  </tr>
                  {isExpanded && (
                    <tr>
                      <td colSpan={colSpan} className="px-5 py-4 bg-gray-50/60 border-t border-gray-100">
                        {renderExpanded(row)}
                      </td>
                    </tr>
                  )}
                </Fragment>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
