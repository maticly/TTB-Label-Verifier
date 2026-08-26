'use client';

import { VerificationResult } from '@/lib/types';

interface ResultCardProps {
  result: VerificationResult;
}

export default function ResultCard({ result }: ResultCardProps) {
  const FieldResult = ({ label, pass, reason }: { label: string; pass: boolean; reason: string }) => (
    <div className="flex items-start gap-4 p-4 bg-gray-50 rounded-lg">
      <div className="flex-shrink-0 mt-1">
        {pass ? (
          <div className="w-8 h-8 bg-green-500 rounded-full flex items-center justify-center">
            <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
            </svg>
          </div>
        ) : (
          <div className="w-8 h-8 bg-red-500 rounded-full flex items-center justify-center">
            <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </div>
        )}
      </div>
      <div className="flex-1">
        <p className="text-lg font-semibold text-gray-800">{label}</p>
        <p className={`text-base mt-1 ${pass ? 'text-green-700' : 'text-red-700'}`}>{reason}</p>
      </div>
    </div>
  );

  return (
    <div className="space-y-6">
      {/* Overall Pass/Fail Banner */}
      <div
        className={`p-6 rounded-lg text-center ${
          result.overallPass
            ? 'bg-green-100 border-2 border-green-500'
            : 'bg-red-100 border-2 border-red-500'
        }`}
      >
        <h2
          className={`text-3xl font-bold ${
            result.overallPass ? 'text-green-800' : 'text-red-800'
          }`}
        >
          {result.overallPass ? 'PASS' : 'FAIL'}
        </h2>
        <p className="text-lg mt-2 text-gray-700">
          {result.overallPass
            ? 'All label fields match the application data'
            : 'Some label fields do not match the application data'}
        </p>
      </div>

      {/* Individual Field Results */}
      <div className="space-y-4">
        <h3 className="text-xl font-semibold text-gray-800">Field-by-Field Results</h3>
        
        <FieldResult
          label="Brand Name"
          pass={result.brandName.pass}
          reason={result.brandName.reason}
        />
        
        <FieldResult
          label="Class / Type"
          pass={result.classType.pass}
          reason={result.classType.reason}
        />
        
        <FieldResult
          label="Alcohol Content"
          pass={result.alcoholContent.pass}
          reason={result.alcoholContent.reason}
        />
        
        <FieldResult
          label="Net Contents"
          pass={result.netContents.pass}
          reason={result.netContents.reason}
        />
        
        <FieldResult
          label="Government Warning"
          pass={result.governmentWarningText.pass}
          reason={result.governmentWarningText.reason}
        />
        
        <FieldResult
          label="Warning Formatting"
          pass={result.governmentWarningFormatted.pass}
          reason={result.governmentWarningFormatted.reason}
        />
      </div>
    </div>
  );
}
