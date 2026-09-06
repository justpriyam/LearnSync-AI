"use client";

import React, { useEffect, useState, useCallback, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { listDocuments, generateSprint } from '@/lib/api';
import { DocumentResponse, DocumentStatusResponse } from '@/lib/types';
import UploadZone from '@/components/UploadZone';
import ProcessingStatus from '@/components/ProcessingStatus';
import DocumentCard from '@/components/DocumentCard';

export default function SprintPage() {
  const router = useRouter();

  // State
  const [documents, setDocuments] = useState<DocumentResponse[]>([]);
  const [loadingDocs, setLoadingDocs] = useState(true);
  
  const [syllabusDocId, setSyllabusDocId] = useState<string | null>(null);
  const [pyqDocId, setPyqDocId] = useState<string | null>(null);
  const [processingPyqId, setProcessingPyqId] = useState<string | null>(null);
  
  const [deadline, setDeadline] = useState<string>('');
  const [generating, setGenerating] = useState(false);

  // Computed
  const readyDocuments = useMemo(() => documents.filter(d => d.status === 'ready'), [documents]);
  
  const minDate = useMemo(() => {
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    return tomorrow.toISOString().split('T')[0];
  }, []);

  const daysRemaining = useMemo(() => {
    if (!deadline) return null;
    const d = new Date(deadline);
    const today = new Date();
    const diff = Math.ceil((d.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
    return diff > 0 ? diff : 0;
  }, [deadline]);

  // Actions
  const fetchDocs = useCallback(async () => {
    try {
      setLoadingDocs(true);
      const docs = await listDocuments();
      setDocuments(docs.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()));
    } catch (err) {
      console.error(err);
    } finally {
      setLoadingDocs(false);
    }
  }, []);

  useEffect(() => {
    fetchDocs();
  }, [fetchDocs]);

  const handlePyqUploadComplete = (doc: DocumentResponse) => {
    setDocuments(prev => [doc, ...prev]);
    setProcessingPyqId(doc.id);
  };

  const handlePyqReady = (statusDoc: DocumentStatusResponse) => {
    setDocuments(prev => prev.map(d => d.id === statusDoc.id ? { ...d, ...statusDoc } as DocumentResponse : d));
    setProcessingPyqId(null);
    if (statusDoc.status === 'ready') {
      setPyqDocId(statusDoc.id);
    }
  };

  const handleGenerate = async () => {
    if (!syllabusDocId || !pyqDocId || !deadline) return;
    try {
      setGenerating(true);
      const res = await generateSprint(syllabusDocId, pyqDocId, deadline);
      router.push(`/sprint/${res.id}`);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Failed to generate sprint";
      alert(message);
      setGenerating(false);
    }
  };

  return (
    <div className="max-w-3xl mx-auto space-y-12 pb-20">
      <div>
        <h1 className="text-3xl font-bold mb-2 text-gray-900 dark:text-gray-100">Sprint Planner</h1>
        <p className="text-gray-600 dark:text-gray-400">Generate an optimized study plan based on your syllabus and previous year questions (PYQs).</p>
      </div>

      {/* Step 1 */}
      <section className={`border rounded-xl p-6 ${syllabusDocId ? 'border-green-500 bg-green-50 dark:bg-green-900/10' : 'border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900'}`}>
        <h2 className="text-xl font-bold mb-4 flex items-center gap-2">
          Step 1: Select Syllabus Document
          {syllabusDocId && <span className="text-green-600 dark:text-green-400 text-sm font-normal">✓ Selected</span>}
        </h2>
        {loadingDocs ? (
          <p className="text-gray-500">Loading documents...</p>
        ) : readyDocuments.length === 0 ? (
          <p className="text-gray-500">No ready documents found. Go to home page to upload your syllabus.</p>
        ) : (
          <div className="space-y-3 max-h-60 overflow-y-auto pr-2">
            {readyDocuments.map(doc => (
              <div 
                key={doc.id} 
                onClick={() => setSyllabusDocId(doc.id)}
                className={`cursor-pointer transition-colors ${syllabusDocId === doc.id ? 'ring-2 ring-blue-500' : 'hover:bg-gray-50 dark:hover:bg-gray-800'}`}
              >
                <DocumentCard document={doc} onGenerateCourse={() => {}} />
              </div>
            ))}
          </div>
        )}
      </section>

      {/* Step 2 */}
      <section className={`border rounded-xl p-6 ${pyqDocId ? 'border-green-500 bg-green-50 dark:bg-green-900/10' : 'border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900'} ${!syllabusDocId ? 'opacity-50 pointer-events-none' : ''}`}>
        <h2 className="text-xl font-bold mb-4 flex items-center gap-2">
          Step 2: Upload PYQ Document
          {pyqDocId && <span className="text-green-600 dark:text-green-400 text-sm font-normal">✓ Ready</span>}
        </h2>
        {!pyqDocId && !processingPyqId && (
          <UploadZone onUploadComplete={handlePyqUploadComplete} />
        )}
        {processingPyqId && (
          <div className="mt-4">
            <ProcessingStatus documentId={processingPyqId} onReady={handlePyqReady} />
          </div>
        )}
        {pyqDocId && (
          <p className="text-sm text-gray-700 dark:text-gray-300">
            PYQ Document selected. ID: <code className="bg-gray-100 dark:bg-gray-800 px-1 rounded">{pyqDocId}</code>
          </p>
        )}
      </section>

      {/* Step 3 */}
      <section className={`border rounded-xl p-6 ${deadline ? 'border-green-500 bg-green-50 dark:bg-green-900/10' : 'border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900'} ${!pyqDocId ? 'opacity-50 pointer-events-none' : ''}`}>
        <h2 className="text-xl font-bold mb-4 flex items-center gap-2">
          Step 3: Set Exam Deadline
          {deadline && <span className="text-green-600 dark:text-green-400 text-sm font-normal">✓ Set</span>}
        </h2>
        <div className="flex items-center gap-4">
          <input 
            type="date" 
            min={minDate}
            value={deadline}
            onChange={(e) => setDeadline(e.target.value)}
            className="px-4 py-2 border border-gray-300 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800 focus:ring-2 focus:ring-blue-500"
          />
          {daysRemaining !== null && (
            <span className="text-sm font-medium text-blue-600 dark:text-blue-400">
              {daysRemaining} days remaining
            </span>
          )}
        </div>
      </section>

      {/* Step 4 */}
      <section className="pt-6">
        <button
          onClick={handleGenerate}
          disabled={!syllabusDocId || !pyqDocId || !deadline || generating}
          className="w-full py-4 px-6 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed text-white text-lg font-semibold rounded-xl shadow-sm transition-colors flex justify-center items-center gap-2"
        >
          {generating ? 'Generating Plan...' : 'Generate Sprint Plan'}
        </button>
      </section>
    </div>
  );
}
