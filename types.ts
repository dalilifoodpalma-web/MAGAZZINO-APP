
export interface Product {
  id: string;
  sku: string; // Codice articolo
  name: string;
  quantity: number;
  unitOfMeasure: 'UN' | 'PZ' | 'KG' | 'CJ' | string;
  unitPrice: number;
  totalPrice: number;
  category: string;
  invoiceDate: string;
  invoiceId: string; // ID interno per il database (può essere bollaId)
  invoiceNumber: string; // Numero reale della fattura/bolla
  supplier: string;
  docType: 'invoice' | 'deliveryNote' | 'physicalCount';
}

export interface Document {
  id: string; // ID interno
  documentNumber: string; // Numero reale (es. 123/2024)
  date: string;
  supplier: string;
  totalAmount: number;
  fileName: string;
  status: 'pending' | 'processed' | 'error';
  extractedProducts: Product[];
  type: 'invoice' | 'deliveryNote' | 'physicalCount';
}

// Manteniamo Invoice per retrocompatibilità se serve, ma useremo Document
export type Invoice = Document;

export interface MonthlyStats {
  month: string;
  totalSpent: number;
  productCount: number;
}

export type ViewType = 'dashboard' | 'inventory' | 'invoices' | 'deliveryNotes' | 'physicalCounts' | 'settings';
