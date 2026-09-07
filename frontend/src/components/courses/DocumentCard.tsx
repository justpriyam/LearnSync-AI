'use client';

import React, { useState } from 'react';
import { DocumentResponse } from '@/lib/types';

interface DocumentCardProps {
  document: DocumentResponse;
  onGenerateCourse: (docId: string) => void;
}

export default function DocumentCard({ document, onGenerateCourse }: DocumentCardProps) {
  const [isGenerating, setIsGenerating] = useState(false);

  const handleGenerate = async (e: React.MouseEvent) => {
    e.stopPropagation();
    setIsGenerating(true);
    try {
      await onGenerateCourse(document.id);
    } finally {
      setIsGenerating(false);
    }
  };

  const getStatusBadge = () => {
    switch (document.status) {
      case 'ready':
        return <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-green-100 text-green-800 dark:bg-green-900/50 dark:text-green-300">Ready</span>;
      case 'processing':
        return <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-blue-100 text-blue-800 dark:bg-blue-900/50 dark:text-blue-300 animate-pulse">Processing</span>;
      case 'failed':
        return <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-red-100 text-red-800 dark:bg-red-900/50 dark:text-red-300">Failed</span>;
      default:
        return <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-yellow-100 text-yellow-800 dark:bg-yellow-900/50 dark:text-yellow-300">Pending</span>;
    }
  };

  return (
    <div className="flex items-center justify-between p-4 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl shadow-xs hover:border-gray-300 dark:hover:border-gray-700 transition-colors">
      <div className="flex items-center gap-4 min-w-0">
        <div className="p-2.5 bg-blue-50 dark:bg-blue-950/50 rounded-lg shrink-0">
          <svg className="w-6 h-6 text-blue-600 dark:text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
          </svg>
        </div>
        <div className="min-w-0">
          <h3 className="text-base font-semibold text-gray-900 dark:text-gray-100 truncate">{document.filename}</h3>
          <div className="flex items-center gap-3 text-xs text-gray-500 mt-1">
            <span>{new Date(document.created_at).toLocaleDateString()}</span>
            {document.chunk_count !== null && document.chunk_count !== undefined && (
              <>
                <span>•</span>
                <span>{document.chunk_count} chunks</span>
              </>
            )}
          </div>
        </div>
      </div>
      
      <div className="flex items-center gap-4 shrink-0">
        {getStatusBadge()}
        {document.status === 'ready' && (
          <button
            onClick={handleGenerate}
            disabled={isGenerating}
            className="px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white text-sm font-medium rounded-lg shadow-xs transition-colors"
          >
            {isGenerating ? 'Generating...' : 'Generate Course'}
          </button>
        )}
      </div>
    </div>
  );
}
