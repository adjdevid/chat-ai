import React from 'react';
import { Dataset } from '../types';
import {
  MessageSquare,
  Table,
  TrendingUp,
  Sparkles,
  Menu,
  X,
  Cpu,
  Zap,
  Settings as SettingsIcon,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';

interface NavbarProps {
  activeTab: 'chat' | 'datagrid' | 'visualizer' | 'deepaudit';
  setActiveTab: (tab: 'chat' | 'datagrid' | 'visualizer' | 'deepaudit') => void;
  datasets: Dataset[];
  activeDataset: Dataset;
  onSelectDataset: (d: Dataset) => void;
  onOpenSettingsModal: () => void;
  onToggleSidebar: () => void;
  isSidebarOpen: boolean;
  tokensPerSecMetric: number;
}

export const Navbar: React.FC<NavbarProps> = ({
  activeTab,
  setActiveTab,
  datasets,
  activeDataset,
  onSelectDataset,
  onOpenSettingsModal,
  onToggleSidebar,
  isSidebarOpen,
  tokensPerSecMetric,
}) => {
  const { user, profile, guestTokensUsed, guestDailyLimit } = useAuth();

  // Calculate current token usage & limit
  const usedTokens = user && profile ? profile.tokensUsedToday : guestTokensUsed;
  const maxTokens = user && profile ? profile.dailyLimit : guestDailyLimit;
  const usagePercentage = Math.min(100, Math.round((usedTokens / maxTokens) * 100));

  return (
    <header className="h-16 border-b border-slate-200/90 bg-white/95 backdrop-blur-md px-3 lg:px-6 flex items-center justify-between z-30 sticky top-0 shadow-2xs">
      {/* Brand & Mobile Sidebar Toggle */}
      <div className="flex items-center gap-3">
        <button
          onClick={onToggleSidebar}
          className="p-2 rounded-xl text-slate-500 hover:text-slate-800 hover:bg-slate-100 transition lg:hidden"
          title="Toggle Navigation"
        >
          {isSidebarOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
        </button>

        {/* ADJDEV AI Logo */}
        <div className="flex items-center gap-2.5 cursor-pointer" onClick={() => setActiveTab('chat')}>
          <div className="w-9 h-9 rounded-2xl bg-gradient-to-tr from-cyan-600 via-indigo-600 to-purple-600 p-0.5 shadow-sm">
            <div className="w-full h-full bg-white rounded-[14px] flex items-center justify-center">
              <Cpu className="w-5 h-5 text-cyan-600" />
            </div>
          </div>
          <div>
            <div className="flex items-center gap-1.5">
              <span className="font-extrabold text-sm lg:text-base tracking-tight text-slate-900 font-sans">
                ADJDEV <span className="text-cyan-600">AI</span>
              </span>
              <span className="hidden sm:inline-flex items-center px-1.5 py-0.2 rounded text-[9px] font-mono font-bold bg-cyan-50 text-cyan-800 border border-cyan-200">
                PRO
              </span>
            </div>
            <p className="text-[10px] text-slate-500 -mt-0.5 hidden sm:block font-mono">
              Flash Lite Intelligence Core
            </p>
          </div>
        </div>
      </div>

      {/* Main View Switcher Tabs (Desktop) */}
      <nav className="hidden md:flex items-center gap-1 p-1 rounded-2xl bg-slate-100/80 border border-slate-200/80">
        {[
          { id: 'chat', label: 'AI Chat', icon: MessageSquare },
          { id: 'datagrid', label: 'Data Studio', icon: Table },
          { id: 'visualizer', label: 'Visualizer', icon: TrendingUp },
          { id: 'deepaudit', label: 'Deep Audit', icon: Sparkles },
        ].map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`flex items-center gap-2 px-3.5 py-1.5 rounded-xl text-xs font-semibold transition-all ${
                isActive
                  ? 'bg-white text-cyan-800 border border-slate-200 shadow-2xs font-bold'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/50'
              }`}
            >
              <Icon className={`w-3.5 h-3.5 ${isActive ? 'text-cyan-600' : 'text-slate-500'}`} />
              <span>{tab.label}</span>
            </button>
          );
        })}
      </nav>

      {/* Right Controls: Token Usage Meter + Dataset Selector */}
      <div className="flex items-center gap-1.5 sm:gap-2 shrink-0 max-w-[55%] sm:max-w-none">
        {/* Token Usage Badge / Meter (Opens Settings) */}
        <div
          onClick={onOpenSettingsModal}
          className="hidden sm:flex items-center gap-2 px-2.5 py-1 rounded-xl bg-slate-50 hover:bg-slate-100 border border-slate-200 cursor-pointer transition text-xs font-medium shrink-0"
          title="Klik untuk Pengaturan Token & Akun"
        >
          <Zap className="w-3.5 h-3.5 text-amber-500 shrink-0" />
          <div className="flex flex-col text-[10px]">
            <div className="flex items-center justify-between gap-1.5">
              <span className="font-bold text-slate-800">
                {usedTokens.toLocaleString()} / {maxTokens.toLocaleString()} tok
              </span>
              <span className={`font-mono font-bold ${usagePercentage > 85 ? 'text-rose-600' : 'text-cyan-700'}`}>
                {usagePercentage}%
              </span>
            </div>
            <div className="w-20 lg:w-24 h-1 bg-slate-200 rounded-full overflow-hidden mt-0.5">
              <div
                className={`h-full transition-all duration-300 ${
                  usagePercentage > 85 ? 'bg-rose-500' : 'bg-cyan-600'
                }`}
                style={{ width: `${usagePercentage}%` }}
              />
            </div>
          </div>
        </div>

        {/* Dataset Selector Dropdown */}
        <div className="relative min-w-0">
          <select
            value={activeDataset.id}
            onChange={(e) => {
              const selected = datasets.find((d) => d.id === e.target.value);
              if (selected) onSelectDataset(selected);
            }}
            className="text-xs bg-slate-50 border border-slate-200 text-slate-800 font-medium rounded-xl px-2 py-1.5 focus:outline-none focus:border-cyan-500 w-full max-w-[120px] xs:max-w-[140px] sm:max-w-[170px] truncate shadow-2xs"
          >
            {datasets.map((d) => (
              <option key={d.id} value={d.id}>
                {d.name}
              </option>
            ))}
          </select>
        </div>
      </div>
    </header>
  );
};

