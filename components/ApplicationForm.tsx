'use client';

import { ApplicationData } from '@/lib/types';

interface ApplicationFormProps {
  data: ApplicationData;
  onChange: (data: ApplicationData) => void;
  disabled?: boolean;
}

export default function ApplicationForm({ data, onChange, disabled = false }: ApplicationFormProps) {
  const handleChange = (field: keyof ApplicationData, value: string) => {
    onChange({ ...data, [field]: value });
  };

  return (
    <div className="space-y-6">
      <div>
        <label htmlFor="brandName" className="block text-lg font-semibold text-gray-800 mb-2">
          Brand Name
        </label>
        <input
          id="brandName"
          type="text"
          value={data.brandName}
          onChange={(e) => handleChange('brandName', e.target.value)}
          disabled={disabled}
          className="w-full px-4 py-3 text-lg border-2 border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 disabled:bg-gray-100 disabled:cursor-not-allowed"
          placeholder="Enter the brand name"
        />
      </div>

      <div>
        <label htmlFor="classType" className="block text-lg font-semibold text-gray-800 mb-2">
          Class / Type
        </label>
        <input
          id="classType"
          type="text"
          value={data.classType}
          onChange={(e) => handleChange('classType', e.target.value)}
          disabled={disabled}
          className="w-full px-4 py-3 text-lg border-2 border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 disabled:bg-gray-100 disabled:cursor-not-allowed"
          placeholder="e.g., Table Wine, Distilled Spirits"
        />
      </div>

      <div>
        <label htmlFor="alcoholContent" className="block text-lg font-semibold text-gray-800 mb-2">
          Alcohol Content
        </label>
        <input
          id="alcoholContent"
          type="text"
          value={data.alcoholContent}
          onChange={(e) => handleChange('alcoholContent', e.target.value)}
          disabled={disabled}
          className="w-full px-4 py-3 text-lg border-2 border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 disabled:bg-gray-100 disabled:cursor-not-allowed"
          placeholder="e.g., 13.5% ALCOHOL BY VOLUME"
        />
      </div>

      <div>
        <label htmlFor="netContents" className="block text-lg font-semibold text-gray-800 mb-2">
          Net Contents
        </label>
        <input
          id="netContents"
          type="text"
          value={data.netContents}
          onChange={(e) => handleChange('netContents', e.target.value)}
          disabled={disabled}
          className="w-full px-4 py-3 text-lg border-2 border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 disabled:bg-gray-100 disabled:cursor-not-allowed"
          placeholder="e.g., 750 mL"
        />
      </div>
    </div>
  );
}
