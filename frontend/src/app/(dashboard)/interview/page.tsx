'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { startInterview } from '@/lib/api';
import { InterviewStartResponse } from '@/lib/types';
import UploadZone from '@/components/UploadZone';
import ProcessingStatus from '@/components/ProcessingStatus';
import InterviewSession from '@/components/InterviewSession';

export default function InterviewPage() {
  const [resumeDocId, setResumeDocId] = useState<string | null>(null);
  const [resumeReady, setResumeReady] = useState(false);
  const [jdDocId, setJdDocId] = useState<string | null>(null);
  const [jdReady, setJdReady] = useState(false);
  
  const [isStarting, setIsStarting] = useState(false);
  const [sessionInfo, setSessionInfo] = useState<InterviewStartResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  
  const router = useRouter();

  const handleStart = async () => {
    if (!resumeDocId || !jdDocId) return;
    setIsStarting(true);
    setError(null);
    try {
      const res = await startInterview(resumeDocId, jdDocId);
      setSessionInfo(res);
    } catch (err: any) {
      setError(err.message || 'Failed to start interview');
    } finally {
      setIsStarting(false);
    }
  };

  const handleComplete = () => {
    if (sessionInfo) {
      router.push(`/interview/${sessionInfo.session_id}/report`);
    }
  };

  if (sessionInfo) {
    return (
      <div className="max-w-4xl mx-auto py-8">
        <InterviewSession 
          sessionId={sessionInfo.session_id} 
          openingQuestion={sessionInfo.opening_question} 
          initialDifficulty={sessionInfo.difficulty_level}
          onComplete={handleComplete}
        />
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto py-8 px-4 space-y-8">
      <div>
        <h1 className="text-3xl font-bold mb-2 text-gray-900 dark:text-gray-100">Mock Interview Mentor</h1>
        <p className="text-gray-600 dark:text-gray-400">Practice your interview skills with an AI mentor tailored to your resume and the job description.</p>
      </div>

      <div className="space-y-6">
        {/* Resume Upload */}
        <section className={`border rounded-xl p-6 ${resumeDocId ? 'border-green-500 bg-green-50 dark:bg-green-900/10' : 'border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900'}`}>
          <h2 className="text-xl font-bold mb-4 flex items-center gap-2">
            Step 1: Upload Resume
            {resumeReady && <span className="text-green-600 dark:text-green-400 text-sm font-normal">✓ Ready</span>}
          </h2>
          {!resumeDocId ? (
            <UploadZone onUploadComplete={(doc) => setResumeDocId(doc.id)} />
          ) : !resumeReady ? (
            <ProcessingStatus documentId={resumeDocId} onReady={() => setResumeReady(true)} />
          ) : (
            <p className="text-sm text-gray-700 dark:text-gray-300">Resume uploaded and processed successfully.</p>
          )}
        </section>

        {/* JD Upload */}
        <section className={`border rounded-xl p-6 ${jdDocId ? 'border-green-500 bg-green-50 dark:bg-green-900/10' : 'border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900'} ${!resumeReady ? 'opacity-50 pointer-events-none' : ''}`}>
          <h2 className="text-xl font-bold mb-4 flex items-center gap-2">
            Step 2: Upload Job Description (JD)
            {jdReady && <span className="text-green-600 dark:text-green-400 text-sm font-normal">✓ Ready</span>}
          </h2>
          {!jdDocId ? (
            <UploadZone onUploadComplete={(doc) => setJdDocId(doc.id)} />
          ) : !jdReady ? (
            <ProcessingStatus documentId={jdDocId} onReady={() => setJdReady(true)} />
          ) : (
            <p className="text-sm text-gray-700 dark:text-gray-300">Job Description uploaded and processed successfully.</p>
          )}
        </section>

        {/* Start Button */}
        <section className="pt-4">
          <button
            onClick={handleStart}
            disabled={!resumeReady || !jdReady || isStarting}
            className="w-full py-4 px-6 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed text-white text-lg font-semibold rounded-xl shadow-sm transition-colors flex justify-center items-center gap-2"
          >
            {isStarting ? 'Starting Session...' : 'Start Mock Interview'}
          </button>
          {error && <p className="text-red-500 text-center mt-4">{error}</p>}
        </section>
      </div>
    </div>
  );
}
