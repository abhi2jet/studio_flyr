import { GoogleGenAI } from "@google/genai";

let aiClient: GoogleGenAI | null = null;

export function getAI(): GoogleGenAI {
  if (!aiClient) {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      throw new Error("GEMINI_API_KEY environment variable is not set.");
    }
    aiClient = new GoogleGenAI({ apiKey });
  }
  return aiClient;
}

export async function testGeminiConnection(): Promise<boolean> {
  try {
    const ai = getAI();
    // Use a lightweight model for connectivity check
    await ai.models.generateContent({
      model: "gemini-2.0-flash",
      contents: { parts: [{ text: "ping" }] }
    });
    return true;
  } catch (error) {
    console.error("Gemini connection test failed:", error);
    return false;
  }
}

export async function generateVideo(prompt: string): Promise<string> {
  const ai = getAI();
  let operation = await ai.models.generateVideos({
    model: 'veo-3.1-lite-generate-preview',
    prompt: prompt,
    config: {
      numberOfVideos: 1,
      resolution: '720p',
      aspectRatio: '16:9'
    }
  });

  // @ts-ignore - wait for completion
  const result = await operation.wait();

  // @ts-ignore - access generatedVideos directly
  const videoBase64 = result.response.generatedVideos[0].video.videoBytes;
  return `data:video/mp4;base64,${videoBase64}`;
}
