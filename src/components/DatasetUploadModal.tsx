import React, { useState, useRef } from 'react';
import { Upload, FileText, Database, X, CheckCircle2, AlertCircle, Sparkles } from 'lucide-react';
import { Dataset } from '../types';
import { parseCSVFile, parseRawJSON } from '../utils/dataProcessor';
import { PRESET_DATASETS } from '../data/presetDatasets';

interface DatasetUploadModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectDataset: (dataset: Dataset) => void;
}

export const DatasetUploadModal: React.FC<DatasetUploadModalProps> = ({
  isOpen,
  onClose,
  onSelectDataset,
}) => {
  const [activeTab, setActiveTab] = useState<'upload' | 'paste' | 'templates'>('upload');
  const [dragOver, setDragOver] = useState(false);
  const [pastedText, setPastedText] = useState('');
  const [datasetName, setDatasetName] = useState('');
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  if (!isOpen) return null;

  const handleFile = async (file: File) => {
    setErrorMsg(null);
    setIsLoading(true);
    try {
      if (file.name.endsWith('.csv') || file.name.endsWith('.tsv') || file.name.endsWith('.txt')) {
        const parsed = await parseCSVFile(file);
        onSelectDataset(parsed);
        onClose();
      } else if (file.name.endsWith('.json')) {
        const text = await file.text();
        const parsed = parseRawJSON(text, file.name.replace('.json', ''));
        onSelectDataset(parsed);
        onClose();
      } else {
        throw new Error('Format file tidak didukung. Harap gunakan CSV, TSV, atau JSON.');
      }
    } catch (err: any) {
      setErrorMsg(err?.message || 'Gagal memproses file.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      handleFile(e.dataTransfer.files[0]);
    }
  };

  const handlePasteSubmit = () => {
    setErrorMsg(null);
    if (!pastedText.trim()) {
      setErrorMsg('Harap masukkan data teks.');
      return;
    }
    try {
      // Check if JSON or CSV
      const trimmed = pastedText.trim();
      let parsed: Dataset;
      if (trimmed.startsWith('[') || trimmed.startsWith('{')) {
        parsed = parseRawJSON(trimmed, datasetName || 'Pasted JSON Dataset');
      } else {
        // Parse CSV string via Blob
        const blob = new Blob([trimmed], { type: 'text/csv' });
        const dummyFile = new File([blob], `${datasetName || 'Pasted_Data'}.csv`, { type: 'text/csv' });
        parseCSVFile(dummyFile).then((res) => {
          onSelectDataset(res);
          onClose();
        }).catch((err) => setErrorMsg(err.message));
        return;
      }
      onSelectDataset(parsed);
      onClose();
    } catch (err: any) {
      setErrorMsg(`Format parsing gagal: ${err?.message}`);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-xs p-4 overflow-y-auto">
      <div className="relative w-full max-w-2xl rounded-3xl border border-slate-200 bg-white shadow-2xl p-6 text-slate-800 animate-in fade-in zoom-in-95 duration-200">
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-slate-100">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-2xl bg-cyan-50 border border-cyan-200 text-cyan-700">
              <Database className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-extrabold text-slate-900">Import & Muat Dataset</h3>
              <p className="text-xs text-slate-500 font-medium">Pilih template enterprise atau unggah file data untuk analisis real-time</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-xl text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab Selector */}
        <div className="flex items-center gap-2 mt-4 p-1 bg-slate-100 rounded-2xl border border-slate-200">
          <button
            onClick={() => setActiveTab('upload')}
            className={`flex-1 flex items-center justify-center gap-2 py-2 text-xs font-bold rounded-xl transition ${
              activeTab === 'upload'
                ? 'bg-white text-cyan-900 shadow-2xs'
                : 'text-slate-500 hover:text-slate-900'
            }`}
          >
            <Upload className="w-3.5 h-3.5" /> Unggah File (CSV/JSON)
          </button>
          <button
            onClick={() => setActiveTab('paste')}
            className={`flex-1 flex items-center justify-center gap-2 py-2 text-xs font-bold rounded-xl transition ${
              activeTab === 'paste'
                ? 'bg-white text-cyan-900 shadow-2xs'
                : 'text-slate-500 hover:text-slate-900'
            }`}
          >
            <FileText className="w-3.5 h-3.5" /> Tempel Data Teks
          </button>
          <button
            onClick={() => setActiveTab('templates')}
            className={`flex-1 flex items-center justify-center gap-2 py-2 text-xs font-bold rounded-xl transition ${
              activeTab === 'templates'
                ? 'bg-white text-cyan-900 shadow-2xs'
                : 'text-slate-500 hover:text-slate-900'
            }`}
          >
            <Sparkles className="w-3.5 h-3.5 text-amber-500" /> Template Siap Pakai
          </button>
        </div>

        {/* Error Alert */}
        {errorMsg && (
          <div className="mt-4 flex items-center gap-2 rounded-2xl bg-rose-50 border border-rose-200 p-3 text-xs text-rose-800 font-medium">
            <AlertCircle className="w-4 h-4 shrink-0 text-rose-600" />
            <span>{errorMsg}</span>
          </div>
        )}

        {/* Tab 1: Upload File */}
        {activeTab === 'upload' && (
          <div className="mt-4">
            <input
              type="file"
              ref={fileInputRef}
              onChange={(e) => e.target.files && handleFile(e.target.files[0])}
              accept=".csv,.json,.tsv,.txt"
              className="hidden"
            />
            <div
              onDragOver={(e) => {
                e.preventDefault();
                setDragOver(true);
              }}
              onDragLeave={() => setDragOver(false)}
              onDrop={handleDrop}
              onClick={() => fileInputRef.current?.click()}
              className={`flex flex-col items-center justify-center p-8 rounded-2xl border-2 border-dashed cursor-pointer transition-all ${
                dragOver
                  ? 'border-cyan-500 bg-cyan-50/50'
                  : 'border-slate-300 hover:border-cyan-400 bg-slate-50 hover:bg-cyan-50/30'
              }`}
            >
              <div className="p-3 rounded-2xl bg-cyan-100 border border-cyan-200 text-cyan-700 mb-3">
                <Upload className="w-8 h-8" />
              </div>
              <p className="text-sm font-bold text-slate-900">
                {isLoading ? 'Sedang memproses dataset...' : 'Klik atau seret file ke sini'}
              </p>
              <p className="text-xs text-slate-500 mt-1 font-medium">Mendukung file .CSV, .TSV, atau .JSON (hingga 25MB)</p>
              <div className="flex gap-2 mt-4 text-[11px] text-cyan-900 font-mono font-bold">
                <span className="px-2.5 py-1 rounded-lg bg-white border border-slate-200 shadow-2xs">Auto Schema Detection</span>
                <span className="px-2.5 py-1 rounded-lg bg-white border border-slate-200 shadow-2xs">Real-time Statistics</span>
              </div>
            </div>
          </div>
        )}

        {/* Tab 2: Paste Raw Text */}
        {activeTab === 'paste' && (
          <div className="mt-4 space-y-3">
            <div>
              <label className="text-xs font-bold text-slate-700 mb-1 block">Nama Dataset</label>
              <input
                type="text"
                value={datasetName}
                onChange={(e) => setDatasetName(e.target.value)}
                placeholder="Contoh: Q3 Sales Data / Server Logs"
                className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl text-slate-900 placeholder-slate-400 focus:outline-none focus:border-cyan-500 font-medium"
              />
            </div>
            <div>
              <label className="text-xs font-bold text-slate-700 mb-1 block">Tempel CSV atau JSON Array</label>
              <textarea
                rows={7}
                value={pastedText}
                onChange={(e) => setPastedText(e.target.value)}
                placeholder={`id,month,revenue,users\n1,Jan,12000,450\n2,Feb,14500,520\n\n- ATAU -\n\n[{"month": "Jan", "revenue": 12000}, {"month": "Feb", "revenue": 14500}]`}
                className="w-full p-3 text-xs font-mono bg-slate-50 border border-slate-200 rounded-xl text-slate-900 placeholder-slate-400 focus:outline-none focus:border-cyan-500"
              />
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <button
                onClick={onClose}
                className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 hover:text-slate-900 hover:bg-slate-100 transition"
              >
                Batal
              </button>
              <button
                onClick={handlePasteSubmit}
                className="px-5 py-2 rounded-xl text-xs font-bold bg-cyan-600 hover:bg-cyan-500 text-white transition shadow-sm"
              >
                Proses & Muat Data
              </button>
            </div>
          </div>
        )}

        {/* Tab 3: Preset Templates */}
        {activeTab === 'templates' && (
          <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 gap-3 max-h-[340px] overflow-y-auto pr-1">
            {PRESET_DATASETS.map((d) => (
              <div
                key={d.id}
                onClick={() => {
                  onSelectDataset(d);
                  onClose();
                }}
                className="group p-3.5 rounded-2xl border border-slate-200 bg-slate-50 hover:bg-cyan-50/60 hover:border-cyan-300 cursor-pointer transition-all flex flex-col justify-between shadow-2xs"
              >
                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="text-xs font-bold text-slate-900 group-hover:text-cyan-900 transition">
                      {d.name}
                    </span>
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-mono font-bold bg-white text-cyan-800 border border-slate-200">
                      {d.rowCount} baris
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-500 font-medium line-clamp-2 leading-relaxed">{d.description}</p>
                </div>
                <div className="flex items-center justify-between mt-3 pt-2 border-t border-slate-200 text-[10px] text-slate-500">
                  <span>{d.columns.length} Kolom</span>
                  <span className="flex items-center gap-1 text-cyan-700 font-bold">
                    <CheckCircle2 className="w-3 h-3" /> Pilih Template
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
