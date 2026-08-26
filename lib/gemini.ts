import { GoogleGenerativeAI } from '@google/generative-ai';
import { LabelFields } from './types';

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || '');

const EXTRACTION_PROMPT = `
Extract the following information from this alcohol label image and return it as a JSON object with these exact fields:

- brandName: The brand name of the product
- classType: The class/type designation (e.g., "Table Wine", "Distilled Spirits", "Malt Beverage")
- alcoholContent: The alcohol content statement (e.g., "13.5% ALCOHOL BY VOLUME")
- netContents: The net contents statement (e.g., "750 mL")
- governmentWarningText: The full government warning text exactly as it appears on the label
- governmentWarningFormatted: A boolean indicating whether "GOVERNMENT WARNING:" appears in bold and all capital letters

Return ONLY a valid JSON object. Do not include any explanatory text before or after the JSON.
`;

export async function extractLabelFields(imageBase64: string): Promise<LabelFields> {
  try {
    const model = genAI.getGenerativeModel({ 
      model: 'gemini-2.0-flash',
      generationConfig: {
        responseMimeType: 'application/json',
      }
    });

    const imageData = {
      inlineData: {
        data: imageBase64,
        mimeType: 'image/jpeg',
      },
    };

    const result = await model.generateContent([EXTRACTION_PROMPT, imageData]);
    const response = await result.response;
    const text = response.text();
    
    const parsedData = JSON.parse(text);
    return parsedData as LabelFields;
  } catch (error) {
    console.error('Error extracting label fields:', error);
    throw new Error('Failed to extract data from label image');
  }
}
