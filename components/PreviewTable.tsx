import React, { useDeferredValue, useMemo, useState } from 'react';
import { ParsedData } from '../types';
import { ChevronLeft, ChevronRight, FileSpreadsheet, FileText } from 'lucide-react';
import Button from './Button';
import { clampPage, filterRows, formatCell } from '../utils/tableUtils';

interface PreviewTableProps {
  data: ParsedData;
  onExportExcel: () => void;
  onExportCSV: () => void;
  onBack: () => void;
}

const ITEMS_PER_PAGE = 20;

const PreviewTable: React.FC<PreviewTableProps> = ({ 
  data, 
  onExportExcel, 
  onExportCSV,
  onBack 
}) => {
  const [currentPage, setCurrentPage] = useState(1);
  const [searchTerm, setSearchTerm] = useState('');

  // Deferred so a keystroke paints immediately and the (potentially large)
  // re-filter happens in the next render pass.
  const deferredTerm = useDeferredValue(searchTerm);

  const filteredRows = useMemo(
    () => filterRows(data.rows, deferredTerm),
    [data.rows, deferredTerm]
  );

  const totalPages = Math.max(1, Math.ceil(filteredRows.length / ITEMS_PER_PAGE));
  const page = clampPage(currentPage, totalPages);

  const currentRows = useMemo(() => {
    const start = (page - 1) * ITEMS_PER_PAGE;
    return filteredRows.slice(start, start + ITEMS_PER_PAGE);
  }, [page, filteredRows]);

  const handlePageChange = (newPage: number) => setCurrentPage(clampPage(newPage, totalPages));

  return (
    <div className="flex flex-col flex-1 min-h-0 bg-white dark:bg-dark-secondary rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden">
      {/* Header Toolbar */}
      <div className="p-4 border-b border-gray-200 dark:border-gray-700 flex flex-col sm:flex-row gap-4 justify-between items-center bg-gray-50 dark:bg-gray-800">
        <div className="flex items-center gap-2 w-full sm:w-auto">
          <Button variant="ghost" onClick={onBack} size="sm" className="mr-2">
            ← Back
          </Button>
          <div className="text-sm text-gray-600 dark:text-gray-300">
            <span className="font-bold">{filteredRows.length.toLocaleString()}</span>
            {deferredTerm ? ` of ${data.originalSize.toLocaleString()} records match` : ' records'}
          </div>
        </div>

        <div className="flex gap-2 w-full sm:w-auto justify-end">
           <input
             type="text"
             placeholder="Search..."
             className="px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-dark text-gray-900 dark:text-white focus:ring-2 focus:ring-primary focus:outline-none"
             value={searchTerm}
             onChange={(e) => {
                 setSearchTerm(e.target.value);
                 setCurrentPage(1);
             }}
           />
           <Button variant="secondary" onClick={onExportCSV} icon={<FileText size={16} />} title="Export CSV">
             CSV
           </Button>
           <Button variant="primary" onClick={onExportExcel} icon={<FileSpreadsheet size={16} />} title="Export Excel">
             Excel
           </Button>
        </div>
      </div>

      {/* Table Area */}
      <div className="flex-1 overflow-auto relative">
        <table className="w-full text-left border-collapse">
          <thead className="bg-gray-100 dark:bg-gray-900 sticky top-0 z-10 shadow-sm">
            <tr>
              <th className="p-3 text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider border-b border-gray-200 dark:border-gray-700 w-12 text-center bg-gray-100 dark:bg-gray-900">
                #
              </th>
              {data.headers.map((header) => (
                <th 
                  key={header} 
                  className="p-3 text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider border-b border-gray-200 dark:border-gray-700 min-w-[150px] whitespace-nowrap bg-gray-100 dark:bg-gray-900"
                >
                  {header}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
            {currentRows.length > 0 ? (
              currentRows.map((row, idx) => (
                <tr key={idx} className="hover:bg-blue-50 dark:hover:bg-blue-900/10 transition-colors">
                  <td className="p-3 text-xs text-gray-400 text-center border-r border-gray-100 dark:border-gray-800">
                    {(page - 1) * ITEMS_PER_PAGE + idx + 1}
                  </td>
                  {data.headers.map((header) => (
                    <td
                      key={`${idx}-${header}`}
                      className="p-3 text-sm text-gray-700 dark:text-gray-300 whitespace-nowrap max-w-xs overflow-hidden text-ellipsis"
                      title={formatCell(row[header])}
                    >
                      {row[header] === null ? (
                        <span className="text-gray-400 italic">null</span>
                      ) : (
                        formatCell(row[header])
                      )}
                    </td>
                  ))}
                </tr>
              ))
            ) : (
               <tr>
                 <td colSpan={data.headers.length + 1} className="p-8 text-center text-gray-500">
                   No matching records found.
                 </td>
               </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination Footer */}
      {totalPages > 1 && (
        <div className="p-3 border-t border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 flex items-center justify-between">
           <span className="text-xs text-gray-500 dark:text-gray-400">
             Page {page} of {totalPages.toLocaleString()}
           </span>
           <div className="flex gap-1">
             <button
               onClick={() => handlePageChange(page - 1)}
               disabled={page === 1}
               aria-label="Previous page"
               className="p-1 rounded hover:bg-gray-200 dark:hover:bg-gray-700 disabled:opacity-30 disabled:cursor-not-allowed text-gray-600 dark:text-gray-300"
             >
               <ChevronLeft size={20} />
             </button>
             <button
               onClick={() => handlePageChange(page + 1)}
               disabled={page === totalPages}
               aria-label="Next page"
               className="p-1 rounded hover:bg-gray-200 dark:hover:bg-gray-700 disabled:opacity-30 disabled:cursor-not-allowed text-gray-600 dark:text-gray-300"
             >
               <ChevronRight size={20} />
             </button>
           </div>
        </div>
      )}
    </div>
  );
};

export default PreviewTable;
