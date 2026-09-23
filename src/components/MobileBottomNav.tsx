import React from 'react';
import { MessageSquare, Table, TrendingUp, Sparkles } from 'lucide-react';

interface MobileBottomNavProps {
  activeTab: 'chat' | 'datagrid' | 'visualizer' | 'deepaudit';
  setActiveTab: (tab: 'chat' | 'datagrid' | 'visualizer' | 'deepaudit') => void;
}

export const MobileBottomNav: React.FC<MobileBottomNavProps> = ({ activeTab, setActiveTab }) => {
  const navItems = [
    { id: 'chat', label: 'AI Chat', icon: MessageSquare },
    { id: 'datagrid', label: 'Data Studio', icon: Table },
    { id: 'visualizer', label: 'Visualizer', icon: TrendingUp },
    { id: 'deepaudit', label: 'Deep Audit', icon: Sparkles },
  ];

  return (
    <div className="md:hidden fixed bottom-0 left-0 right-0 z-30 bg-white/95 backdrop-blur-lg border-t border-slate-200 py-2 px-3 flex items-center justify-around shadow-lg">
      {navItems.map((item) => {
        const Icon = item.icon;
        const isActive = activeTab === item.id;
        return (
          <button
            key={item.id}
            onClick={() => setActiveTab(item.id as any)}
            className={`flex flex-col items-center gap-1 px-3 py-1 rounded-xl transition-all ${
              isActive ? 'text-cyan-700 font-bold' : 'text-slate-500 hover:text-slate-900'
            }`}
          >
            <Icon className={`w-4 h-4 ${isActive ? 'text-cyan-600 scale-110' : 'text-slate-400'}`} />
            <span className="text-[10px] tracking-tight">{item.label}</span>
          </button>
        );
      })}
    </div>
  );
};
