import { NextRequest, NextResponse } from 'next/server';
import { extractLabelFields } from '@/lib/gemini';
import { compareFields } from '@/lib/matching';
import { ApplicationData, LabelFields, VerificationResult } from '@/lib/types';
import pLimit from 'p-limit';

interface BatchItem {
  fileName: string;
  result?: VerificationResult;
  error?: string;
}

// Assumption: Application data array is matched by array order with the uploaded files
// The first application data entry corresponds to the first uploaded file, second to second, etc.
// This is documented in the API endpoint for clarity.

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    
    // Extract image files
    const files = formData.getAll('images') as File[];
    if (!files || files.length === 0) {
      return NextResponse.json(
        { error: 'At least one image file is required' },
        { status: 400 }
      );
    }

    // Extract application data array
    const applicationDataStr = formData.get('applicationData') as string;
    if (!applicationDataStr) {
      return NextResponse.json(
        { error: 'Application data array is required' },
        { status: 400 }
      );
    }

    let applicationDataArray: ApplicationData[];
    try {
      applicationDataArray = JSON.parse(applicationDataStr);
    } catch (parseError) {
      return NextResponse.json(
        { error: 'Application data must be a valid JSON array' },
        { status: 400 }
      );
    }

    if (!Array.isArray(applicationDataArray)) {
      return NextResponse.json(
        { error: 'Application data must be an array' },
        { status: 400 }
      );
    }

    // Validate that the number of files matches the number of application data entries
    if (files.length !== applicationDataArray.length) {
      return NextResponse.json(
        { error: `Number of files (${files.length}) must match number of application data entries (${applicationDataArray.length})` },
        { status: 400 }
      );
    }

    // Validate each application data entry
    for (let i = 0; i < applicationDataArray.length; i++) {
      const appData = applicationDataArray[i];
      if (!appData.brandName || !appData.classType || 
          !appData.alcoholContent || !appData.netContents) {
        return NextResponse.json(
          { error: `Application data entry ${i + 1} is missing required fields: brandName, classType, alcoholContent, netContents` },
          { status: 400 }
        );
      }
    }

    // Process labels concurrently with a concurrency cap of 6
    const limit = pLimit(6);
    const results: BatchItem[] = [];

    const startTime = Date.now();

    const processingPromises = files.map((file, index) =>
      limit(async () => {
        const item: BatchItem = { fileName: file.name };
        
        try {
          // Convert image to base64
          const bytes = await file.arrayBuffer();
          const buffer = Buffer.from(bytes);
          const base64Image = buffer.toString('base64');

          // Call Gemini API with timing
          const geminiStartTime = Date.now();
          const extractedFields = await extractLabelFields(base64Image);
          const geminiEndTime = Date.now();
          console.log(`Gemini API call for ${file.name} took ${geminiEndTime - geminiStartTime}ms`);

          // Compare with corresponding application data
          const verificationResult = compareFields(extractedFields, applicationDataArray[index]);
          
          item.result = verificationResult;
        } catch (error) {
          console.error(`Error processing ${file.name}:`, error);
          item.error = error instanceof Error ? error.message : 'Failed to process image';
        }

        return item;
      })
    );

    const processedItems = await Promise.all(processingPromises);
    results.push(...processedItems);

    const totalTime = Date.now() - startTime;
    console.log(`Batch processing of ${files.length} files completed in ${totalTime}ms`);

    return NextResponse.json({ results });
  } catch (error) {
    console.error('Batch verification endpoint error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'An unexpected error occurred during batch verification' },
      { status: 500 }
    );
  }
}
