import { GoogleGenAI } from "@google/genai";

const getApiKey = () => {
  try {
    return process.env.GEMINI_API_KEY || "";
  } catch (e) {
    return "";
  }
};

const ai = new GoogleGenAI({ apiKey: getApiKey() });

export async function analyzePerformance(data: any, query: string) {
  const model = "gemini-3.1-pro-preview";
  
  const systemInstruction = `
    You are an expert data analyst and visualization specialist. 
    You will be provided with a dataset (JSON format) and a user query.
    Your task is to:
    1. Analyze the data to answer the user's question.
    2. Provide statistical insights (mean, median, trends, etc.) where relevant.
    3. Suggest the most appropriate visualization to represent the data.
    4. If the user asks for a chart, describe the data points clearly so the UI can render it.
    
    Dataset: ${JSON.stringify(data.slice(0, 100))} (showing first 100 rows)
    
    Query: ${query}
    
    Format your response in Markdown. Use tables for data summaries. 
    If you suggest a chart, include a JSON block with the following structure:
    \`\`\`chart
    {
      "type": "bar" | "line" | "pie" | "scatter",
      "title": "Chart Title",
      "xAxis": "column_name",
      "yAxis": "column_name",
      "data": [
        { "label": "X Value", "value": Y Value },
        ...
      ]
    }
    \`\`\`
  `;

  try {
    const response = await ai.models.generateContent({
      model,
      contents: [
        { role: "user", parts: [{ text: `Query: ${query}` }] }
      ],
      config: {
        systemInstruction,
      },
    });

    return response.text;
  } catch (error) {
    console.error("Gemini API Error:", error);
    return "I'm sorry, I encountered an error while analyzing the data. Please try again later.";
  }
}
