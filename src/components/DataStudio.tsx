import React, { useState, useMemo } from 'react';
import { Dataset, ColumnMeta } from '../types';
import { exportToCSV, exportToJSON } from '../utils/dataProcessor';
import {
  Search,
  ArrowUpDown,
  Download,
  Filter,
  Layers,
  ChevronLeft,
  ChevronRight,
  Calculator,
  Hash,
  Type as TypeIcon,
  Calendar,
  Sparkles,
} from 'lucide-react';

interface DataStudioProps {
  dataset: Dataset;
  onAskAIAboutData?: (question: string) => void;
}

export const DataStudio: React.FC<DataStudioProps> = ({ dataset, onAskAIAboutData }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [sortColumn, setSortColumn] = useState<string | null>(null);
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc');
  const [currentPage, setCurrentPage] = useState(1);
  const [selectedColumn, setSelectedColumn] = useState<ColumnMeta | null>(
    dataset.columns.length > 0 ? dataset.columns[0] : null
  );
  const [pageSize, setPageSize] = useState(15);

  // Quick Aggregation State
  const [groupByCol, setGroupByCol] = useState<string>('');
  const [calcCol, setCalcCol] = useState<string>('');
  const [calcType, setCalcType] = useState<'sum' | 'avg' | 'count' | 'max' | 'min'>('sum');

  // Filter & Sort rows
  const filteredData = useMemo(() => {
    let result = [...dataset.data];

    if (searchTerm.trim()) {
      const lower = searchTerm.toLowerCase();
      result = result.filter((row) =>
        Object.values(row).some((val) =>
          String(val).toLowerCase().includes(lower)
        )
      );
    }

    if (sortColumn) {
      result.sort((a, b) => {
        const valA = a[sortColumn];
        const valB = b[sortColumn];
        if (valA === valB) return 0;
        if (valA === null || valA === undefined) return 1;
        if (valB === null || valB === undefined) return -1;

        if (typeof valA === 'number' && typeof valB === 'number') {
          return sortDirection === 'asc' ? valA - valB : valB - valA;
        }
        return sortDirection === 'asc'
          ? String(valA).localeCompare(String(valB))
          : String(valB).localeCompare(String(valA));
      });
    }

    return result;
  }, [dataset.data, searchTerm, sortColumn, sortDirection]);

  // Pagination
  const totalPages = Math.ceil(filteredData.length / pageSize) || 1;
  const paginatedData = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return filteredData.slice(start, start + pageSize);
  }, [filteredData, currentPage, pageSize]);

  const handleSort = (colName: string) => {
    if (sortColumn === colName) {
      if (sortDirection === 'asc') setSortDirection('desc');
      else {
        setSortColumn(null);
        setSortDirection('asc');
      }
    } else {
      setSortColumn(colName);
      setSortDirection('asc');
    }
  };

  // Group by aggregation result
  const aggregatedResults = useMemo(() => {
    if (!groupByCol || !calcCol) return null;

    const groups: Record<string, number[]> = {};
    dataset.data.forEach((row) => {
      const key = String(row[groupByCol] ?? 'N/A');
      const val = Number(row[calcCol]);
      if (!groups[key]) groups[key] = [];
      if (!isNaN(val)) groups[key].push(val);
    });

    return Object.entries(groups).map(([group, vals]) => {
      let result = 0;
      if (calcType === 'sum') result = vals.reduce((a, b) => a + b, 0);
      else if (calcType === 'avg') result = vals.length > 0 ? vals.reduce((a, b) => a + b, 0) / vals.length : 0;
      else if (calcType === 'count') result = vals.length;
      else if (calcType === 'max') result = vals.length > 0 ? Math.max(...vals) : 0;
      else if (calcType === 'min') result = vals.length > 0 ? Math.min(...vals) : 0;

      return {
        group,
        value: Math.round(result * 100) / 100,
        count: vals.length,
      };
    });
  }, [dataset.data, groupByCol, calcCol, calcType]);

  const numCols = dataset.columns.filter((c) => c.type === 'number');

  return (
    <div className="flex flex-col h-full overflow-hidden bg-slate-50 text-slate-900">
      {/* Top Bar / Stats Summary */}
      <div className="border-b border-slate-200 bg-white p-4 shadow-2xs">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <div className="flex items-center gap-2">
              <span className="p-1.5 rounded-xl bg-cyan-50 text-cyan-700 border border-cyan-200">
                <Layers className="w-4 h-4" />
              </span>
              <h2 className="text-base font-extrabold text-slate-900">{dataset.name}</h2>
              <span className="px-2 py-0.5 rounded-full text-[10px] font-mono font-bold bg-cyan-50 text-cyan-800 border border-cyan-200">
                {dataset.rowCount} baris • {dataset.columns.length} kolom
              </span>
            </div>
            <p className="text-xs text-slate-500 mt-1 font-medium">{dataset.description}</p>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => exportToCSV(dataset)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold bg-white hover:bg-slate-100 text-slate-700 border border-slate-200 transition shadow-2xs"
            >
              <Download className="w-3.5 h-3.5 text-cyan-600" /> Export CSV
            </button>
            <button
              onClick={() => exportToJSON(dataset)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold bg-white hover:bg-slate-100 text-slate-700 border border-slate-200 transition shadow-2xs"
            >
              <Download className="w-3.5 h-3.5 text-indigo-600" /> Export JSON
            </button>
            {onAskAIAboutData && (
              <button
                onClick={() =>
                  onAskAIAboutData(
                    `Tolong jelaskan ringkasan struktur dan insight utama dari dataset '${dataset.name}'.`
                  )
                }
                className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl text-xs font-bold bg-cyan-600 hover:bg-cyan-500 text-white transition shadow-sm"
              >
                <Sparkles className="w-3.5 h-3.5" /> Tanya AI
              </button>
            )}
          </div>
        </div>

        {/* Column Quick Meta Pill Bar */}
        <div className="flex items-center gap-2 overflow-x-auto mt-3 pt-2.5 border-t border-slate-100 pb-1 scrollbar-none">
          <span className="text-[11px] font-bold text-slate-400 shrink-0 uppercase tracking-wider">Kolom Data:</span>
          {dataset.columns.map((col) => (
            <button
              key={col.name}
              onClick={() => setSelectedColumn(col)}
              className={`flex items-center gap-1 px-2.5 py-1 rounded-xl text-xs transition shrink-0 font-medium ${
                selectedColumn?.name === col.name
                  ? 'bg-cyan-50 text-cyan-900 border border-cyan-300 font-bold shadow-2xs'
                  : 'bg-slate-100 text-slate-600 hover:text-slate-900 hover:bg-slate-200/70 border border-slate-200'
              }`}
            >
              {col.type === 'number' ? (
                <Hash className="w-3 h-3 text-cyan-600" />
              ) : col.type === 'date' ? (
                <Calendar className="w-3 h-3 text-amber-600" />
              ) : (
                <TypeIcon className="w-3 h-3 text-indigo-600" />
              )}
              <span>{col.name}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col lg:flex-row overflow-hidden">
        {/* Left/Main Data Grid Table */}
        <div className="flex-1 flex flex-col overflow-hidden p-4 border-r border-slate-200">
          {/* Table Controls */}
          <div className="flex flex-col sm:flex-row items-center justify-between gap-3 mb-3">
            <div className="relative w-full sm:w-72">
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => {
                  setSearchTerm(e.target.value);
                  setCurrentPage(1);
                }}
                placeholder="Cari baris data..."
                className="w-full pl-9 pr-3 py-1.5 text-xs bg-white border border-slate-200 rounded-xl text-slate-900 placeholder-slate-400 focus:outline-none focus:border-cyan-500 shadow-2xs"
              />
            </div>

            <div className="flex items-center gap-2 self-end sm:self-auto text-xs text-slate-500 font-medium">
              <span>Baris per halaman:</span>
              <select
                value={pageSize}
                onChange={(e) => {
                  setPageSize(Number(e.target.value));
                  setCurrentPage(1);
                }}
                className="bg-white border border-slate-200 text-slate-800 rounded-lg px-2 py-1 focus:outline-none focus:border-cyan-500 shadow-2xs"
              >
                <option value={10}>10</option>
                <option value={15}>15</option>
                <option value={25}>25</option>
                <option value={50}>50</option>
              </select>
            </div>
          </div>

          {/* Table Container */}
          <div className="flex-1 overflow-auto rounded-2xl border border-slate-200 bg-white shadow-2xs">
            <table className="w-full text-left text-xs border-collapse">
              <thead className="sticky top-0 z-10 bg-slate-100/90 border-b border-slate-200 text-slate-700">
                <tr>
                  <th className="px-3 py-2.5 text-slate-400 w-10 text-center font-bold">#</th>
                  {dataset.columns.map((col) => (
                    <th
                      key={col.name}
                      onClick={() => handleSort(col.name)}
                      className="px-3.5 py-2.5 font-bold cursor-pointer hover:bg-slate-200/60 transition select-none whitespace-nowrap"
                    >
                      <div className="flex items-center gap-1.5">
                        <span className={sortColumn === col.name ? 'text-cyan-800 font-extrabold' : 'text-slate-800'}>
                          {col.name}
                        </span>
                        <ArrowUpDown
                          className={`w-3 h-3 ${
                            sortColumn === col.name ? 'text-cyan-600' : 'text-slate-400'
                          }`}
                        />
                      </div>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-mono text-[11px]">
                {paginatedData.length === 0 ? (
                  <tr>
                    <td colSpan={dataset.columns.length + 1} className="py-8 text-center text-slate-400 font-sans">
                      Tidak ada data yang cocok dengan pencarian.
                    </td>
                  </tr>
                ) : (
                  paginatedData.map((row, rIdx) => (
                    <tr key={rIdx} className="hover:bg-cyan-50/50 transition-colors">
                      <td className="px-3 py-2 text-slate-400 text-center font-sans text-[10px]">
                        {(currentPage - 1) * pageSize + rIdx + 1}
                      </td>
                      {dataset.columns.map((col) => {
                        const val = row[col.name];
                        const isNum = typeof val === 'number';
                        return (
                          <td
                            key={col.name}
                            className={`px-3.5 py-2.5 whitespace-nowrap ${
                              isNum ? 'text-cyan-900 font-semibold' : 'text-slate-800'
                            }`}
                          >
                            {val === null || val === undefined
                              ? '—'
                              : isNum
                              ? val.toLocaleString()
                              : String(val)}
                          </td>
                        );
                      })}
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          {/* Pagination Controls */}
          <div className="flex items-center justify-between pt-3 text-xs text-slate-500 font-medium">
            <div>
              Menampilkan {(currentPage - 1) * pageSize + 1} -{' '}
              {Math.min(currentPage * pageSize, filteredData.length)} dari {filteredData.length} baris
            </div>
            <div className="flex items-center gap-1">
              <button
                disabled={currentPage === 1}
                onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                className="p-1.5 rounded-xl border border-slate-200 bg-white disabled:opacity-30 hover:bg-slate-100 transition shadow-2xs"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <span className="px-3 py-1 font-mono font-bold text-cyan-800">
                {currentPage} / {totalPages}
              </span>
              <button
                disabled={currentPage >= totalPages}
                onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                className="p-1.5 rounded-xl border border-slate-200 bg-white disabled:opacity-30 hover:bg-slate-100 transition shadow-2xs"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>

        {/* Right Inspector & Aggregation Panel */}
        <div className="w-full lg:w-80 flex flex-col p-4 bg-slate-50/70 overflow-y-auto space-y-4">
          {/* Selected Column Deep Stats */}
          {selectedColumn && (
            <div className="p-4 rounded-2xl border border-slate-200 bg-white shadow-2xs">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-1.5">
                  <span className="p-1 rounded-md bg-cyan-50 text-cyan-700">
                    <Filter className="w-3.5 h-3.5" />
                  </span>
                  <h3 className="text-xs font-bold text-slate-900">Inspeksi: {selectedColumn.name}</h3>
                </div>
                <span className="px-1.5 py-0.5 rounded text-[10px] font-mono font-bold uppercase bg-slate-100 text-cyan-800 border border-slate-200">
                  {selectedColumn.type}
                </span>
              </div>

              {selectedColumn.type === 'number' && selectedColumn.stats ? (
                <div className="grid grid-cols-2 gap-2 text-xs">
                  <div className="p-2 rounded-xl bg-slate-50 border border-slate-200">
                    <span className="text-[10px] text-slate-400 block font-medium">Rata-rata (Mean)</span>
                    <span className="font-mono font-bold text-cyan-900">
                      {selectedColumn.stats.mean?.toLocaleString()}
                    </span>
                  </div>
                  <div className="p-2 rounded-xl bg-slate-50 border border-slate-200">
                    <span className="text-[10px] text-slate-400 block font-medium">Median</span>
                    <span className="font-mono font-bold text-indigo-900">
                      {selectedColumn.stats.median?.toLocaleString()}
                    </span>
                  </div>
                  <div className="p-2 rounded-xl bg-slate-50 border border-slate-200">
                    <span className="text-[10px] text-slate-400 block font-medium">Minimum</span>
                    <span className="font-mono font-bold text-emerald-700">
                      {selectedColumn.stats.min?.toLocaleString()}
                    </span>
                  </div>
                  <div className="p-2 rounded-xl bg-slate-50 border border-slate-200">
                    <span className="text-[10px] text-slate-400 block font-medium">Maksimum</span>
                    <span className="font-mono font-bold text-rose-700">
                      {selectedColumn.stats.max?.toLocaleString()}
                    </span>
                  </div>
                  <div className="col-span-2 p-2 rounded-xl bg-slate-50 border border-slate-200 flex justify-between items-center">
                    <span className="text-[10px] text-slate-400 font-medium">Total Akumulasi (Sum)</span>
                    <span className="font-mono font-bold text-amber-700">
                      {selectedColumn.stats.sum?.toLocaleString()}
                    </span>
                  </div>
                </div>
              ) : selectedColumn.stats?.topCategories ? (
                <div className="space-y-1.5 text-xs">
                  <span className="text-[10px] text-slate-400 block mb-1 font-semibold">Top Frekuensi Kategori:</span>
                  {selectedColumn.stats.topCategories.map((item, idx) => (
                    <div
                      key={idx}
                      className="flex items-center justify-between p-1.5 rounded-xl bg-slate-50 border border-slate-200 text-[11px]"
                    >
                      <span className="text-slate-800 font-medium truncate max-w-[140px]">{item.value}</span>
                      <span className="font-mono font-bold text-cyan-800">{item.count}</span>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-xs text-slate-600 font-medium">
                  Total Nilai Unik: <span className="font-mono font-bold text-cyan-800">{selectedColumn.uniqueCount}</span>
                </div>
              )}
            </div>
          )}

          {/* Quick GroupBy / Pivot Aggregation Tool */}
          <div className="p-4 rounded-2xl border border-slate-200 bg-white shadow-2xs">
            <div className="flex items-center gap-1.5 mb-3">
              <span className="p-1 rounded-md bg-indigo-50 text-indigo-700">
                <Calculator className="w-3.5 h-3.5" />
              </span>
              <h3 className="text-xs font-bold text-slate-900">Kalkulator Agregasi & Pivot</h3>
            </div>

            <div className="space-y-2.5 text-xs">
              <div>
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">Group by (Kategori)</label>
                <select
                  value={groupByCol}
                  onChange={(e) => setGroupByCol(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 text-slate-900 rounded-xl px-2.5 py-1.5 focus:outline-none focus:border-cyan-500 font-medium"
                >
                  <option value="">-- Pilih Kolom Kategori --</option>
                  {dataset.columns.map((c) => (
                    <option key={c.name} value={c.name}>
                      {c.name} ({c.type})
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">Fungsi</label>
                  <select
                    value={calcType}
                    onChange={(e: any) => setCalcType(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 text-slate-900 rounded-xl px-2 py-1.5 focus:outline-none focus:border-cyan-500 uppercase font-mono font-bold"
                  >
                    <option value="sum">SUM</option>
                    <option value="avg">AVG</option>
                    <option value="count">COUNT</option>
                    <option value="max">MAX</option>
                    <option value="min">MIN</option>
                  </select>
                </div>
                <div>
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">Target Metrik</label>
                  <select
                    value={calcCol}
                    onChange={(e) => setCalcCol(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 text-slate-900 rounded-xl px-2 py-1.5 focus:outline-none focus:border-cyan-500 font-medium"
                  >
                    <option value="">-- Kolom Nilai --</option>
                    {numCols.map((c) => (
                      <option key={c.name} value={c.name}>
                        {c.name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Aggregation Result List */}
              {aggregatedResults && (
                <div className="mt-3 pt-2.5 border-t border-slate-100 space-y-1.5 max-h-48 overflow-y-auto">
                  <div className="flex justify-between text-[10px] font-bold text-slate-400 uppercase px-1">
                    <span>Grup ({groupByCol})</span>
                    <span>
                      {calcType.toUpperCase()}({calcCol})
                    </span>
                  </div>
                  {aggregatedResults.map((agg, idx) => (
                    <div
                      key={idx}
                      className="flex items-center justify-between p-2 rounded-xl bg-slate-50 border border-slate-200 text-[11px]"
                    >
                      <span className="text-slate-800 font-semibold truncate max-w-[110px]">{agg.group}</span>
                      <span className="font-mono font-bold text-cyan-800">{agg.value.toLocaleString()}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
