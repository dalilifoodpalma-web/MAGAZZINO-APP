
import { createClient } from '@supabase/supabase-js';
import { Document } from '../types';

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseAnonKey = process.env.SUPABASE_ANON_KEY;

export const supabase = (supabaseUrl && supabaseAnonKey && supabaseUrl !== "undefined") 
  ? createClient(supabaseUrl, supabaseAnonKey) 
  : null;

export const cloudDb = {
  async getAllDocuments(): Promise<Document[]> {
    if (!supabase) return [];
    const { data, error } = await supabase
      .from('documents')
      .select('*')
      .order('date', { ascending: false });
    
    if (error) {
      console.error("Cloud Fetch Error:", error);
      return [];
    }
    
    return data.map(d => ({
      id: d.id,
      documentNumber: d.document_number,
      date: d.date,
      supplier: d.supplier,
      totalAmount: d.total_amount,
      fileName: d.file_name,
      type: d.type,
      status: 'processed',
      extractedProducts: d.extracted_products
    })) as Document[];
  },

  async upsertDocument(doc: Document) {
    if (!supabase) return;
    const { error } = await supabase.from('documents').upsert({
      id: doc.id,
      document_number: doc.documentNumber,
      date: doc.date,
      supplier: doc.supplier,
      total_amount: doc.totalAmount,
      file_name: doc.fileName,
      type: doc.type,
      extracted_products: doc.extractedProducts
    });
    if (error) console.error("Cloud Upsert Error:", error);
  },

  async deleteDocument(id: string) {
    if (!supabase) return;
    const { error } = await supabase.from('documents').delete().eq('id', id);
    if (error) console.error("Cloud Delete Error:", error);
  }
};
