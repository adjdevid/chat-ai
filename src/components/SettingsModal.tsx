import React, { useState } from 'react';
import {
  X,
  Settings as SettingsIcon,
  User as UserIcon,
  Zap,
  Upload,
  LogOut,
  ShieldCheck,
  Database,
  Sparkles,
  Sliders,
  CheckCircle2,
  AlertCircle,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { Dataset } from '../types';

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  datasets: Dataset[];
  activeDataset: Dataset;
  onSelectDataset: (d: Dataset) => void;
  onOpenUploadModal: () => void;
}

export const SettingsModal: React.FC<SettingsModalProps> = ({
  isOpen,
  onClose,
  datasets,
  activeDataset,
  onSelectDataset,
  onOpenUploadModal,
}) => {
  const [activeTab, setActiveTab] = useState<'account' | 'datasets'>('account');
  const {
    user,
    profile,
    signInWithGoogle,
    logout,
    guestTokensUsed,
    guestDailyLimit,
    isAuthPending,
    authError,
    clearAuthError,
  } = useAuth();

  if (!isOpen) return null;

  const usedTokens = user && profile ? profile.tokensUsedToday : guestTokensUsed;
  const maxTokens = user && profile ? profile.dailyLimit : guestDailyLimit;
  const usagePercentage = Math.min(100, Math.round((usedTokens / maxTokens) * 100));

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-3 sm:p-4 overflow-y-auto">
      <div className="relative w-full max-w-2xl max-h-[90vh] overflow-y-auto rounded-3xl border border-slate-200 bg-white p-4 sm:p-6 shadow-2xl text-slate-800 animate-in fade-in zoom-in-95 duration-200">
        {/* Header */}
        <div className="flex items-center justify-between pb-3 sm:pb-4 border-b border-slate-100">
          <div className="flex items-center gap-2.5 sm:gap-3">
            <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-2xl bg-black border border-slate-800 p-0.5 shadow-sm overflow-hidden flex items-center justify-center shrink-0">
              <img
                src="/file_00000000099c81fa869151d29ba1a5e7.png"
                alt="ADJDEV"
                className="w-full h-full object-contain rounded-xl"
              />
            </div>
            <div>
              <h3 className="text-sm sm:text-base font-extrabold text-slate-900">Pengaturan Sistem & Akun</h3>
              <p className="text-[11px] sm:text-xs text-slate-500 font-medium">
                Kelola profil Google, batas token, dan import data
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-xl text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition shrink-0"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab Navigation */}
        <div className="flex items-center gap-1 sm:gap-2 mt-3 sm:mt-4 p-1 bg-slate-100 rounded-2xl border border-slate-200 overflow-x-auto">
          <button
            onClick={() => setActiveTab('account')}
            className={`flex-1 min-w-[90px] flex items-center justify-center gap-1.5 py-2 px-2 text-[11px] sm:text-xs font-bold rounded-xl transition whitespace-nowrap ${
              activeTab === 'account'
                ? 'bg-white text-cyan-900 shadow-2xs'
                : 'text-slate-500 hover:text-slate-900'
            }`}
          >
            <UserIcon className="w-3.5 h-3.5 shrink-0" /> <span>Akun & Token</span>
          </button>
          <button
            onClick={() => setActiveTab('datasets')}
            className={`flex-1 min-w-[90px] flex items-center justify-center gap-1.5 py-2 px-2 text-[11px] sm:text-xs font-bold rounded-xl transition whitespace-nowrap ${
              activeTab === 'datasets'
                ? 'bg-white text-cyan-900 shadow-2xs'
                : 'text-slate-500 hover:text-slate-900'
            }`}
          >
            <Database className="w-3.5 h-3.5 shrink-0" /> <span>Import Data</span>
          </button>
        </div>

        {/* Error Alert */}
        {authError && (
          <div className="mt-4 flex items-center justify-between rounded-2xl bg-rose-50 border border-rose-200 p-3 text-xs text-rose-800 font-medium">
            <div className="flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0 text-rose-600" />
              <span>{authError}</span>
            </div>
            <button onClick={clearAuthError} className="p-1 text-rose-600 hover:text-rose-900">
              <X className="w-4 h-4" />
            </button>
          </div>
        )}

        {/* TAB 1: Account & Token Limits */}
        {activeTab === 'account' && (
          <div className="mt-5 space-y-4">
            {user ? (
              <div className="p-4 rounded-2xl border border-cyan-200 bg-cyan-50/40 flex items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                  {user.photoURL ? (
                    <img src={user.photoURL} alt="" className="w-12 h-12 rounded-2xl object-cover shadow-2xs" />
                  ) : (
                    <div className="w-12 h-12 rounded-2xl bg-cyan-600 text-white font-black text-lg flex items-center justify-center">
                      {(user.displayName || user.email || 'U')[0].toUpperCase()}
                    </div>
                  )}
                  <div>
                    <div className="font-extrabold text-slate-900 text-sm">{user.displayName || 'Pengguna Google'}</div>
                    <div className="text-xs text-slate-500 font-mono">{user.email}</div>
                    <span className="mt-1 inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-mono font-bold bg-cyan-100 text-cyan-800 border border-cyan-200">
                      <ShieldCheck className="w-3 h-3 text-cyan-700" /> Google Terverifikasi
                    </span>
                  </div>
                </div>

                <button
                  onClick={() => logout()}
                  className="px-4 py-2 rounded-xl bg-rose-50 hover:bg-rose-100 text-rose-700 font-bold border border-rose-200 transition text-xs flex items-center gap-1.5 shrink-0"
                >
                  <LogOut className="w-3.5 h-3.5" /> Logout
                </button>
              </div>
            ) : (
              <div className="p-5 rounded-2xl border border-slate-200 bg-slate-50 space-y-3">
                <div className="flex items-start gap-3">
                  <div className="p-2.5 rounded-xl bg-cyan-100 text-cyan-700">
                    <UserIcon className="w-6 h-6" />
                  </div>
                  <div className="space-y-1">
                    <h4 className="text-sm font-extrabold text-slate-900">Anda Menggunakan Mode Tamu</h4>
                    <p className="text-xs text-slate-500 font-medium leading-relaxed">
                      Masuk dengan akun Google untuk meningkatkan kuota token dari <strong>10.000</strong> menjadi <strong>50.000 token per hari</strong> serta menyimpan sesi secara persisten.
                    </p>
                  </div>
                </div>

                <button
                  onClick={() => signInWithGoogle()}
                  disabled={isAuthPending}
                  className="w-full py-2.5 rounded-xl text-xs font-extrabold bg-gradient-to-r from-cyan-600 to-indigo-600 hover:opacity-95 disabled:opacity-50 text-white transition shadow-sm flex items-center justify-center gap-2"
                >
                  <UserIcon className={`w-4 h-4 ${isAuthPending ? 'animate-spin' : ''}`} />
                  {isAuthPending ? 'Menghubungkan ke Google...' : 'Masuk dengan Akun Google'}
                </button>
              </div>
            )}

            {/* Token Quota Meter Card */}
            <div className="p-4 rounded-2xl border border-slate-200 bg-white space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-extrabold text-slate-900 flex items-center gap-1.5">
                  <Zap className="w-4 h-4 text-amber-500" /> Kuota Token Harian
                </span>
                <span className="text-xs font-mono font-bold text-cyan-800">
                  {usedTokens.toLocaleString()} / {maxTokens.toLocaleString()} Tokens ({usagePercentage}%)
                </span>
              </div>

              <div className="w-full h-2.5 bg-slate-100 rounded-full overflow-hidden border border-slate-200">
                <div
                  className={`h-full transition-all duration-300 ${
                    usagePercentage > 85 ? 'bg-rose-500' : 'bg-gradient-to-r from-cyan-500 to-indigo-600'
                  }`}
                  style={{ width: `${usagePercentage}%` }}
                />
              </div>

              <div className="grid grid-cols-2 gap-2 text-[11px] pt-1">
                <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-200">
                  <span className="text-slate-400 block font-medium">Batas Akun</span>
                  <span className="font-extrabold text-slate-900 font-mono text-xs">{maxTokens.toLocaleString()} tok/hari</span>
                </div>
                <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-200">
                  <span className="text-slate-400 block font-medium">Tersisa Hari Ini</span>
                  <span className="font-extrabold text-emerald-700 font-mono text-xs">
                    {Math.max(0, maxTokens - usedTokens).toLocaleString()} tok
                  </span>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* TAB 2: Datasets & Import */}
        {activeTab === 'datasets' && (
          <div className="mt-5 space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h4 className="text-xs font-extrabold uppercase tracking-wider text-slate-400">Pilih Dataset Aktif</h4>
                <p className="text-xs text-slate-500 font-medium">Gunakan dataset untuk analisis data studio & AI deep audit</p>
              </div>

              <button
                onClick={() => {
                  onClose();
                  onOpenUploadModal();
                }}
                className="px-3.5 py-2 rounded-xl text-xs font-bold bg-cyan-50 hover:bg-cyan-100 text-cyan-800 border border-cyan-200 transition flex items-center gap-1.5 shrink-0"
              >
                <Upload className="w-3.5 h-3.5" /> Import Dataset Baru
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 max-h-[260px] overflow-y-auto pr-1">
              {datasets.map((d) => {
                const isSelected = activeDataset.id === d.id;
                return (
                  <div
                    key={d.id}
                    onClick={() => onSelectDataset(d)}
                    className={`p-3 rounded-2xl border transition cursor-pointer flex items-center justify-between ${
                      isSelected
                        ? 'bg-cyan-50/80 border-cyan-300 text-cyan-900'
                        : 'bg-slate-50 border-slate-200 hover:bg-slate-100'
                    }`}
                  >
                    <div>
                      <div className="text-xs font-bold text-slate-900">{d.name}</div>
                      <div className="text-[10px] text-slate-500 font-mono mt-0.5">
                        {d.rowCount} baris • {d.columns.length} kolom
                      </div>
                    </div>
                    {isSelected && <CheckCircle2 className="w-4 h-4 text-cyan-700 shrink-0" />}
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Footer */}
        <div className="mt-6 pt-4 border-t border-slate-100 flex justify-end">
          <button
            onClick={onClose}
            className="px-5 py-2 rounded-xl text-xs font-bold bg-slate-900 hover:bg-slate-800 text-white transition shadow-sm"
          >
            Tutup
          </button>
        </div>
      </div>
    </div>
  );
};
