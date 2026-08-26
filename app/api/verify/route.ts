import { NextRequest, NextResponse } from 'next/server';
import { extractLabelFields } from '@/lib/gemini';
import { compareFields } from '@/lib/matching';
import { ApplicationData, LabelFields } from '@/lib/types';

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    
    // Extract image file
    const file = formData.get('image') as File;
    if (!file) {
      return NextResponse.json(
        { error: 'Image file is required' },
        { status: 400 }
      );
    }

    // Extract application data
    const applicationData: ApplicationData = {
      brandName: formData.get('brandName') as string || '',
      classType: formData.get('classType') as string || '',
      alcoholContent: formData.get('alcoholContent') as string || '',
      netContents: formData.get('netContents') as string || '',
      governmentWarningText: formData.get('governmentWarningText') as string || '',
      governmentWarningFormatted: formData.get('governmentWarningFormatted') === 'true',
    };

    // Validate required fields
    if (!applicationData.brandName || !applicationData.classType || 
        !applicationData.alcoholContent || !applicationData.netContents) {
      return NextResponse.json(
        { error: 'Missing required application fields: brandName, classType, alcoholContent, netContents' },
        { status: 400 }
      );
    }

    // Convert image to base64
    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);
    const base64Image = buffer.toString('base64');

    // Call Gemini API with timing
    const geminiStartTime = Date.now();
    let extractedFields: LabelFields;
    
    try {
      extractedFields = await extractLabelFields(base64Image);
    } catch (geminiError) {
      console.error('Gemini API call failed:', geminiError);
      return NextResponse.json(
        { error: 'Failed to extract label data from image. Please ensure the image is clear and contains a valid alcohol label.' },
        { status: 500 }
      );
    }
    
    const geminiEndTime = Date.now();
    const geminiDuration = geminiEndTime - geminiStartTime;
    console.log(`Gemini API call took ${geminiDuration}ms`);

    // Compare extracted fields with application data
    const verificationResult = compareFields(extractedFields, applicationData);

    return NextResponse.json(verificationResult);
  } catch (error) {
    console.error('Verification endpoint error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'An unexpected error occurred during verification' },
      { status: 500 }
    );
  }
}
