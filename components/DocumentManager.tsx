
import React, { useState, useRef } from 'react';
import { Upload, FileText, AlertCircle, Loader2, Trash2, Hash, Edit2, Save, X, ChevronDown, ChevronUp, Package, AlertTriangle, Truck } from 'lucide-react';
import { Document, Product } from '../types';
import { extractDocumentData } from '../services/geminiService';

interface DocumentManagerProps {
  documents: Document[];
  onAdd: (doc: Document) => void;
  onUpdate: (doc: Document) => void;
  onDelete: (id: string) => void;
  onDeleteProduct?: (id: string) => void;
  onUpdateProduct?: (product: Product) => void;
  type: 'invoice' | 'deliveryNote';
}

const DocumentManager: React.FC<DocumentManagerProps> = ({ documents, onAdd, onUpdate, onDelete, onDeleteProduct, onUpdateProduct, type }) => {
  const [isUploading, setIsUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [expandedDocId, setExpandedDocId] = useState<string | null>(null);
  const [editingDocId, setEditingDocId] = useState<string | null>(null);
  const [confirmingDeleteDocId, setConfirmingDeleteDocId] = useState<string | null>(null);
  const [editSupplier, setEditSupplier] = useState<string>('');
  
  const [editingProductId, setEditingProductId] = useState<string | null>(null);
  const [confirmingDeleteProductId, setConfirmingDeleteProductId] = useState<string | null>(null);
  const [productEditForm, setProductEditForm] = useState<Product | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const isInvoice = type === 'invoice';
  const Icon = isInvoice ? FileText : Truck;
  const label = isInvoice ? 'Fattura' : 'Bolla';

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    if (file.size > 15 * 1024 * 1024) {
      setError("Il file è troppo grande (max 15MB).");
      return;
    }

    setIsUploading(true);
    setError(null);

    try {
      const reader = new FileReader();
      const base64Data = await new Promise<string>((resolve, reject) => {
        reader.onload = () => resolve((reader.result as string).split(',')[1]);
        reader.onerror = () => reject("Errore lettura file locale.");
        reader.readAsDataURL(file);
      });

      const data = await extractDocumentData(base64Data, file.type);

      if (!data || !data.products) {
        throw new Error("Impossibile estrarre i dati dal documento.");
      }

      const internalId = `${type === 'invoice' ? 'INV' : 'DDT'}-${Date.now()}`;
      const docDate = data.date || new Date().toISOString().split('T')[0];
      const docNum = data.documentNumber || `DOC-${Date.now()}`;
      const supplier = data.supplier || 'Fornitore Sconosciuto';

      const products: Product[] = data.products.map((p: any, index: number) => {
        const quantity = parseFloat(p.quantity) || 0;
        const unitPrice = parseFloat(p.unitPrice) || 0;
        const totalPrice = parseFloat(p.totalPrice) || (quantity * unitPrice);

        return {
          id: `${internalId}-${index}`,
          sku: String(p.code || '').trim(),
          name: String(p.name || 'Prodotto senza nome').trim(),
          quantity,
          unitOfMeasure: String(p.unit || 'UN').toUpperCase(),
          unitPrice,
          totalPrice,
          category: String(p.category || 'Generico').trim(),
          invoiceDate: docDate,
          invoiceId: internalId,
          invoiceNumber: docNum,
          supplier: supplier,
          docType: type
        };
      });

      const newDoc: Document = {
        id: internalId,
        documentNumber: docNum,
        date: docDate,
        supplier: supplier,
        fileName: file.name,
        totalAmount: products.reduce((sum, p) => sum + p.totalPrice, 0),
        status: 'processed',
        extractedProducts: products,
        type: type
      };

      onAdd(newDoc);
      if (fileInputRef.current) fileInputRef.current.value = '';
    } catch (err: any) {
      console.error("Upload error:", err);
      setError(err.message || "Errore durante l'elaborazione del file.");
    } finally {
      setIsUploading(false);
    }
  };

  const startEditingSupplier = (doc: Document, e: React.MouseEvent) => {
    e.stopPropagation();
    setEditingDocId(doc.id);
    setEditSupplier(doc.supplier);
  };

  const saveSupplierEdit = (doc: Document, e: React.MouseEvent) => {
    e.stopPropagation();
    if (editSupplier.trim()) {
      onUpdate({ ...doc, supplier: editSupplier.trim() });
    }
    setEditingDocId(null);
  };

  const formatCurrency = (val: number) => val.toLocaleString('it-IT', { style: 'currency', currency: 'EUR' });

  return (
    <div className="space-y-8 animate-in slide-in-from-bottom-4 duration-500">
      <div className="flex flex-col gap-2">
        <h1 className="text-2xl font-bold text-slate-900">Gestione {isInvoice ? 'Fatture' : 'Bolle di Consegna'}</h1>
        <p className="text-slate-500">L'IA estrarrà automaticamente articoli e scorte dal documento caricato.</p>
      </div>

      <div className={`bg-white border-2 border-dashed rounded-2xl p-10 text-center transition-all ${isUploading ? 'border-indigo-400 bg-indigo-50/20 shadow-inner' : 'border-slate-300 hover:border-indigo-400 hover:bg-slate-50 shadow-sm'}`}>
        <input type="file" ref={fileInputRef} onChange={handleFileUpload} accept=".pdf,image/*" className="hidden" id="doc-upload" />
        {isUploading ? (
          <div className="flex flex-col items-center gap-4">
            <Loader2 className="animate-spin text-indigo-600" size={48} />
            <p className="font-bold text-slate-900">Analisi Documento in corso...</p>
          </div>
        ) : (
          <label htmlFor="doc-upload" className="cursor-pointer flex flex-col items-center gap-4">
            <div className="p-5 bg-indigo-100 text-indigo-600 rounded-full"><Upload size={32} /></div>
            <div>
              <h3 className="text-lg font-bold text-slate-900">Trascina o seleziona un file</h3>
              <p className="text-slate-500 text-sm">Carica una {label.toLowerCase()} in formato PDF o immagine.</p>
            </div>
            <span className="mt-2 inline-flex px-6 py-2.5 bg-indigo-600 text-white rounded-xl font-bold hover:bg-indigo-700 transition">Sfoglia File</span>
          </label>
        )}
      </div>

      {error && (
        <div className="flex items-center gap-3 p-4 bg-rose-50 text-rose-700 rounded-xl border border-rose-100">
          <AlertCircle size={20} />
          <p className="text-sm font-bold">{error}</p>
        </div>
      )}

      <div className="space-y-4">
        <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2">
          <Icon className="text-indigo-600" size={20} /> Storico {label}
        </h2>
        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 divide-y divide-slate-100 overflow-hidden">
          {documents.length === 0 ? (
            <div className="p-16 text-center text-slate-300">
              <Icon className="mx-auto mb-4 opacity-10" size={64} />
              <p className="font-medium">Nessun documento presente.</p>
            </div>
          ) : (
            documents.map((doc) => {
              const isExpanded = expandedDocId === doc.id;
              const isConfirmingDeleteDoc = confirmingDeleteDocId === doc.id;
              const isEditingSup = editingDocId === doc.id;
              return (
                <div key={doc.id} className="group transition-all">
                  <div 
                    className={`p-6 flex items-center justify-between cursor-pointer hover:bg-slate-50/50 transition ${isExpanded ? 'bg-indigo-50/20' : ''} ${isConfirmingDeleteDoc ? 'bg-rose-50' : ''}`}
                    onClick={() => setExpandedDocId(isExpanded ? null : doc.id)}
                  >
                    <div className="flex items-center gap-5 flex-1">
                      <div className={`p-3 rounded-2xl border ${isConfirmingDeleteDoc ? 'bg-rose-600 text-white' : 'bg-slate-100 text-slate-600'}`}>
                        {isConfirmingDeleteDoc ? <AlertTriangle size={24} /> : (isExpanded ? <ChevronUp size={24} /> : <ChevronDown size={24} />)}
                      </div>
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          {isEditingSup ? (
                            <div className="flex items-center gap-2" onClick={e => e.stopPropagation()}>
                              <input 
                                value={editSupplier}
                                onChange={e => setEditSupplier(e.target.value)}
                                className="px-2 py-1 border border-indigo-300 rounded text-sm"
                                autoFocus
                              />
                              <button onClick={e => saveSupplierEdit(doc, e)} className="p-1 bg-emerald-500 text-white rounded"><Save size={14}/></button>
                            </div>
                          ) : (
                            <>
                              <h4 className="font-black text-lg text-slate-900">{doc.supplier}</h4>
                              <button onClick={e => startEditingSupplier(doc, e)} className="p-1 text-slate-400 hover:text-indigo-600 opacity-0 group-hover:opacity-100"><Edit2 size={14}/></button>
                            </>
                          )}
                          <span className="px-2 py-0.5 bg-indigo-600 text-white text-[10px] font-black rounded uppercase tracking-tighter">
                            #{doc.documentNumber}
                          </span>
                        </div>
                        <p className="text-sm text-slate-500 mt-1">{new Date(doc.date).toLocaleDateString('it-IT')} | {doc.extractedProducts.length} articoli</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-8">
                      <div className="text-right hidden sm:block">
                        <p className="text-xl font-black text-slate-900">{formatCurrency(doc.totalAmount)}</p>
                      </div>
                      <div onClick={e => e.stopPropagation()}>
                        {isConfirmingDeleteDoc ? (
                          <div className="flex items-center gap-1.5 bg-rose-100 p-1 rounded-lg border border-rose-200">
                            <button onClick={() => onDelete(doc.id)} className="px-2 py-1 bg-rose-600 text-white text-[10px] font-black rounded">SI</button>
                            <button onClick={() => setConfirmingDeleteDocId(null)} className="px-2 py-1 bg-slate-200 text-slate-600 text-[10px] font-black rounded">NO</button>
                          </div>
                        ) : (
                          <button onClick={() => setConfirmingDeleteDocId(doc.id)} className="p-2.5 text-slate-400 hover:text-rose-600 opacity-0 group-hover:opacity-100">
                            <Trash2 size={22} />
                          </button>
                        )}
                      </div>
                    </div>
                  </div>

                  {isExpanded && (
                    <div className="px-6 pb-6 animate-in slide-in-from-top-2 duration-300">
                      <div className="bg-slate-50 rounded-xl border border-slate-200 overflow-hidden shadow-inner">
                        {/* Wrapper for horizontal scroll on mobile */}
                        <div className="overflow-x-auto">
                          <table className="w-full text-left text-sm min-w-[650px]">
                            <thead>
                              <tr className="bg-slate-100 border-b border-slate-200">
                                <th className="px-4 py-3 font-bold text-slate-600 text-xs uppercase">Articolo</th>
                                <th className="px-4 py-3 font-bold text-slate-600 text-xs uppercase text-center">Quantità</th>
                                <th className="px-4 py-3 font-bold text-slate-600 text-xs uppercase text-right">Prezzo</th>
                                <th className="px-4 py-3 font-bold text-slate-600 text-xs uppercase text-right">Totale</th>
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-200">
                              {doc.extractedProducts.map((p) => (
                                <tr key={p.id} className="hover:bg-white transition">
                                  <td className="px-4 py-3">
                                    <p className="font-bold text-slate-800">{p.name}</p>
                                    <span className="text-[10px] font-mono text-slate-400">SKU: {p.sku || 'N/D'}</span>
                                  </td>
                                  <td className="px-4 py-3 text-center font-black">{p.quantity} {p.unitOfMeasure}</td>
                                  <td className="px-4 py-3 text-right text-slate-500">{formatCurrency(p.unitPrice)}</td>
                                  <td className="px-4 py-3 text-right font-black text-indigo-600">{formatCurrency(p.totalPrice)}</td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
};

export default DocumentManager;
