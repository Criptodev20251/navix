import { GoogleGenAI } from "@google/genai";

const ai = new GoogleGenAI({ apiKey: process.env.API_KEY || '' });

export const analyzeNCM = async (productName: string): Promise<string> => {
  try {
    const response = await ai.models.generateContent({
      model: 'gemini-3-pro-preview',
      contents: `Analise o produto "${productName}" para exportação/importação. Sugira 3 códigos NCM prováveis e uma breve explicação de riscos alfandegários. Responda em português, texto curto.`,
    });
    return response.text || "Não foi possível gerar a análise.";
  } catch (error) {
    console.error("Gemini API Error:", error);
    return "Consulte um despachante para validação técnica da NCM.";
  }
};

export const summarizeProcessDocs = async (docList: string[]): Promise<string> => {
    try {
        const response = await ai.models.generateContent({
            model: 'gemini-3-flash-preview',
            contents: `Eu tenho os seguintes documentos para um processo de exportação: ${docList.join(', ')}. O que está faltando para um processo padrão? Responda em 1 frase.`,
        });
        return response.text || "";
    } catch (e) {
        return "Erro ao analisar documentos.";
    }
}