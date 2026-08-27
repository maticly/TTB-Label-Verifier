'use client';

import { useState } from 'react';
import ApplicationForm from '@/components/ApplicationForm';
import UploadZone from '@/components/UploadZone';
import ResultCard from '@/components/ResultCard';
import BatchTable from '@/components/BatchTable';
import { ApplicationData, VerificationResult } from '@/lib/types';

interface BatchItem {
  fileName: string;
  result?: VerificationResult;
  error?: string;
}

export default function Home() {
  const [mode, setMode] = useState<'single' | 'batch'>('single');
  
  // Single label mode state
  const [applicationData, setApplicationData] = useState<ApplicationData>({
    brandName: '',
    classType: '',
    alcoholContent: '',
    netContents: '',
    governmentWarningText: '',
    governmentWarningFormatted: false,
  });

  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [result, setResult] = useState<VerificationResult | null>(null);
  
  // Batch mode state
  const [batchFiles, setBatchFiles] = useState<File[]>([]);
  const [batchApplicationData, setBatchApplicationData] = useState<string>('');
  const [batchResults, setBatchResults] = useState<BatchItem[]>([]);
  const [batchProgress, setBatchProgress] = useState({ completed: 0, total: 0 });
  
  // Shared state
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleVerify = async () => {
    if (!selectedFile) {
      setError('Please upload a label image');
      return;
    }

    if (!applicationData.brandName || !applicationData.classType || 
        !applicationData.alcoholContent || !applicationData.netContents) {
      setError('Please fill in all required fields');
      return;
    }

    setIsProcessing(true);
    setError(null);
    setResult(null);

    try {
      const formData = new FormData();
      formData.append('image', selectedFile);
      formData.append('brandName', applicationData.brandName);
      formData.append('classType', applicationData.classType);
      formData.append('alcoholContent', applicationData.alcoholContent);
      formData.append('netContents', applicationData.netContents);
      formData.append('governmentWarningText', applicationData.governmentWarningText || '');
      formData.append('governmentWarningFormatted', applicationData.governmentWarningFormatted.toString());

      const response = await fetch('/api/verify', {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Verification failed');
      }

      const data: VerificationResult = await response.json();
      setResult(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred during verification');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleBatchVerify = async () => {
    if (batchFiles.length === 0) {
      setError('Please upload at least one label image');
      return;
    }

    if (!batchApplicationData.trim()) {
      setError('Please provide the application data as a JSON array');
      return;
    }

    let applicationDataArray: ApplicationData[];
    try {
      applicationDataArray = JSON.parse(batchApplicationData);
      if (!Array.isArray(applicationDataArray)) {
        throw new Error('Application data must be an array');
      }
      if (applicationDataArray.length !== batchFiles.length) {
        throw new Error(`Number of application data entries (${applicationDataArray.length}) must match number of files (${batchFiles.length})`);
      }
    } catch (parseError) {
      setError('Invalid JSON format. Please provide a valid JSON array of application data.');
      return;
    }

    setIsProcessing(true);
    setError(null);
    setBatchResults([]);
    setBatchProgress({ completed: 0, total: batchFiles.length });

    try {
      const formData = new FormData();
      batchFiles.forEach((file) => {
        formData.append('images', file);
      });
      formData.append('applicationData', batchApplicationData);

      const response = await fetch('/api/verify-batch', {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Batch verification failed');
      }

      const data = await response.json();
      setBatchResults(data.results);
      setBatchProgress({ completed: batchFiles.length, total: batchFiles.length });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred during batch verification');
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <main className="min-h-screen bg-gray-50 py-8 px-4">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold text-gray-900 mb-2">TTB Label Verification</h1>
          <p className="text-xl text-gray-600">
            Upload label images and verify compliance with application data
          </p>
        </div>

        {/* Mode Toggle */}
        <div className="flex gap-4 mb-8 justify-center">
          <button
            onClick={() => setMode('single')}
            className={`px-6 py-3 rounded-xl text-lg font-semibold transition-colors ${
              mode === 'single'
                ? 'bg-primary-600 text-white'
                : 'bg-white text-gray-700 border-2 border-gray-300 hover:bg-gray-50'
            }`}
          >
            Single Label
          </button>
          <button
            onClick={() => setMode('batch')}
            className={`px-6 py-3 rounded-xl text-lg font-semibold transition-colors ${
              mode === 'batch'
                ? 'bg-primary-600 text-white'
                : 'bg-white text-gray-700 border-2 border-gray-300 hover:bg-gray-50'
            }`}
          >
            Batch Processing
          </button>
        </div>

        {mode === 'single' ? (
          <>
            {/* Single Label Mode */}
            <div className="bg-white rounded-xl shadow-lg p-8 mb-6">
              <h2 className="text-2xl font-semibold text-gray-800 mb-6">Application Information</h2>
              <ApplicationForm
                data={applicationData}
                onChange={setApplicationData}
                disabled={isProcessing}
              />
            </div>

            <div className="bg-white rounded-xl shadow-lg p-8 mb-6">
              <h2 className="text-2xl font-semibold text-gray-800 mb-6">Label Image</h2>
              <UploadZone
                onFileSelect={setSelectedFile}
                disabled={isProcessing}
              />
            </div>

            <div className="mb-6">
              <button
                onClick={handleVerify}
                disabled={isProcessing || !selectedFile}
                className="w-full bg-primary-600 text-white py-4 px-8 rounded-xl text-xl font-semibold hover:bg-primary-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors shadow-md"
              >
                {isProcessing ? 'Verifying...' : 'Verify Label'}
              </button>
            </div>

            {result && (
              <div className="bg-white rounded-xl shadow-lg p-8">
                <ResultCard result={result} />
              </div>
            )}
          </>
        ) : (
          <>
            {/* Batch Mode */}
            <div className="bg-white rounded-xl shadow-lg p-8 mb-6">
              <h2 className="text-2xl font-semibold text-gray-800 mb-6">Upload Label Images</h2>
              
              <div className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center hover:border-primary-500 hover:bg-primary-50 transition-colors">
                <input
                  type="file"
                  accept="image/*"
                  multiple
                  onChange={(e) => setBatchFiles(Array.from(e.target.files || []))}
                  disabled={isProcessing}
                  className="hidden"
                  id="batch-file-upload"
                />
                <label
                  htmlFor="batch-file-upload"
                  className="cursor-pointer flex flex-col items-center gap-3"
                >
                  <div className="p-4 rounded-full bg-primary-100">
                    <svg
                      className="w-12 h-12 text-primary-600"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"
                      />
                    </svg>
                  </div>
                  <div>
                    <p className="text-xl font-medium text-gray-700">
                      Click to upload multiple label images
                    </p>
                    <p className="text-lg text-gray-500 mt-2">
                      {batchFiles.length > 0 ? `${batchFiles.length} file(s) selected` : 'Supports JPG, PNG, and other image formats'}
                    </p>
                  </div>
                </label>
              </div>

              {batchFiles.length > 0 && (
                <div className="mt-4 p-4 bg-gray-50 rounded-lg">
                  <p className="text-base text-gray-600">
                    Selected files: <span className="font-medium">{batchFiles.length}</span>
                  </p>
                  <p className="text-sm text-gray-500 mt-1">
                    First file: {batchFiles[0].name}
                    {batchFiles.length > 1 && ` ... and ${batchFiles.length - 1} more`}
                  </p>
                </div>
              )}
            </div>

            <div className="bg-white rounded-xl shadow-lg p-8 mb-6">
              <h2 className="text-2xl font-semibold text-gray-800 mb-6">
                Application Data (JSON Array)
              </h2>
              <p className="text-base text-gray-600 mb-4">
                Paste a JSON array of application data. The order must match the uploaded files.
              </p>
              <textarea
                value={batchApplicationData}
                onChange={(e) => setBatchApplicationData(e.target.value)}
                disabled={isProcessing}
                className="w-full px-4 py-3 text-base border-2 border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 disabled:bg-gray-100 disabled:cursor-not-allowed font-mono"
                rows={8}
                placeholder={`[
  {
    "brandName": "Example Brand",
    "classType": "Table Wine",
    "alcoholContent": "13.5% ALCOHOL BY VOLUME",
    "netContents": "750 mL",
    "governmentWarningText": "",
    "governmentWarningFormatted": false
  }
]`}
              />
            </div>

            <div className="mb-6">
              <button
                onClick={handleBatchVerify}
                disabled={isProcessing || batchFiles.length === 0}
                className="w-full bg-primary-600 text-white py-4 px-8 rounded-xl text-xl font-semibold hover:bg-primary-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors shadow-md"
              >
                {isProcessing ? 'Processing Batch...' : 'Verify All Labels'}
              </button>
            </div>

            {batchResults.length > 0 && (
              <div className="bg-white rounded-xl shadow-lg p-8">
                <BatchTable items={batchResults} />
              </div>
            )}
          </>
        )}

        {/* Error Message */}
        {error && (
          <div className="bg-red-50 border-2 border-red-300 rounded-xl p-6 mb-6">
            <p className="text-lg text-red-800 text-center">{error}</p>
          </div>
        )}

        {/* Loading State */}
        {isProcessing && (
          <div className="bg-primary-50 border-2 border-primary-300 rounded-xl p-8 text-center">
            <div className="inline-block animate-spin rounded-full h-12 w-12 border-4 border-primary-600 border-t-transparent mb-4"></div>
            <p className="text-lg text-primary-800">
              {mode === 'single' 
                ? 'Analyzing label image... This usually takes less than 5 seconds.'
                : `Processing batch... Processing up to 6 labels at a time to avoid rate limits.`
              }
            </p>
          </div>
        )}
      </div>
    </main>
  );
}
