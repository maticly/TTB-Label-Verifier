'use client';

import { useState } from 'react';
import { VerificationResult } from '@/lib/types';

interface BatchItem {
  fileName: string;
  result?: VerificationResult;
  error?: string;
}

interface BatchTableProps {
  items: BatchItem[];
}

export default function BatchTable({ items }: BatchTableProps) {
  const [expandedRows, setExpandedRows] = useState<Set<number>>(new Set());

  const toggleRow = (index: number) => {
    const newExpanded = new Set(expandedRows);
    if (newExpanded.has(index)) {
      newExpanded.delete(index);
    } else {
      newExpanded.add(index);
    }
    setExpandedRows(newExpanded);
  };

  const FieldResult = ({ label, pass, reason }: { label: string; pass: boolean; reason: string }) => (
    <div className="flex items-start gap-3 p-3 bg-gray-50 rounded">
      <div className="flex-shrink-0 mt-1">
        {pass ? (
          <div className="w-6 h-6 bg-green-500 rounded-full flex items-center justify-center">
            <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
            </svg>
          </div>
        ) : (
          <div className="w-6 h-6 bg-red-500 rounded-full flex items-center justify-center">
            <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </div>
        )}
      </div>
      <div className="flex-1">
        <p className="text-base font-semibold text-gray-800">{label}</p>
        <p className={`text-sm mt-1 ${pass ? 'text-green-700' : 'text-red-700'}`}>{reason}</p>
      </div>
    </div>
  );

  return (
    <div className="space-y-4">
      <h3 className="text-xl font-semibold text-gray-800">Batch Results ({items.length} files)</h3>
      
      <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
        <table className="w-full">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-4 py-3 text-left text-base font-semibold text-gray-700">File Name</th>
              <th className="px-4 py-3 text-left text-base font-semibold text-gray-700">Status</th>
              <th className="px-4 py-3 text-left text-base font-semibold text-gray-700">Result</th>
              <th className="px-4 py-3 text-left text-base font-semibold text-gray-700">Details</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200">
            {items.map((item, index) => (
              <>
                <tr key={index} className="hover:bg-gray-50">
                  <td className="px-4 py-3 text-base text-gray-800">{item.fileName}</td>
                  <td className="px-4 py-3">
                    {item.error ? (
                      <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-red-100 text-red-800">
                        Error
                      </span>
                    ) : item.result ? (
                      <span className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ${
                        item.result.overallPass
                          ? 'bg-green-100 text-green-800'
                          : 'bg-red-100 text-red-800'
                      }`}>
                        {item.result.overallPass ? 'Pass' : 'Fail'}
                      </span>
                    ) : (
                      <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-gray-100 text-gray-800">
                        Pending
                      </span>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    {item.error ? (
                      <span className="text-sm text-red-600">{item.error}</span>
                    ) : item.result ? (
                      <span className={`text-sm ${item.result.overallPass ? 'text-green-700' : 'text-red-700'}`}>
                        {item.result.overallPass ? 'All fields match' : 'Some fields do not match'}
                      </span>
                    ) : null}
                  </td>
                  <td className="px-4 py-3">
                    {item.result && (
                      <button
                        onClick={() => toggleRow(index)}
                        className="text-blue-600 hover:text-blue-800 text-base font-medium"
                      >
                        {expandedRows.has(index) ? 'Hide Details' : 'Show Details'}
                      </button>
                    )}
                  </td>
                </tr>
                {expandedRows.has(index) && item.result && (
                  <tr>
                    <td colSpan={4} className="px-4 py-4 bg-gray-50">
                      <div className="space-y-3">
                        <FieldResult
                          label="Brand Name"
                          pass={item.result.brandName.pass}
                          reason={item.result.brandName.reason}
                        />
                        <FieldResult
                          label="Class / Type"
                          pass={item.result.classType.pass}
                          reason={item.result.classType.reason}
                        />
                        <FieldResult
                          label="Alcohol Content"
                          pass={item.result.alcoholContent.pass}
                          reason={item.result.alcoholContent.reason}
                        />
                        <FieldResult
                          label="Net Contents"
                          pass={item.result.netContents.pass}
                          reason={item.result.netContents.reason}
                        />
                        <FieldResult
                          label="Government Warning"
                          pass={item.result.governmentWarningText.pass}
                          reason={item.result.governmentWarningText.reason}
                        />
                        <FieldResult
                          label="Warning Formatting"
                          pass={item.result.governmentWarningFormatted.pass}
                          reason={item.result.governmentWarningFormatted.reason}
                        />
                      </div>
                    </td>
                  </tr>
                )}
              </>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
