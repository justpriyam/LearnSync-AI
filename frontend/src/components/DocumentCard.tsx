'use client';

import React, { useState } from 'react';
import { DocumentResponse } from '../lib/types';

interface DocumentCardProps {
  document: DocumentResponse;
  onGenerateCourse: (docId: string) => void;
}

export default function DocumentCard({ document, onGenerateCourse }: DocumentCardProps) {
  const [isGenerating, setIsGenerating] = useState(false);

  const statusColors = {
    pending: 'bg-yellow-100 text-yellow-800',
    processing: 'bg-blue-100 text-blue-800',
    ready: 'bg-green-100 text-green-800',
    failed: 'bg-red-100 text-red-800'
  };

  const handleGenerate = () => {
    setIsGenerating(true);
    onGenerateCourse(document.id);
  };

  return (
    <div className="border border-gray-200 dark:border-gray-700 p-4 rounded-lg shadow-sm flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
      <div>
        <h3 className="font-semibold text-lg">{document.filename}</h3>
        <div className="flex items-center gap-2 mt-1 text-sm text-gray-700">
          <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${statusColors[document.status]}`}>
            {document.status}
          </span>
          <span>•</span>
          <span>{new Date(document.created_at).toLocaleDateString()}</span>
          {document.chunk_count !== null && (
            <>
              <span>•</span>
              <span>{document.chunk_count} chunks</span>
            </>
          )}
        </div>
      </div>
      
      {document.status === 'ready' && (
        <button
          onClick={handleGenerate}
          disabled={isGenerating}
          className="px-4 py-2 bg-blue-600 text-white rounded-md font-medium hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          {isGenerating ? 'Generating...' : 'Generate Course'}
        </button>
      )}
    </div>
  );
}
