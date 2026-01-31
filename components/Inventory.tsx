
import React, { useState, useMemo, useEffect } from 'react';
import { Search, Trash2, ChevronRight, Package, Calendar, Tag, Users, Clock, Edit2, Save, X, Layers, Hash, Check, AlertTriangle } from 'lucide-react';
import { Product } from '../types';

interface InventoryProps {
  inventory: Product[];
  onDelete: (id: string) => void;
  onUpdate: (product: Product) => void;
  initialGrouping?: 'month' | 'category' | 'supplier' | 'none';
  onGroupingChange?: (group: 'month' | 'category' | 'supplier' | 'none') => void;
}

const Inventory: React.FC<InventoryProps> = ({ inventory, onDelete, onUpdate, initialGrouping = 'month', onGroupingChange }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [groupBy, setGroupBy] = useState<'month' | 'category' | 'supplier' | 'none'>(initialGrouping);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [confirmingDeleteId, setConfirmingDeleteId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState<Product | null>(null);
  const [isCustomUnit, setIsCustomUnit] = useState(false);

  // Lista fissa delle unità standard preferite: UD sostituisce UN e PZ
  const standardUnits = ['UD', 'KG', 'CJ'];

  useEffect(() => {
    setGroupBy(initialGrouping);
  }, [initialGrouping]);

  const handleGroupingChange = (newGroup: 'month' | 'category' | 'supplier' | 'none') => {
    setGroupBy(newGroup);
    if (onGroupingChange) onGroupingChange(newGroup);
  };

  const startEditing = (p: Product) => {
    setEditingId(p.id);
    setConfirmingDeleteId(null);
    setEditForm({ ...p });
    const currentUnit = (p.unitOfMeasure || 'UD').toUpperCase();
    setIsCustomUnit(!standardUnits.includes(currentUnit));
  };

  const cancelEditing = () => {
    setEditingId(null);
    setEditForm(null);
    setIsCustomUnit(false);
  };

  const saveEditing = () => {
    if (editForm) {
      const finalUnit = (editForm.unitOfMeasure || 'UD').toUpperCase().trim();
      onUpdate({ ...editForm, unitOfMeasure: finalUnit });
      setEditingId(null);
      setEditForm(null);
      setIsCustomUnit(false);
    }
  };

  const handleDeleteClick = (id: string) => {
    setConfirmingDeleteId(id);
    setEditingId(null);
  };

  const cancelDelete = () => {
    setConfirmingDeleteId(null);
  };

  const confirmDelete = (id: string) => {
    onDelete(id);
    setConfirmingDeleteId(null);
  };

  const filteredInventory = useMemo(() => {
    const term = searchTerm.toLowerCase();
    return [...inventory]
      .sort((a, b) => new Date(b.invoiceDate).getTime() - new Date(a.invoiceDate).getTime())
      .filter(p => 
        p.name.toLowerCase().includes(term) || 
        p.supplier.toLowerCase().includes(term) ||
        (p.sku && p.sku.toLowerCase().includes(term)) ||
        (p.invoiceNumber && p.invoiceNumber.toLowerCase().includes(term)) ||
        (p.category && p.category.toLowerCase().includes(term))
      );
  }, [inventory, searchTerm]);

  const groupedData = useMemo(() => {
    if (groupBy === 'none') return { 'Giacenza Totale': filteredInventory } as Record<string, Product[]>;
    return filteredInventory.reduce((acc, p) => {
      let key = 'Altro';
      if (groupBy === 'month') {
        key = new Date(p.invoiceDate).toLocaleString('it-IT', { month: 'long', year: 'numeric' });
      } else if (groupBy === 'category') {
        key = p.category || 'Senza Categoria';
      } else if (groupBy === 'supplier') {
        key = p.supplier || 'Sconosciuto';
      }
      if (!acc[key]) acc[key] = [];
      acc[key].push(p);
      return acc;
    }, {} as Record<string, Product[]>);
  }, [filteredInventory, groupBy]);

  const formatCurrency = (val: number) => {
    return val.toLocaleString('it-IT', { style: 'currency', currency: 'EUR' });
  };

  const getUnitColor = (unit: string) => {
    const u = (unit || 'UD').toUpperCase();
    switch(u) {
      case 'KG': return 'bg-emerald-50 text-emerald-700 border-emerald-100';
      case 'CJ': return 'bg-amber-50 text-amber-700 border-amber-100';
      case 'UD': return 'bg-indigo-50 text-indigo-700 border-indigo-100';
      default: return 'bg-slate-50 text-slate-700 border-slate-100';
    }
  };

  return (
    <div className="space-y-6 animate-in slide-in-from-bottom-4 duration-500">
      <header className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Magazzino Consolidato</h1>
          <p className="text-slate-500 font-medium">UD raggruppa Unità, Pezzi e Articoli singoli.</p>
        </div>
        <div className="flex bg-white p-1 rounded-xl shadow-sm border border-slate-200 overflow-x-auto no-scrollbar">
          <button onClick={() => handleGroupingChange('month')} className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-bold transition whitespace-nowrap ${groupBy === 'month' ? 'bg-indigo-600 text-white shadow-sm' : 'text-slate-500 hover:bg-slate-50'}`}><Calendar size={14} /> ULTIMO CARICO</button>
          <button onClick={() => handleGroupingChange('category')} className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-bold transition whitespace-nowrap ${groupBy === 'category' ? 'bg-indigo-600 text-white shadow-sm' : 'text-slate-500 hover:bg-slate-50'}`}><Tag size={14} /> CATEGORIE</button>
          <button onClick={() => handleGroupingChange('supplier')} className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-bold transition whitespace-nowrap ${groupBy === 'supplier' ? 'bg-indigo-600 text-white shadow-sm' : 'text-slate-500 hover:bg-slate-50'}`}><Users size={14} /> FORNITORI</button>
        </div>
      </header>

      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={20} />
        <input 
          type="text" 
          placeholder="Cerca per descrizione o codice..."
          className="w-full pl-10 pr-4 py-3 bg-white border border-slate-200 rounded-xl shadow-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 transition placeholder:text-slate-400"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
        />
      </div>

      <div className="space-y-10">
        {(Object.entries(groupedData) as [string, Product[]][]).map(([group, products]) => (
          <section key={group} className="space-y-4">
            <h2 className="text-lg font-bold text-slate-800 flex items-center gap-2 px-2 capitalize">
              <ChevronRight size={20} className="text-indigo-600" /> {group}
            </h2>
            <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse min-w-[800px]">
                  <thead>
                    <tr className="bg-slate-50/50 border-b border-slate-100">
                      <th className="px-6 py-4 text-[11px] font-bold text-slate-500 uppercase tracking-wider">Prodotto / SKU</th>
                      <th className="px-6 py-4 text-[11px] font-bold text-slate-500 uppercase tracking-wider">Fornitore</th>
                      <th className="px-6 py-4 text-[11px] font-bold text-slate-500 uppercase tracking-wider">Scorta</th>
                      <th className="px-6 py-4 text-[11px] font-bold text-slate-500 uppercase tracking-wider text-right">Valore Totale</th>
                      <th className="px-6 py-4 text-[11px] font-bold text-slate-500 uppercase tracking-wider text-center">Azioni</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-50">
                    {products.map((p) => {
                      const isEditing = editingId === p.id;
                      const isConfirmingDelete = confirmingDeleteId === p.id;
                      return (
                        <tr key={p.id} className={`group transition-all ${isEditing ? 'bg-indigo-50/40' : isConfirmingDelete ? 'bg-rose-50' : 'hover:bg-slate-50/80'}`}>
                          <td className="px-6 py-4">
                            <div className="flex items-center gap-4">
                              <div className={`w-10 h-10 rounded-xl flex items-center justify-center shadow-sm shrink-0 transition-colors ${isEditing ? 'bg-indigo-600 text-white' : isConfirmingDelete ? 'bg-rose-600 text-white' : 'bg-slate-100 text-slate-400 group-hover:text-indigo-600'}`}>
                                {isConfirmingDelete ? <AlertTriangle size={20} /> : (p.sku ? <Hash size={20} /> : <Package size={20} />)}
                              </div>
                              <div className="flex-1 min-w-[200px]">
                                {isEditing ? (
                                  <div className="space-y-2">
                                    <input 
                                      type="text" 
                                      placeholder="Nome Prodotto"
                                      className="w-full px-3 py-1.5 text-sm font-semibold border border-indigo-200 rounded-lg outline-none bg-white focus:ring-2 focus:ring-indigo-500"
                                      value={editForm?.name || ''}
                                      onChange={(e) => setEditForm(prev => prev ? {...prev, name: e.target.value} : null)}
                                    />
                                  </div>
                                ) : (
                                  <>
                                    <div className="flex items-center gap-2">
                                      <p className={`font-bold leading-tight ${isConfirmingDelete ? 'text-rose-900' : 'text-slate-900'}`}>{p.name}</p>
                                      {p.sku && <span className="text-[10px] font-mono font-bold bg-slate-100 text-slate-600 px-1.5 py-0.5 rounded">#{p.sku}</span>}
                                    </div>
                                    <div className="flex items-center gap-2 mt-1">
                                      <span className="text-[10px] text-indigo-600 font-bold uppercase">{p.category}</span>
                                      <span className="text-slate-300">|</span>
                                      <span className="text-[10px] text-slate-400 italic">Doc: {p.invoiceNumber}</span>
                                    </div>
                                  </>
                                )}
                              </div>
                            </div>
                          </td>
                          <td className="px-6 py-4 text-sm text-slate-600">
                            {isEditing ? (
                              <input 
                                type="text" 
                                className="w-full px-3 py-1.5 border border-indigo-200 rounded-lg outline-none text-sm bg-white focus:ring-2 focus:ring-indigo-500"
                                value={editForm?.supplier || ''}
                                onChange={(e) => setEditForm(prev => prev ? {...prev, supplier: e.target.value} : null)}
                              />
                            ) : (
                              p.supplier
                            )}
                          </td>
                          <td className="px-6 py-4">
                            {isEditing ? (
                              <div className="flex flex-col gap-2">
                                <div className="flex items-center gap-2">
                                  <input 
                                    type="number" 
                                    className="w-20 px-2 py-1.5 border border-indigo-200 rounded-lg outline-none text-sm font-bold bg-white focus:ring-2 focus:ring-indigo-500"
                                    value={editForm?.quantity || 0}
                                    onChange={(e) => setEditForm(prev => prev ? {...prev, quantity: parseFloat(e.target.value) || 0} : null)}
                                  />
                                  {!isCustomUnit ? (
                                    <select 
                                      className="px-2 py-1.5 rounded-lg text-[11px] font-bold border border-indigo-200 outline-none bg-white focus:ring-2 focus:ring-indigo-500"
                                      value={standardUnits.includes((editForm?.unitOfMeasure || 'UD').toUpperCase()) ? (editForm?.unitOfMeasure || 'UD').toUpperCase() : 'CUSTOM'}
                                      onChange={(e) => {
                                        if (e.target.value === 'CUSTOM') {
                                          setIsCustomUnit(true);
                                        } else {
                                          setEditForm(prev => prev ? {...prev, unitOfMeasure: e.target.value} : null);
                                        }
                                      }}
                                    >
                                      <option value="UD">UD (Unità/Pezzi)</option>
                                      <option value="KG">KG (Chili)</option>
                                      <option value="CJ">CJ (Conf.)</option>
                                      <option value="CUSTOM">Altra unità...</option>
                                    </select>
                                  ) : (
                                    <div className="flex items-center gap-1">
                                      <input 
                                        type="text" 
                                        placeholder="Scrivi..."
                                        className="w-24 px-2 py-1.5 border border-indigo-200 rounded-lg outline-none text-[11px] font-bold bg-white focus:ring-2 focus:ring-indigo-500 uppercase"
                                        value={editForm?.unitOfMeasure || ''}
                                        autoFocus
                                        onChange={(e) => setEditForm(prev => prev ? {...prev, unitOfMeasure: e.target.value.toUpperCase()} : null)}
                                      />
                                      <button 
                                        onClick={() => { setIsCustomUnit(false); if(editForm) setEditForm({...editForm, unitOfMeasure: 'UD'}); }}
                                        className="p-1.5 bg-slate-100 text-slate-400 hover:text-indigo-600 rounded-md transition"
                                      >
                                        <X size={14} />
                                      </button>
                                    </div>
                                  )}
                                </div>
                              </div>
                            ) : (
                              <div className="flex items-center gap-2">
                                <span className="text-base font-black text-slate-900">{p.quantity.toLocaleString('it-IT')}</span>
                                <span className={`px-2 py-0.5 rounded text-[10px] font-bold border shadow-sm ${getUnitColor(p.unitOfMeasure)}`}>
                                  {p.unitOfMeasure || 'UD'}
                                </span>
                              </div>
                            )}
                          </td>
                          <td className="px-6 py-4 text-right">
                            <span className="text-sm font-black text-indigo-600">{formatCurrency(p.totalPrice)}</span>
                          </td>
                          <td className="px-6 py-4 min-w-[120px]">
                            <div className="flex items-center justify-center gap-2">
                              {isEditing ? (
                                <>
                                  <button onClick={saveEditing} className="p-2 text-white bg-emerald-500 rounded-xl shadow-sm hover:bg-emerald-600 transition"><Save size={18} /></button>
                                  <button onClick={cancelEditing} className="p-2 text-slate-500 bg-slate-100 rounded-xl shadow-sm hover:bg-slate-200 transition"><X size={18} /></button>
                                </>
                              ) : isConfirmingDelete ? (
                                <div className="flex items-center gap-1.5 bg-rose-100 p-1 rounded-lg animate-in zoom-in-95 duration-200">
                                  <button onClick={() => confirmDelete(p.id)} className="px-2 py-1 bg-rose-600 text-white text-[10px] font-black rounded hover:bg-rose-700 transition">SI</button>
                                  <button onClick={cancelDelete} className="px-2 py-1 bg-slate-200 text-slate-600 text-[10px] font-black rounded hover:bg-slate-300 transition">NO</button>
                                </div>
                              ) : (
                                <>
                                  <button onClick={() => startEditing(p)} className="p-2 text-slate-400 hover:text-indigo-600 transition md:opacity-0 group-hover:opacity-100">
                                    <Edit2 size={18} />
                                  </button>
                                  <button onClick={() => handleDeleteClick(p.id)} className="p-2 text-slate-400 hover:text-rose-600 transition md:opacity-0 group-hover:opacity-100">
                                    <Trash2 size={18} />
                                  </button>
                                </>
                              )}
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          </section>
        ))}
      </div>
    </div>
  );
};

export default Inventory;
