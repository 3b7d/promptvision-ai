import { GoogleGenAI, Type } from "@google/genai";

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

export interface AnalysisResult {
  visualAnalysis: string;
  artisticDirection: string;
  styleExplanation: string;
  englishMasterPrompt: string;
  arabicMasterPrompt: string;
  platformPrompts: {
    midjourney: string;
    flux: string;
    geminiImage: string;
    veo: string;
    runway: string;
    kling: string;
  };
  englishNegativePrompt: string;
  arabicNegativePrompt: string;
  cinematicTags: string[];
}

export async function analyzeMedia(
  fileData: string,
  mimeType: string,
  isRefining: boolean = false,
  refinementType?: string
): Promise<AnalysisResult> {
const model = "gemini-2.5-flash";
  const systemInstruction = `You are PromptVision AI, an elite multimodal AI visual prompt engineer and cinematic analyst.
Your task is to reverse engineer uploaded media into professional AI generation prompts.

Instructions:
1. Conduct deep visual analysis (subjects, environment, lighting, color, camera, texture).
2. Identify artistic direction and explain it.
3. Generate extremely rich master prompts (min 120 words) in both English and Arabic.
4. Provide platform-specific optimized prompts.
5. Provide negative prompts.
6. Use cinematic vocabulary and technical film language.

${isRefining ? `REFINEMENT MODE: The user wants to refine the previous analysis. Style requested: ${refinementType}. Adjust all prompts to emphasize this style.` : ""}

Format your response as a valid JSON object matching the requested schema.`;

  const imagePart = {
    inlineData: {
      mimeType,
      data: fileData,
    },
  };

  const textPart = {
    text: "Analyze this media and generate the premium prompt suite as defined in your system instructions.",
  };

  const response = await ai.models.generateContent({
    model,
    contents: { parts: [imagePart, textPart] },
    config: {
      systemInstruction,
      responseMimeType: "application/json",
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          visualAnalysis: { type: Type.STRING },
          artisticDirection: { type: Type.STRING },
          styleExplanation: { type: Type.STRING },
          englishMasterPrompt: { type: Type.STRING },
          arabicMasterPrompt: { type: Type.STRING },
          platformPrompts: {
            type: Type.OBJECT,
            properties: {
              midjourney: { type: Type.STRING },
              flux: { type: Type.STRING },
              geminiImage: { type: Type.STRING },
              veo: { type: Type.STRING },
              runway: { type: Type.STRING },
              kling: { type: Type.STRING },
            },
            required: ["midjourney", "flux", "geminiImage", "veo", "runway", "kling"],
          },
          englishNegativePrompt: { type: Type.STRING },
          arabicNegativePrompt: { type: Type.STRING },
          cinematicTags: {
            type: Type.ARRAY,
            items: { type: Type.STRING },
          },
        },
        required: [
          "visualAnalysis",
          "artisticDirection",
          "styleExplanation",
          "englishMasterPrompt",
          "arabicMasterPrompt",
          "platformPrompts",
          "englishNegativePrompt",
          "arabicNegativePrompt",
          "cinematicTags",
        ],
      },
    },
  });

  if (!response.text) {
    throw new Error("No response from AI engine");
  }

  return JSON.parse(response.text);
}
