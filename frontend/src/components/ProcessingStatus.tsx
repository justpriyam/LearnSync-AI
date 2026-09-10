'use client';

import React, { useEffect, useState } from 'react';
import { getDocumentStatus } from '../lib/api';
import { DocumentStatusResponse } from '../lib/types';

interface ProcessingStatusProps {
  documentId: string;
  onReady: (doc: DocumentStatusResponse) => void;
}

export default function ProcessingStatus({ documentId, onReady }: ProcessingStatusProps) {
  const [status, setStatus] = useState<DocumentStatusResponse | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const checkStatus = async () => {
      try {
        const res = await getDocumentStatus(documentId);
        setStatus(res);
        setError(null);
        
        if (res.status === 'ready') {
          clearInterval(interval);
          onReady(res);
        } else if (res.status === 'failed') {
          clearInterval(interval);
        }
      } catch (err: unknown) {
        setError(err instanceof Error ? err.message : 'Failed to check document status');
      }
    };
    const interval = setInterval(() => void checkStatus(), 2000);
    void checkStatus();

    return () => clearInterval(interval);
  }, [documentId, onReady]);

  if (error) {
    return <div className="p-4 text-red-600">{error}</div>;
  }

  if (!status) return <div className="text-gray-500 p-4">Checking document status...</div>;

  let text = '';
  let color = 'text-gray-600';
  let showPulse = false;

  switch (status.status) {
    case 'pending':
      text = 'Pending processing...';
      showPulse = true;
      break;
    case 'processing':
      text = 'Processing document...';
      color = 'text-blue-600';
      showPulse = true;
      break;
    case 'ready':
      text = 'Ready!';
      color = 'text-green-600';
      break;
    case 'failed':
      text = `Failed: ${status.error_message || 'Unknown error'}`;
      color = 'text-red-600';
      break;
  }

  return (
    <div className="flex items-center gap-3 p-4 bg-gray-50 dark:bg-gray-800 rounded-lg">
      {showPulse && (
        <div className="w-3 h-3 bg-blue-500 rounded-full animate-pulse"></div>
      )}
      <span className={`font-medium ${color}`}>{text}</span>
      {status.chunk_count !== null && (
        <span className="text-sm text-gray-500 ml-auto">{status.chunk_count} chunks</span>
      )}
    </div>
  );
}
