import { GoogleGenAI } from "@google/genai";

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY || "" });

export async function analyzePerformance(data: any, query: string) {
  const model = "gemini-3-flash-preview";
  
  const systemInstruction = `
    You are an expert industrial performance analyst for a refinery and chemical plant complex.
    You will be provided with performance data for various plants (Refinery, Fractionation, Biodiesel, etc.).
    Your task is to analyze the data and provide insights, reports, and recommendations based on the user's query.
    Focus on:
    - Production Yields (RBD PO, PFAD)
    - Utility and Chemical Consumption efficiency
    - Quality metrics
    - Downtime and Utilization
    
    Provide concise, professional reports in Markdown format.
    If the user asks for daily, monthly, or annual reports, use the provided data to synthesize a summary.
  `;

  try {
    const response = await ai.models.generateContent({
      model,
      contents: [
        { role: "user", parts: [{ text: `Data: ${JSON.stringify(data)}\n\nQuery: ${query}` }] }
      ],
      config: {
        systemInstruction,
      },
    });

    return response.text;
  } catch (error) {
    console.error("Gemini API Error:", error);
    return "I'm sorry, I encountered an error while analyzing the performance data. Please try again later.";
  }
}
