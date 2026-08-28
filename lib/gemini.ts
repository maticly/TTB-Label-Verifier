// lib/gemini.ts
import { LabelFields } from './types';

const MODEL_NAME = 'gemini-3.1-flash-lite';

const EXTRACTION_PROMPT = `Extract these fields from this alcohol label image and return ONLY a JSON object with this exact shape, no other text:
{
  "brandName": string,
  "classType": string,
  "alcoholContent": string,
  "netContents": string,
  "governmentWarningText": string (the full warning text verbatim),
  "governmentWarningFormatted": boolean (true only if "GOVERNMENT WARNING:" appears in bold and ALL CAPS)
}`;

export async function extractLabelFields(imageBase64: string): Promise<LabelFields> {
  const apiKey = process.env.GEMINI_API_KEY;
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${MODEL_NAME}:generateContent?key=${apiKey}`;

  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      contents: [{
        parts: [
          { text: EXTRACTION_PROMPT },
          { inline_data: { mime_type: 'image/jpeg', data: imageBase64 } },
        ],
      }],
      generationConfig: { responseMimeType: 'application/json' },
    }),
  });

  if (!res.ok) {
    const errText = await res.text();
    console.error('=== GEMINI API ERROR ===', res.status, errText);
    throw new Error('Failed to extract data from label image');
  }

  const data = await res.json();
  const text = data.candidates?.[0]?.content?.parts?.[0]?.text;
  return JSON.parse(text) as LabelFields;
}