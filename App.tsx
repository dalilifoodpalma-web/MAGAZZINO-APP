
import React, { useState, useEffect, useMemo } from 'react';
import { FileSpreadsheet, Download, AlertCircle, CheckCircle2, Cloud, CloudOff, FileText, Trash2, X, Database } from 'lucide-react';
import * as XLSX from 'xlsx';
import Sidebar from './components/Sidebar';
import Dashboard from './components/Dashboard';
import Inventory from './components/Inventory';
import DocumentManager from './components/DocumentManager';
import PhysicalInventoryManager from './components/PhysicalInventoryManager';
import { Product, Document, ViewType } from './types';
import { cloudDb, supabase } from './services/supabaseService';

const App: React.FC = () => {
  const [activeView, setActiveView] = useState<ViewType>('dashboard');
  const [invoices, setInvoices] = useState<Document[]>([]);
  const [deliveryNotes, setDeliveryNotes] = useState<Document[]>([]);
  const [physicalCounts, setPhysicalCounts] = useState<Document[]>([]);
  const [notification, setNotification] = useState<{message: string, type: 'success' | 'error'} | null>(null);
  const [showResetModal, setShowResetModal] = useState(false);
  const [inventoryGrouping, setInventoryGrouping] = useState<'month' | 'category' | 'supplier' | 'none'>('month');
  const [isSyncing, setIsSyncing] = useState(false);

  const notify = (message: string, type: 'success' | 'error' = 'success') => {
    setNotification({ message, type });
    setTimeout(() => setNotification(null), 4000);
  };

  // Caricamento Iniziale
  useEffect(() => {
    const initData = async () => {
      setIsSyncing(true);
      try {
        const savedInvoices = localStorage.getItem('invoices');
        const savedBolle = localStorage.getItem('deliveryNotes');
        if (savedInvoices) setInvoices(JSON.parse(savedInvoices));
        if (savedBolle) setDeliveryNotes(JSON.parse(savedBolle));

        if (supabase) {
          const cloudDocs = await cloudDb.getAllDocuments();
          if (cloudDocs.length > 0) {
            setInvoices(cloudDocs.filter(d => d.type === 'invoice'));
            setDeliveryNotes(cloudDocs.filter(d => d.type === 'deliveryNote'));
            setPhysicalCounts(cloudDocs.filter(d => d.type === 'physicalCount'));
          }
        }
      } catch (e) {
        console.error("Init Error:", e);
      } finally {
        setIsSyncing(false);
      }
    };
    initData();
  }, []);

  useEffect(() => {
    localStorage.setItem('invoices', JSON.stringify(invoices));
    localStorage.setItem('deliveryNotes', JSON.stringify(deliveryNotes));
    localStorage.setItem('physicalCounts', JSON.stringify(physicalCounts));
  }, [invoices, deliveryNotes, physicalCounts]);

  // Normalizza unità: UN, UD, PZ diventano tutte UD
  const normalizeUnit = (u: string) => {
    const unit = (u || 'UD').toUpperCase().trim();
    if (['UN', 'PZ', 'UD'].includes(unit)) return 'UD';
    return unit;
  };

  const inventory = useMemo(() => {
    const allDocs = [...invoices, ...deliveryNotes];
    const items: Record<string, Product> = {};
    allDocs.forEach(doc => {
      doc.extractedProducts.forEach(p => {
        const sku = (p.sku || '').trim().toLowerCase();
        const name = p.name.trim().toLowerCase();
        const unit = normalizeUnit(p.unitOfMeasure);
        const key = sku ? `sku-${sku}` : `name-${name}-${unit}`;
        
        if (items[key]) {
          items[key].quantity += p.quantity;
          items[key].totalPrice += p.totalPrice;
          if (items[key].quantity > 0) items[key].unitPrice = items[key].totalPrice / items[key].quantity;
        } else {
          items[key] = { ...p, unitOfMeasure: unit, invoiceDate: doc.date, invoiceId: doc.id, invoiceNumber: doc.documentNumber, supplier: doc.supplier };
        }
      });
    });
    return Object.values(items);
  }, [invoices, deliveryNotes]);

  const handleExportInventory = () => {
    if (inventory.length === 0) {
      notify("Nessun dato da esportare", "error");
      return;
    }
    const data = inventory.map(p => ({
      'SKU/Codice': p.sku || 'N/D',
      'Descrizione': p.name,
      'Categoria': p.category,
      'Ultimo Fornitore': p.supplier,
      'Giacenza': p.quantity,
      'Unità': p.unitOfMeasure,
      'Prezzo Medio Unit.': p.unitPrice.toFixed(2) + ' €',
      'Valore Totale': p.totalPrice.toFixed(2) + ' €',
      'Data Ultimo Carico': new Date(p.invoiceDate).toLocaleDateString('it-IT')
    }));
    const ws = XLSX.utils.json_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Giacenze");
    const dateStr = new Date().toISOString().split('T')[0];
    XLSX.writeFile(wb, `DALILI_Giacenze_${dateStr}.xlsx`);
    notify("Excel scaricato!");
  };

  const addDocument = async (newDoc: Document) => {
    setIsSyncing(true);
    try {
      if (newDoc.type === 'invoice') setInvoices(prev => [newDoc, ...prev]);
      else if (newDoc.type === 'deliveryNote') setDeliveryNotes(prev => [newDoc, ...prev]);
      else if (newDoc.type === 'physicalCount') setPhysicalCounts(prev => [newDoc, ...prev]);
      await cloudDb.upsertDocument(newDoc);
      notify("Salvato nel cloud.");
    } catch (e) {
      notify("Errore salvataggio cloud.", "error");
    } finally {
      setIsSyncing(false);
    }
  };

  const deleteDocument = async (id: string, type: string) => {
    setIsSyncing(true);
    try {
      if (type === 'invoice') setInvoices(prev => prev.filter(i => i.id !== id));
      else if (type === 'deliveryNote') setDeliveryNotes(prev => prev.filter(dn => dn.id !== id));
      else if (type === 'physicalCount') setPhysicalCounts(prev => prev.filter(pc => pc.id !== id));
      await cloudDb.deleteDocument(id);
      notify("Rimosso dal cloud.");
    } catch (e) {
      notify("Errore rimozione cloud.", "error");
    } finally {
      setIsSyncing(false);
    }
  };

  const updateDocument = async (updatedDoc: Document) => {
    if (updatedDoc.type === 'invoice') setInvoices(prev => prev.map(inv => inv.id === updatedDoc.id ? updatedDoc : inv));
    else if (updatedDoc.type === 'deliveryNote') setDeliveryNotes(prev => prev.map(dn => dn.id === updatedDoc.id ? updatedDoc : dn));
    else if (updatedDoc.type === 'physicalCount') setPhysicalCounts(prev => prev.map(pc => pc.id === updatedDoc.id ? updatedDoc : pc));
    await cloudDb.upsertDocument(updatedDoc);
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col">
      <div className="fixed top-24 left-6 z-40 hidden md:flex items-center gap-2 px-3 py-1.5 bg-white/80 backdrop-blur shadow-sm border border-slate-200 rounded-full animate-in fade-in slide-in-from-left-4">
        {supabase ? (
          <div className="flex items-center gap-2 text-[10px] font-black uppercase text-indigo-600">
            <Cloud size={14} className={isSyncing ? "animate-bounce" : ""} /> 
            {isSyncing ? "Sincronizzazione..." : "Cloud Attivo"}
          </div>
        ) : (
          <div className="flex items-center gap-2 text-[10px] font-black uppercase text-rose-500">
            <CloudOff size={14} /> Solo Locale
          </div>
        )}
      </div>

      {notification && (
        <div className="fixed top-20 right-6 z-[60] animate-in fade-in slide-in-from-right-4 duration-300">
          <div className={`flex items-center gap-3 px-6 py-4 rounded-2xl shadow-2xl border bg-white ${notification.type === 'success' ? 'border-emerald-100' : 'border-rose-100'}`}>
            {notification.type === 'success' ? <CheckCircle2 className="text-emerald-500" size={24} /> : <AlertCircle className="text-rose-500" size={24} />}
            <p className="font-bold text-sm text-slate-800">{notification.message}</p>
          </div>
        </div>
      )}

      <Sidebar activeView={activeView} setActiveView={setActiveView} isOpen={true} />

      <main className="flex-1 w-full pt-28 pb-12">
        <div className="p-4 md:p-8 max-w-7xl mx-auto">
          {activeView === 'dashboard' && <Dashboard inventory={inventory} invoices={[...invoices, ...deliveryNotes]} onKpiClick={(g) => { setInventoryGrouping(g); setActiveView('inventory'); }} />}
          {activeView === 'inventory' && <Inventory inventory={inventory} onDelete={() => notify("Rimuovi il documento sorgente per eliminare lo stock.", "error")} onUpdate={() => notify("Modifica la fattura originale per aggiornare lo stock.", "error")} initialGrouping={inventoryGrouping} onGroupingChange={setInventoryGrouping} />}
          {activeView === 'invoices' && <DocumentManager documents={invoices} onAdd={addDocument} onUpdate={updateDocument} onDelete={(id) => deleteDocument(id, 'invoice')} type="invoice" />}
          {activeView === 'deliveryNotes' && <DocumentManager documents={deliveryNotes} onAdd={addDocument} onUpdate={updateDocument} onDelete={(id) => deleteDocument(id, 'deliveryNote')} type="deliveryNote" />}
          {activeView === 'physicalCounts' && <PhysicalInventoryManager documents={physicalCounts} inventory={inventory} onAdd={addDocument} onUpdate={updateDocument} onDelete={(id) => deleteDocument(id, 'physicalCount')} />}
          
          {activeView === 'settings' && (
            <div className="space-y-8 animate-in slide-in-from-bottom-4 duration-500">
              <div className="bg-white rounded-3xl p-8 shadow-sm border border-slate-200">
                <h2 className="text-2xl font-black text-slate-900 mb-6 flex items-center gap-3">
                  <Database className="text-indigo-600" /> Database Cloud
                </h2>
                <div className={`p-6 rounded-2xl border-2 border-dashed ${supabase ? 'border-emerald-100 bg-emerald-50/30' : 'border-slate-200 bg-slate-50'}`}>
                   {supabase ? (
                     <div className="flex items-center gap-4 text-emerald-700">
                       <CheckCircle2 size={32} />
                       <div>
                         <p className="font-bold">Connesso a Supabase</p>
                         <p className="text-xs opacity-75">Tutti i dispositivi DALILI' ora condividono lo stesso magazzino.</p>
                       </div>
                     </div>
                   ) : (
                     <div className="flex flex-col items-center gap-4 text-slate-500 text-center py-4">
                       <CloudOff size={48} className="opacity-20" />
                       <div>
                         <p className="font-bold">In attesa di SUPABASE_URL</p>
                         <p className="text-xs max-w-sm">Imposta le variabili SUPABASE_URL e SUPABASE_ANON_KEY su Vercel per attivare la condivisione multi-dispositivo.</p>
                       </div>
                     </div>
                   )}
                </div>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="p-8 bg-white rounded-3xl border border-slate-200 flex flex-col items-center text-center shadow-sm">
                  <FileSpreadsheet className="text-emerald-600 mb-4" size={48} />
                  <h3 className="text-lg font-bold">Excel Report</h3>
                  <button onClick={handleExportInventory} disabled={inventory.length === 0} className="mt-4 px-8 py-3 bg-slate-900 text-white rounded-xl font-bold hover:bg-black transition disabled:opacity-50 disabled:cursor-not-allowed">Esporta Giacenze</button>
                </div>
                <div className="p-8 bg-white rounded-3xl border border-slate-200 flex flex-col items-center text-center shadow-sm">
                  <Trash2 className="text-rose-600 mb-4" size={48} />
                  <h3 className="text-lg font-bold">Reset Completo</h3>
                  <button onClick={() => setShowResetModal(true)} className="mt-4 px-8 py-3 bg-rose-600 text-white rounded-xl font-bold hover:bg-rose-700 transition">Svuota Magazzino</button>
                </div>
              </div>
            </div>
          )}
        </div>
      </main>

      {showResetModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
          <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-md" onClick={() => setShowResetModal(false)}></div>
          <div className="bg-white rounded-3xl p-8 max-w-md w-full shadow-2xl z-10 animate-in zoom-in-95">
            <h3 className="text-2xl font-black text-slate-900 mb-2 italic">⚠️ PERICOLO</h3>
            <p className="text-slate-500 mb-8">Questa azione eliminerà permanentemente tutti i documenti sia in locale che nel CLOUD. Confermi?</p>
            <div className="grid grid-cols-2 gap-4">
              <button onClick={() => setShowResetModal(false)} className="py-4 bg-slate-100 rounded-2xl font-bold">Annulla</button>
              <button onClick={async () => {
                localStorage.clear();
                if (supabase) {
                   const { error } = await supabase.from('documents').delete().neq('id', '0');
                   if (error) console.error(error);
                }
                window.location.reload();
              }} className="py-4 bg-rose-600 text-white rounded-2xl font-bold">ELIMINA TUTTO</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default App;
