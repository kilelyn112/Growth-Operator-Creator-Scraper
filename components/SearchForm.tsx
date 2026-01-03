'use client';

import { useState } from 'react';

interface SearchFormProps {
  onSearch: (keyword: string, maxResults: number) => void;
  disabled?: boolean;
}

export default function SearchForm({ onSearch, disabled }: SearchFormProps) {
  const [keyword, setKeyword] = useState('');
  const [maxResults, setMaxResults] = useState(50);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (keyword.trim()) {
      onSearch(keyword.trim(), maxResults);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="bg-white rounded-lg shadow-md p-6">
      <h2 className="text-xl font-semibold mb-4 text-gray-800">Find YouTube Creators</h2>

      <div className="space-y-4">
        <div>
          <label htmlFor="keyword" className="block text-sm font-medium text-gray-700 mb-1">
            Niche / Keyword
          </label>
          <input
            type="text"
            id="keyword"
            value={keyword}
            onChange={(e) => setKeyword(e.target.value)}
            placeholder="e.g., fitness coaching, real estate investing"
            className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-gray-900"
            disabled={disabled}
          />
        </div>

        <div>
          <label htmlFor="maxResults" className="block text-sm font-medium text-gray-700 mb-1">
            Max Results
          </label>
          <input
            type="number"
            id="maxResults"
            value={maxResults}
            onChange={(e) => setMaxResults(Math.min(200, Math.max(1, parseInt(e.target.value) || 50)))}
            min={1}
            max={200}
            className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-gray-900"
            disabled={disabled}
          />
          <p className="text-xs text-gray-500 mt-1">Maximum 200 results per search</p>
        </div>

        <button
          type="submit"
          disabled={disabled || !keyword.trim()}
          className="w-full bg-blue-600 text-white py-2 px-4 rounded-md hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors font-medium"
        >
          {disabled ? 'Searching...' : 'Start Search'}
        </button>
      </div>
    </form>
  );
}
