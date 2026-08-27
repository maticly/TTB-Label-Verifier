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

// Helper function to normalize filename for matching
const normalizeFilename = (filename: string): string => {
  return filename.trim().toLowerCase();
};

// Helper function to check if two filenames match (case-insensitive, extension-agnostic)
const filenamesMatch = (csvFilename: string, uploadedFilename: string): boolean => {
  const normalizedCsv = normalizeFilename(csvFilename);
  const normalizedUploaded = normalizeFilename(uploadedFilename);
  
  // Remove extension from both for comparison
  const csvBase = normalizedCsv.replace(/\.[^/.]+$/, '');
  const uploadedBase = normalizedUploaded.replace(/\.[^/.]+$/, '');
  
  return csvBase === uploadedBase;
};

// Application data is matched by filename from the uploaded CSV
// The client sends a Map of filename to ApplicationData as a JSON stringified array of entries

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

    // Extract application data map
    const applicationDataStr = formData.get('applicationData') as string;
    if (!applicationDataStr) {
      return NextResponse.json(
        { error: 'Application data map is required' },
        { status: 400 }
      );
    }

    let appDataEntries: [string, ApplicationData][];
    try {
      appDataEntries = JSON.parse(applicationDataStr);
    } catch (parseError) {
      return NextResponse.json(
        { error: 'Application data must be a valid JSON array of filename-application data pairs' },
        { status: 400 }
      );
    }

    if (!Array.isArray(appDataEntries)) {
      return NextResponse.json(
        { error: 'Application data must be an array of filename-application data pairs' },
        { status: 400 }
      );
    }

    // Convert to Map for filename lookup
    const appDataMap = new Map<string, ApplicationData>(appDataEntries);

    // Validate each application data entry
    for (const [filename, appData] of appDataMap.entries()) {
      if (!appData.brandName || !appData.classType || 
          !appData.alcoholContent || !appData.netContents) {
        return NextResponse.json(
          { error: `Application data for file "${filename}" is missing required fields: brandName, classType, alcoholContent, netContents` },
          { status: 400 }
        );
      }
    }

    // Process labels concurrently with a concurrency cap of 6
    const limit = pLimit(6);
    const results: BatchItem[] = [];

    const startTime = Date.now();

    const processingPromises = files.map((file) =>
      limit(async () => {
        const item: BatchItem = { fileName: file.name };
        
        try {
          // Get application data for this file by filename (case-insensitive, extension-agnostic)
          let appData: ApplicationData | undefined;
          for (const [csvFilename, data] of appDataMap.entries()) {
            if (filenamesMatch(csvFilename, file.name)) {
              appData = data;
              break;
            }
          }
          
          if (!appData) {
            throw new Error(`No application data found for file "${file.name}"`);
          }

          // Convert image to base64
          const bytes = await file.arrayBuffer();
          const buffer = Buffer.from(bytes);
          const base64Image = buffer.toString('base64');

          // Call Gemini API with timing
          const geminiStartTime = Date.now();
          const extractedFields = await extractLabelFields(base64Image);
          const geminiEndTime = Date.now();
          console.log(`Gemini API call for ${file.name} took ${geminiEndTime - geminiStartTime}ms`);

          // Compare with application data
          const verificationResult = compareFields(extractedFields, appData);
          
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
