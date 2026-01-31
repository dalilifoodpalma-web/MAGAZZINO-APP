
import React from 'react';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import { Package, TrendingUp, Euro, Calendar, Users, Tag, Box, Scale, Layers } from 'lucide-react';
import { Product, Invoice } from '../types';

interface DashboardProps {
  inventory: Product[];
  invoices: Invoice[];
  onKpiClick: (group: 'month' | 'category' | 'supplier' | 'none') => void;
}

const COLORS = ['#6366f1', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899'];
const UNIT_COLORS: Record<string, string> = {
  'UD': '#6366f1', // Colore per Unità/Pezzi
  'KG': '#10b981',
  'CJ': '#f59e0b'
};

const Dashboard: React.FC<DashboardProps> = ({ inventory, invoices, onKpiClick }) => {
  const totalValue = inventory.reduce((sum, p) => sum + p.totalPrice, 0);
  const uniqueProducts = new Set(inventory.map(p => p.name.toLowerCase())).size;
  const totalSuppliers = new Set(invoices.map(i => i.supplier.toLowerCase())).size;

  // Normalizza unità e calcola statistiche
  const statsByUnit = inventory.reduce((acc, p) => {
    let unit = (p.unitOfMeasure || 'UD').toUpperCase();
    if (['UN', 'PZ', 'UD'].includes(unit)) unit = 'UD';
    acc[unit] = (acc[unit] || 0) + p.quantity;
    return acc;
  }, {} as Record<string, number>);

  const unitChartData = Object.entries(statsByUnit).map(([name, value]) => ({ name, value }));

  const categoryDataMap = inventory.reduce((acc, p) => {
    const cat = p.category || 'Altro';
    acc[cat] = (acc[cat] || 0) + p.quantity;
    return acc;
  }, {} as Record<string, number>);

  const categoryChartData = Object.entries(categoryDataMap).map(([name, value]) => ({ name, value }));

  const monthlyDataMap = invoices.reduce((acc, inv) => {
    const month = new Date(inv.date).toLocaleString('it-IT', { month: 'short' });
    acc[month] = (acc[month] || 0) + inv.totalAmount;
    return acc;
  }, {} as Record<string, number>);

  const monthlyChartData = Object.entries(monthlyDataMap).map(([name, valore]) => ({ name, valore }))
    .sort((a,b) => {
      const months = ['gen', 'feb', 'mar', 'apr', 'mag', 'giu', 'lug', 'ago', 'set', 'ott', 'nov', 'dic'];
      return months.indexOf(a.name.toLowerCase()) - months.indexOf(b.name.toLowerCase());
    });

  const formatCurrency = (val: number) => {
    return val.toLocaleString('it-IT', { style: 'currency', currency: 'EUR' });
  };

  const formatNumber = (val: number) => {
    return val.toLocaleString('it-IT', { minimumFractionDigits: 0, maximumFractionDigits: 2 });
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      <header className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-slate-900">Dashboard Magazzino</h1>
          <p className="text-slate-500">Riepilogo scorte consolidate raggruppate per UD.</p>
        </div>
        <div className="flex items-center gap-2 bg-white px-4 py-2 rounded-lg shadow-sm border border-slate-200">
          <Calendar size={18} className="text-indigo-600" />
          <span className="text-sm font-medium">{new Date().toLocaleDateString('it-IT', { day: 'numeric', month: 'long', year: 'numeric' })}</span>
        </div>
      </header>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <button onClick={() => onKpiClick('none')} className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200 text-left hover:shadow-md transition-all group">
          <div className="p-2 bg-indigo-50 text-indigo-600 rounded-lg w-fit mb-4 group-hover:bg-indigo-600 group-hover:text-white transition-colors"><Box size={24} /></div>
          <p className="text-xs text-slate-500 font-bold uppercase tracking-widest">Prodotti Unici</p>
          <h3 className="text-2xl font-black text-slate-900 mt-1">{uniqueProducts}</h3>
        </button>

        <button onClick={() => onKpiClick('none')} className="bg-white p-5 rounded-2xl shadow-sm border border-slate-200 text-left hover:shadow-md transition-all group">
          <div className="p-2 bg-indigo-50 text-indigo-600 rounded-lg w-fit mb-3 group-hover:bg-indigo-600 group-hover:text-white transition-colors"><Package size={24} /></div>
          <p className="text-xs text-slate-500 font-bold uppercase tracking-widest mb-2 text-center">Riepilogo Giacenze</p>
          <div className="grid grid-cols-2 gap-x-4 gap-y-1">
            <div className="flex flex-col">
              <span className="text-[9px] font-bold text-slate-400 uppercase tracking-tighter">UD (Unità)</span>
              <span className="text-sm font-black text-indigo-600">{formatNumber(statsByUnit['UD'] || 0)}</span>
            </div>
            <div className="flex flex-col">
              <span className="text-[9px] font-bold text-slate-400 uppercase tracking-tighter">KG (Chili)</span>
              <span className="text-sm font-black text-emerald-600">{formatNumber(statsByUnit['KG'] || 0)}</span>
            </div>
            <div className="flex flex-col">
              <span className="text-[9px] font-bold text-slate-400 uppercase tracking-tighter">CJ (Conf.)</span>
              <span className="text-sm font-black text-amber-600">{formatNumber(statsByUnit['CJ'] || 0)}</span>
            </div>
          </div>
        </button>

        <button onClick={() => onKpiClick('supplier')} className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200 text-left hover:shadow-md transition-all group">
          <div className="p-2 bg-amber-50 text-amber-600 rounded-lg w-fit mb-4 group-hover:bg-amber-600 group-hover:text-white transition-colors"><Users size={24} /></div>
          <p className="text-xs text-slate-500 font-bold uppercase tracking-widest">Fornitori</p>
          <h3 className="text-2xl font-black text-slate-900 mt-1">{totalSuppliers}</h3>
        </button>

        <button onClick={() => onKpiClick('none')} className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200 text-left hover:shadow-md transition-all group">
          <div className="p-2 bg-rose-50 text-rose-600 rounded-lg w-fit mb-4 group-hover:bg-rose-600 group-hover:text-white transition-colors"><Euro size={24} /></div>
          <p className="text-xs text-slate-500 font-bold uppercase tracking-widest">Valore Stock</p>
          <h3 className="text-2xl font-black text-slate-900 mt-1">{formatCurrency(totalValue)}</h3>
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 bg-white p-8 rounded-2xl shadow-sm border border-slate-200">
          <h3 className="text-lg font-bold mb-6 flex items-center gap-2 text-slate-800">
            <TrendingUp size={20} className="text-indigo-600" /> Storico Acquisti (€)
          </h3>
          <div className="h-[300px]">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={monthlyChartData}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                <XAxis dataKey="name" axisLine={false} tickLine={false} />
                <YAxis axisLine={false} tickLine={false} />
                <Tooltip 
                  // Fix: Casting unknown value to number using Number() to prevent TS error
                  formatter={(value: any) => [formatCurrency(Number(value)), 'Spesa']}
                  contentStyle={{borderRadius: '12px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)'}}
                />
                <Area type="monotone" dataKey="valore" stroke="#6366f1" fill="#6366f1" fillOpacity={0.1} strokeWidth={3} />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="bg-white p-8 rounded-2xl shadow-sm border border-slate-200">
          <h3 className="text-lg font-bold mb-6 flex items-center gap-2 text-slate-800">
            <Layers size={20} className="text-indigo-600" /> Distribuzione Unità
          </h3>
          <div className="h-[200px]">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie data={unitChartData} dataKey="value" nameKey="name" innerRadius={50} outerRadius={70} paddingAngle={5}>
                  {unitChartData.map((entry, index) => (
                    <Cell key={index} fill={UNIT_COLORS[entry.name] || COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                {/* Fix: Casting unknown value to number using Number() to prevent TS error */}
                <Tooltip formatter={(value: any) => [formatNumber(Number(value)), 'Quantità']} />
              </PieChart>
            </ResponsiveContainer>
          </div>
          <div className="mt-6 grid grid-cols-2 gap-3">
            {unitChartData.map((entry) => (
              <div key={entry.name} className="bg-slate-50 p-3 rounded-xl border border-slate-100 flex flex-col items-center">
                <span className="text-[10px] font-black text-slate-400 uppercase">{entry.name}</span>
                <span className="text-sm font-black" style={{ color: UNIT_COLORS[entry.name] || '#666' }}>{formatNumber(entry.value)}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
