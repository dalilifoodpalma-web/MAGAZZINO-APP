
import React from 'react';
import { LayoutGrid, Package, FileText, Settings, Database, Truck, ClipboardCheck } from 'lucide-react';
import { ViewType } from '../types';

interface SidebarProps {
  activeView: ViewType;
  setActiveView: (view: ViewType) => void;
  isOpen: boolean;
}

const Sidebar: React.FC<SidebarProps> = ({ activeView, setActiveView, isOpen }) => {
  const menuItems = [
    { id: 'dashboard', label: 'Dashboard', icon: LayoutGrid },
    { id: 'inventory', label: 'Magazzino', icon: Package },
    { id: 'invoices', label: 'Fatture', icon: FileText },
    { id: 'deliveryNotes', label: 'Bolle', icon: Truck },
    { id: 'physicalCounts', label: 'Inventario Fisico', icon: ClipboardCheck },
    { id: 'settings', label: 'Esporta Dati', icon: Settings },
  ];

  return (
    <header className="fixed top-0 left-0 right-0 h-20 bg-slate-900/95 backdrop-blur-md text-slate-300 z-50 shadow-xl border-b border-slate-800">
      <div className="max-w-7xl mx-auto h-full px-4 flex items-center justify-between gap-8">
        {/* Logo Section */}
        <div className="flex items-center gap-3 shrink-0">
          <div className="p-2 bg-indigo-600 text-white rounded-xl shadow-lg shadow-indigo-500/20">
            <Database size={24} />
          </div>
          <h1 className="text-xl font-black text-white tracking-tighter hidden md:block">DALILI'</h1>
        </div>

        {/* Navigation Items */}
        <nav className="flex items-center gap-1 overflow-x-auto no-scrollbar py-2">
          {menuItems.map((item) => {
            const isActive = activeView === item.id;
            return (
              <button
                key={item.id}
                onClick={() => setActiveView(item.id as ViewType)}
                className={`flex flex-col md:flex-row items-center gap-1 md:gap-3 px-3 md:px-5 py-2 rounded-xl transition-all whitespace-nowrap relative ${
                  isActive 
                    ? 'text-white' 
                    : 'text-slate-400 hover:text-white hover:bg-slate-800/50'
                }`}
              >
                <item.icon size={20} className={isActive ? 'text-indigo-400' : ''} />
                <span className={`text-[10px] md:text-sm font-bold uppercase md:capitalize tracking-tight ${isActive ? 'opacity-100' : 'opacity-80'}`}>
                  {item.label}
                </span>
                {isActive && (
                  <div className="absolute -bottom-2 left-1/2 -translate-x-1/2 w-1 h-1 bg-indigo-400 rounded-full shadow-[0_0_8px_rgba(129,140,248,0.8)]"></div>
                )}
              </button>
            );
          })}
        </nav>

        {/* Status Indicator (Desktop only) */}
        <div className="hidden lg:flex items-center gap-3 px-4 py-2 bg-slate-800/50 rounded-2xl border border-slate-700 shrink-0">
          <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></div>
          <span className="text-[11px] text-slate-300 font-black uppercase tracking-widest">IA Attiva</span>
        </div>
      </div>
      
      <style>{`
        .no-scrollbar::-webkit-scrollbar { display: none; }
        .no-scrollbar { -ms-overflow-style: none; scrollbar-width: none; }
      `}</style>
    </header>
  );
};

export default Sidebar;
