
import { GoogleGenAI, Type } from "@google/genai";

const DOCUMENT_SCHEMA = {
  type: Type.OBJECT,
  properties: {
    supplier: { type: Type.STRING, description: "Ragione sociale del fornitore" },
    documentNumber: { type: Type.STRING, description: "Numero identificativo del documento" },
    date: { type: Type.STRING, description: "Data (YYYY-MM-DD)" },
    products: {
      type: Type.ARRAY,
      items: {
        type: Type.OBJECT,
        properties: {
          code: { type: Type.STRING, description: "SKU o codice articolo" },
          name: { type: Type.STRING, description: "Descrizione articolo" },
          quantity: { type: Type.NUMBER, description: "Quantità" },
          unit: { type: Type.STRING, description: "Unità (USARE 'UD' PER PEZZI/UNITÀ, 'KG', 'CJ')" },
          unitPrice: { type: Type.NUMBER, description: "Prezzo unitario netto (0 se assente)" },
          totalPrice: { type: Type.NUMBER, description: "Totale riga (0 se assente)" },
          category: { type: Type.STRING, description: "Categoria suggerita" }
        },
        required: ["name", "quantity", "unit"]
      }
    }
  },
  required: ["supplier", "documentNumber", "date", "products"]
};

export const extractDocumentData = async (base64Data: string, mimeType: string) => {
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  
  try {
    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: {
        parts: [
          {
            inlineData: {
              data: base64Data,
              mimeType: mimeType,
            },
          },
          {
            text: `Sei un esperto logistico. Analizza questo documento (Fattura o DDT).
            Estrai Fornitore, Numero, Data e tutti gli Articoli.
            REGOLE UNITÀ DI MISURA: 
            - Se l'articolo è espresso in Pezzi (PZ), Unità (UN, UNITA) o non ha unità specifica, usa RIGOROSAMENTE 'UD'.
            - Se l'articolo è a peso, usa 'KG'.
            - Se l'articolo è in confezioni/casse, usa 'CJ'.
            Restituisci esclusivamente un JSON valido secondo lo schema fornito.`,
          },
        ],
      },
      config: {
        responseMimeType: "application/json",
        responseSchema: DOCUMENT_SCHEMA,
      },
    });

    const text = response.text;
    if (!text) throw new Error("L'IA non ha restituito dati.");
    
    const start = text.indexOf('{');
    const end = text.lastIndexOf('}') + 1;
    const jsonString = text.substring(start, end);
    
    return JSON.parse(jsonString);
  } catch (error: any) {
    console.error("Extraction Error:", error);
    throw new Error("Impossibile leggere il documento. Verifica che il file sia leggibile.");
  }
};
