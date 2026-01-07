
import { Token, Department, Counter, TokenStatus } from "../types";

// Helper to dynamically load the library only when needed
const loadGenAI = async () => {
  const { GoogleGenAI, Modality } = await import("@google/genai");
  return { GoogleGenAI, Modality };
};

export const getQueueInsights = async (
  departments: Department[],
  counters: Counter[],
  tokens: Token[]
): Promise<string> => {
  // Offline Check
  if (!navigator.onLine) return "Analytics unavailable: System is offline.";
  
  if (!process.env.API_KEY) return "Analytics unavailable: No API Key configured.";

  try {
    // Dynamic Import
    const { GoogleGenAI } = await loadGenAI();
    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

    // Prepare a summary of the current state for the model
    const activeTokens = tokens.filter(t => t.status === TokenStatus.WAITING || t.status === TokenStatus.SERVING);
    
    const servedTokens = tokens.filter(t => (t.status === TokenStatus.COMPLETED || t.status === TokenStatus.SERVING) && (t.firstServedAt || t.servedAt) && t.createdAt);
    
    const avgWaitTime = servedTokens.length > 0 
      ? `${Math.round(servedTokens.reduce((acc, t) => {
          const endTime = t.firstServedAt || t.servedAt!;
          return acc + Math.max(0, endTime - t.createdAt);
        }, 0) / servedTokens.length / 60000)} minutes`
      : "No historical data yet";

    const waitingCount = activeTokens.filter(t => t.status === TokenStatus.WAITING).length;
    const servingCount = activeTokens.filter(t => t.status === TokenStatus.SERVING).length;

    const prompt = `
      You are an expert Clinic Operations Manager. Analyze the following queue data and provide 3 short, actionable bullet points to improve flow.
      
      Context:
      - Departments: ${departments.map(d => d.name).join(', ')}
      - Active Counters: ${counters.filter(c => c.isOnline).length} / ${counters.length}
      - Patients Waiting: ${waitingCount}
      - Patients Being Served: ${servingCount}
      - Avg Wait Time: ${avgWaitTime}
      - Queues by Dept: ${departments.map(d => {
          const count = activeTokens.filter(t => t.departmentId === d.id).length;
          return `${d.name}: ${count}`;
      }).join(', ')}

      Keep the tone professional, encouraging, and focused on patient throughput.
    `;

    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: prompt,
    });
    return response.text || "No insights available at this moment.";
  } catch (error) {
    console.error("Gemini Error:", error);
    return "Unable to generate insights due to network or API limits.";
  }
};

/**
 * Translates a department name to Urdu using Gemini.
 */
export const translateToUrdu = async (englishName: string): Promise<string> => {
  // Offline Check
  if (!navigator.onLine) return "";
  
  if (!process.env.API_KEY || !englishName.trim()) return "";

  try {
    const { GoogleGenAI } = await loadGenAI();
    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
    const prompt = `Translate the following hospital department name into concise, professional Urdu: "${englishName}". 
    Provide ONLY the Urdu translation. Do not include transliteration or explanations. 
    Example: "Pediatrics" -> "بچوں کا کلینک"`;

    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: prompt,
    });
    return response.text?.trim() || "";
  } catch (error) {
    console.error("Translation Error:", error);
    return "";
  }
};

/**
 * Generates speech from text using Gemini TTS.
 * Returns base64 encoded PCM audio data.
 */
export const generateSpeech = async (text: string): Promise<string | null> => {
  // Offline Check
  if (!navigator.onLine) return null;

  if (!process.env.API_KEY || !text.trim()) return null;

  try {
    const { GoogleGenAI, Modality } = await loadGenAI();
    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash-preview-tts',
      contents: { parts: [{ text }] },
      config: {
        responseModalities: [Modality.AUDIO],
        speechConfig: {
          voiceConfig: {
            prebuiltVoiceConfig: { voiceName: 'Kore' },
          },
        },
      },
    });
    return response.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data || null;
  } catch (error) {
    console.error("Speech Generation Error:", error);
    return null;
  }
};
