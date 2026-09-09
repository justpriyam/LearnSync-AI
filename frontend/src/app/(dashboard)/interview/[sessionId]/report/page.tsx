'use client';

import React, { useEffect, useState, use } from 'react';
import { getInterviewReport } from '@/lib/api';
import { InterviewReportResponse } from '@/lib/types';
import InterviewReport from '@/components/InterviewReport';
import Link from 'next/link';

export default function InterviewReportPage({
  params,
}: {
  params: Promise<{ sessionId: string }>;
}) {
  const { sessionId } = use(params);
  const [report, setReport] = useState<InterviewReportResponse | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchReport = async () => {
      try {
        const data = await getInterviewReport(sessionId);
        setReport(data);
      } catch (err: any) {
        setError(err.message || 'Failed to load interview report');
      }
    };
    fetchReport();
  }, [sessionId]);

  if (error) {
    return (
      <div className="max-w-4xl mx-auto py-12 px-4">
        <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 p-6 rounded-xl text-center">
          <h2 className="text-xl font-bold text-red-700 dark:text-red-400 mb-2">Error Loading Report</h2>
          <p className="text-red-600 dark:text-red-300">{error}</p>
          <Link href="/interview" className="mt-6 inline-block px-4 py-2 bg-red-100 text-red-700 rounded-lg hover:bg-red-200 transition-colors">
            Return to Mock Mentor
          </Link>
        </div>
      </div>
    );
  }

  if (!report) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[50vh] space-y-4">
        <div className="w-12 h-12 border-4 border-blue-200 border-t-blue-600 rounded-full animate-spin"></div>
        <p className="text-gray-500 font-medium">Analyzing interview session...</p>
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto py-8 px-4">
      <div className="mb-6 flex justify-between items-center">
        <Link href="/interview" className="text-blue-600 hover:text-blue-700 font-medium flex items-center gap-2">
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" /></svg>
          Back to Setup
        </Link>
      </div>
      <InterviewReport report={report} />
    </div>
  );
}
