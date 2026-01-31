
import React, { useState, useRef } from 'react';
import { Upload, FileText, AlertCircle, Loader2, Trash2, Hash, Edit2, Save, X, ChevronDown, ChevronUp, Package, AlertTriangle, ClipboardCheck, FileSpreadsheet, Download, CheckCircle2, MinusCircle, PlusCircle, Printer } from 'lucide-react';
import * as XLSX from 'xlsx';
import { Document, Product } from '../types';
import { extractDocumentData } from '../services/geminiService';

interface PhysicalInventoryManagerProps {
  documents: Document[];
  inventory: Product[];
  onAdd: (doc: Document) => void;
  onUpdate: (doc: Document) => void;
  onDelete: (id: string) => void;
  onDeleteProduct?: (id: string) => void;
  onUpdateProduct?: (product: Product) => void;
}

const PhysicalInventoryManager: React.FC<PhysicalInventoryManagerProps> = ({ 
  documents, 
  inventory, 
  onAdd, 
  onUpdate, 
  onDelete, 
  onDeleteProduct, 
  onUpdateProduct 
}) => {
  const [isUploading, setIsUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [expandedDocId, setExpandedDocId] = useState<string | null>(null);
  const [confirmingDeleteDocId, setConfirmingDeleteDocId] = useState<string | null>(null);
  const [editingDocId, setEditingDocId] = useState<string | null>(null);
  
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setIsUploading(true);
    setError(null);

    try {
      let extractedProducts: Product[] = [];
      let docData = { supplier: 'Inventario Manuale', date: new Date().toISOString().split('T')[0], documentNumber: `INV-${Date.now()}` };

      if (file.name.endsWith('.xlsx') || file.name.endsWith('.xls')) {
        const reader = new FileReader();
        const dataPromise = new Promise<any[]>((resolve) => {
          reader.onload = (e) => {
            const ab = e.target?.result;
            const wb = XLSX.read(ab, { type: 'array' });
            const ws = wb.Sheets[wb.SheetNames[0]];
            resolve(XLSX.utils.sheet_to_json(ws));
          };
          reader.readAsArrayBuffer(file);
        });
        
        const rows = await dataPromise;
        const internalId = `PC-${Date.now()}`;
        
        extractedProducts = rows.map((row: any, idx) => ({
          id: `${internalId}-${idx}`,
          sku: String(row['SKU'] || row['Codice'] || '').trim(),
          name: String(row['Nome'] || row['Descrizione'] || row['Prodotto'] || 'Senza Nome').trim(),
          quantity: parseFloat(row['Quantità'] || row['Giacenza'] || row['Conteggio'] || 0),
          unitOfMeasure: String(row['Unità'] || 'UN').toUpperCase(),
          unitPrice: 0,
          totalPrice: 0,
          category: 'Generico',
          invoiceDate: docData.date,
          invoiceId: internalId,
          invoiceNumber: docData.documentNumber,
          supplier: docData.supplier,
          docType: 'physicalCount'
        }));
      } else {
        const reader = new FileReader();
        const base64Promise = new Promise<string>((resolve) => {
          reader.onload = () => resolve((reader.result as string).split(',')[1]);
          reader.readAsDataURL(file);
        });

        const base64Data = await base64Promise;
        const data = await extractDocumentData(base64Data, file.type);
        if (!data || !data.products) throw new Error("Dati non validi.");
        
        docData = { 
          supplier: data.supplier || 'Inventario Estratto', 
          date: data.date || new Date().toISOString().split('T')[0], 
          documentNumber: data.documentNumber || `INV-${Date.now()}` 
        };
        
        const internalId = `PC-${Date.now()}`;
        extractedProducts = data.products.map((p: any, index: number) => ({
          id: `${internalId}-${index}`,
          sku: (p.code || '').trim(),
          name: (p.name || 'Prodotto').trim(),
          quantity: parseFloat(p.quantity) || 0,
          unitOfMeasure: (p.unit || 'UN').trim().toUpperCase(),
          unitPrice: 0,
          totalPrice: 0,
          category: (p.category || 'Generico').trim(),
          invoiceDate: docData.date,
          invoiceId: internalId,
          invoiceNumber: docData.documentNumber,
          supplier: docData.supplier,
          docType: 'physicalCount'
        }));
      }

      const newDoc: Document = {
        id: `DOC-PC-${Date.now()}`,
        documentNumber: docData.documentNumber,
        date: docData.date,
        supplier: docData.supplier,
        fileName: file.name,
        totalAmount: 0,
        status: 'processed',
        extractedProducts: extractedProducts,
        type: 'physicalCount'
      };

      onAdd(newDoc);
      if (fileInputRef.current) fileInputRef.current.value = '';
    } catch (err) {
      console.error(err);
      setError("Errore durante il caricamento dell'inventario.");
    } finally {
      setIsUploading(false);
    }
  };

  const getSystemQuantity = (name: string, sku: string, unit: string) => {
    const prod = inventory.find(p => 
      (sku && p.sku && p.sku.toLowerCase() === sku.toLowerCase()) || 
      (p.name.toLowerCase() === name.toLowerCase() && p.unitOfMeasure.toUpperCase() === unit.toUpperCase())
    );
    return prod ? prod.quantity : 0;
  };

  const exportReport = (doc: Document) => {
    const reportData = doc.extractedProducts.map(p => {
      const sysQty = getSystemQuantity(p.name, p.sku, p.unitOfMeasure);
      const diff = p.quantity - sysQty;
      return {
        'Codice SKU': p.sku || 'N/D',
        'Descrizione': p.name,
        'Unità': p.unitOfMeasure,
        'Quantità Rilevata (Fisica)': p.quantity,
        'Giacenza Sistema': sysQty,
        'Differenza': diff,
        'Stato': diff === 0 ? 'OK' : (diff > 0 ? 'Eccedenza' : 'Smanchi')
      };
    });

    const ws = XLSX.utils.json_to_sheet(reportData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Report Riconciliazione");
    XLSX.writeFile(wb, `Report_Inventario_${doc.documentNumber}_${doc.date}.xlsx`);
  };

  const printReport = (doc: Document) => {
    const printWindow = window.open('', '_blank');
    if (!printWindow) return;

    const itemsHtml = doc.extractedProducts.map(p => {
      const sysQty = getSystemQuantity(p.name, p.sku, p.unitOfMeasure);
      const diff = p.quantity - sysQty;
      const statusClass = diff === 0 ? 'color: #10b981' : (diff > 0 ? 'color: #f59e0b' : 'color: #ef4444');
      const statusText = diff === 0 ? 'OK' : (diff > 0 ? 'ECCEDENZA' : 'SMANCO');
      
      return `
        <tr>
          <td style="padding: 8px; border-bottom: 1px solid #eee;">
            <div style="font-weight: bold;">${p.name}</div>
            <div style="font-size: 10px; color: #666;">SKU: ${p.sku || 'N/D'}</div>
          </td>
          <td style="padding: 8px; border-bottom: 1px solid #eee; text-align: center;">${p.quantity} ${p.unitOfMeasure}</td>
          <td style="padding: 8px; border-bottom: 1px solid #eee; text-align: center;">${sysQty} ${p.unitOfMeasure}</td>
          <td style="padding: 8px; border-bottom: 1px solid #eee; text-align: center; font-weight: bold; ${statusClass}">
            ${diff > 0 ? '+' + diff : diff}
          </td>
          <td style="padding: 8px; border-bottom: 1px solid #eee; text-align: center; font-size: 10px; font-weight: 900; ${statusClass}">
            ${statusText}
          </td>
        </tr>
      `;
    }).join('');

    printWindow.document.write(`
      <html>
        <head>
          <title>Report Riconciliazione - ${doc.documentNumber}</title>
          <style>
            body { font-family: sans-serif; padding: 20px; color: #333; }
            .header { border-bottom: 2px solid #6366f1; padding-bottom: 10px; margin-bottom: 20px; display: flex; justify-content: space-between; align-items: flex-end; }
            .title { font-size: 24px; font-weight: bold; color: #1e293b; }
            .info { font-size: 12px; color: #64748b; margin-bottom: 20px; }
            table { width: 100%; border-collapse: collapse; }
            th { text-align: left; font-size: 11px; text-transform: uppercase; color: #64748b; border-bottom: 1px solid #cbd5e1; padding: 10px 8px; }
            .footer { margin-top: 50px; border-top: 1px solid #eee; padding-top: 20px; font-size: 10px; color: #94a3b8; display: flex; justify-content: space-between; }
            .signature { margin-top: 40px; border-top: 1px solid #333; width: 200px; padding-top: 5px; text-align: center; font-size: 12px; }
            @media print { .no-print { display: none; } }
          </style>
        </head>
        <body>
          <div class="header">
            <div>
              <div class="title">MAGAZZINO DALILI'</div>
              <div style="font-size: 14px; color: #6366f1; font-weight: bold;">Report Riconciliazione Inventario</div>
            </div>
            <div style="text-align: right; font-size: 12px;">
              Stampato il: ${new Date().toLocaleString('it-IT')}
            </div>
          </div>
          
          <div class="info">
            <strong>Documento:</strong> ${doc.documentNumber} | 
            <strong>Data Rilevazione:</strong> ${new Date(doc.date).toLocaleDateString('it-IT')} | 
            <strong>Operatore:</strong> ${doc.supplier}
          </div>

          <table>
            <thead>
              <tr>
                <th>Prodotto</th>
                <th style="text-align: center;">Fisico</th>
                <th style="text-align: center;">Sistema</th>
                <th style="text-align: center;">Differenza</th>
                <th style="text-align: center;">Stato</th>
              </tr>
            </thead>
            <tbody>
              ${itemsHtml}
            </tbody>
          </table>

          <div class="footer">
            <div>Documento generato da Sistema Gestionale DALILI'</div>
            <div class="signature">Firma del Responsabile</div>
          </div>
          
          <script>
            window.onload = function() { window.print(); window.close(); };
          </script>
        </body>
      </html>
    `);
    printWindow.document.close();
  };

  return (
    <div className="space-y-8 animate-in slide-in-from-bottom-4 duration-500">
      <header>
        <h1 className="text-2xl font-bold text-slate-900">Inventario Fisico (Riconciliazione)</h1>
        <p className="text-slate-500">Carica file Excel o PDF per confrontare le scorte reali con il sistema.</p>
      </header>

      <div className={`bg-white border-2 border-dashed rounded-2xl p-10 text-center transition-all ${isUploading ? 'border-indigo-400 bg-indigo-50/30 shadow-inner' : 'border-slate-300 hover:border-indigo-400 hover:bg-slate-50 shadow-sm'}`}>
        <input type="file" ref={fileInputRef} onChange={handleFileUpload} accept=".pdf,.xlsx,.xls" className="hidden" id="pc-upload" />
        {isUploading ? (
          <div className="flex flex-col items-center gap-4">
            <Loader2 className="animate-spin text-indigo-600" size={48} />
            <p className="font-bold text-slate-900">Analisi Inventario Fisico...</p>
          </div>
        ) : (
          <label htmlFor="pc-upload" className="cursor-pointer flex flex-col items-center gap-4">
            <div className="p-5 bg-indigo-100 text-indigo-600 rounded-full"><ClipboardCheck size={32} /></div>
            <div>
              <h3 className="text-lg font-bold text-slate-900">Trascina un file PDF o Excel</h3>
              <p className="text-slate-500 text-sm">Carica il foglio di conteggio per la riconciliazione.</p>
            </div>
            <span className="mt-2 inline-flex px-6 py-2.5 bg-indigo-600 text-white rounded-xl font-bold hover:bg-indigo-700 transition">Carica Conteggio</span>
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
        <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2"><ClipboardCheck size={20} className="text-indigo-600" /> Storico Conteggi</h2>
        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 divide-y divide-slate-100 overflow-hidden">
          {documents.length === 0 ? (
            <div className="p-16 text-center text-slate-300">
              <ClipboardCheck className="mx-auto mb-4 opacity-10" size={64} />
              <p className="font-medium">Nessun conteggio fisico caricato.</p>
            </div>
          ) : (
            documents.map((doc) => {
              const isExpanded = expandedDocId === doc.id;
              const isConfirmingDeleteDoc = confirmingDeleteDocId === doc.id;
              return (
                <div key={doc.id} className="group transition-all">
                  <div 
                    className={`p-6 flex items-center justify-between cursor-pointer hover:bg-slate-50/50 transition ${isExpanded ? 'bg-indigo-50/20' : ''} ${isConfirmingDeleteDoc ? 'bg-rose-50' : ''}`}
                    onClick={() => setExpandedDocId(isExpanded ? null : doc.id)}
                  >
                    <div className="flex items-center gap-5 flex-1">
                      <div className={`p-3 rounded-2xl border ${isConfirmingDeleteDoc ? 'bg-rose-600 text-white' : 'bg-indigo-50 text-indigo-600'}`}>
                        {isConfirmingDeleteDoc ? <AlertTriangle size={24} /> : (isExpanded ? <ChevronUp size={24} /> : <ChevronDown size={24} />)}
                      </div>
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <h4 className="font-black text-lg text-slate-900">{doc.supplier}</h4>
                          <span className="px-2 py-0.5 bg-indigo-600 text-white text-[10px] font-black rounded uppercase tracking-tighter flex items-center gap-1">
                            <Hash size={10} /> {doc.documentNumber}
                          </span>
                        </div>
                        <p className="text-sm text-slate-500 mt-1">{new Date(doc.date).toLocaleDateString('it-IT')} | {doc.extractedProducts.length} referenze contate</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <button 
                        onClick={(e) => { e.stopPropagation(); printReport(doc); }}
                        className="flex items-center gap-2 px-3 py-2 bg-indigo-50 text-indigo-700 rounded-xl text-xs font-bold hover:bg-indigo-100 transition shadow-sm border border-indigo-100"
                      >
                        <Printer size={16} /> <span className="hidden xs:inline">PDF</span>
                      </button>
                      <button 
                        onClick={(e) => { e.stopPropagation(); exportReport(doc); }}
                        className="flex items-center gap-2 px-3 py-2 bg-emerald-50 text-emerald-700 rounded-xl text-xs font-bold hover:bg-emerald-100 transition shadow-sm border border-emerald-100"
                      >
                        <FileSpreadsheet size={16} /> <span className="hidden xs:inline">Excel</span>
                      </button>
                      <div onClick={e => e.stopPropagation()}>
                        {isConfirmingDeleteDoc ? (
                          <div className="flex items-center gap-1.5 bg-rose-100 p-1 rounded-lg border border-rose-200">
                            <span className="text-[10px] font-black text-rose-700 px-1 uppercase">Elimina?</span>
                            <button onClick={() => onDelete(doc.id)} className="px-2 py-1 bg-rose-600 text-white text-[10px] font-black rounded">SI</button>
                            <button onClick={() => setConfirmingDeleteDocId(null)} className="px-2 py-1 bg-slate-200 text-slate-600 text-[10px] font-black rounded">NO</button>
                          </div>
                        ) : (
                          <button onClick={() => setConfirmingDeleteDocId(doc.id)} className="p-2.5 text-slate-400 hover:text-rose-600 transition md:opacity-0 group-hover:opacity-100">
                            <Trash2 size={22} />
                          </button>
                        )}
                      </div>
                    </div>
                  </div>

                  {isExpanded && (
                    <div className="px-6 pb-6 animate-in slide-in-from-top-2 duration-300">
                      <div className="bg-slate-50 rounded-xl border border-slate-200 overflow-hidden shadow-inner">
                        <div className="overflow-x-auto">
                          <table className="w-full text-left text-sm min-w-[700px]">
                            <thead>
                              <tr className="bg-slate-100 border-b border-slate-200">
                                <th className="px-4 py-3 font-bold text-slate-600 text-xs uppercase">Prodotto</th>
                                <th className="px-4 py-3 font-bold text-slate-600 text-xs uppercase text-center">Fisico</th>
                                <th className="px-4 py-3 font-bold text-slate-600 text-xs uppercase text-center">Sistema</th>
                                <th className="px-4 py-3 font-bold text-slate-600 text-xs uppercase text-center">Differenza</th>
                                <th className="px-4 py-3 font-bold text-slate-600 text-xs uppercase text-center">Stato</th>
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-200">
                              {doc.extractedProducts.map((p) => {
                                const sysQty = getSystemQuantity(p.name, p.sku, p.unitOfMeasure);
                                const diff = p.quantity - sysQty;
                                return (
                                  <tr key={p.id} className="hover:bg-white transition">
                                    <td className="px-4 py-3">
                                      <p className="font-bold text-slate-800">{p.name}</p>
                                      <span className="text-[10px] font-mono text-slate-400">SKU: {p.sku || 'N/D'}</span>
                                    </td>
                                    <td className="px-4 py-3 text-center font-black">{p.quantity} {p.unitOfMeasure}</td>
                                    <td className="px-4 py-3 text-center text-slate-500">{sysQty} {p.unitOfMeasure}</td>
                                    <td className={`px-4 py-3 text-center font-black ${diff > 0 ? 'text-emerald-600' : diff < 0 ? 'text-rose-600' : 'text-slate-400'}`}>
                                      {diff > 0 ? `+${diff}` : diff}
                                    </td>
                                    <td className="px-4 py-3 text-center">
                                      {diff === 0 ? (
                                        <span className="inline-flex items-center gap-1 text-emerald-600 text-[10px] font-black uppercase"><CheckCircle2 size={12} /> OK</span>
                                      ) : diff > 0 ? (
                                        <span className="inline-flex items-center gap-1 text-amber-600 text-[10px] font-black uppercase"><PlusCircle size={12} /> Eccedenza</span>
                                      ) : (
                                        <span className="inline-flex items-center gap-1 text-rose-600 text-[10px] font-black uppercase"><MinusCircle size={12} /> Smanchi</span>
                                      )}
                                    </td>
                                  </tr>
                                );
                              })}
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

export default PhysicalInventoryManager;
