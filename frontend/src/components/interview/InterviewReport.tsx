'use client';

import React, { useState } from 'react';
import { InterviewReportResponse } from '@/lib/types';

interface Props {
  report: InterviewReportResponse;
}

export default function InterviewReport({ report }: Props) {
  const [expandedTurn, setExpandedTurn] = useState<number | null>(null);

  const getScoreColor = (score: number) => {
    if (score >= 4) return 'text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/50 border-emerald-200 dark:border-emerald-800';
    if (score >= 2.5) return 'text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/50 border-amber-200 dark:border-amber-800';
    return 'text-rose-600 dark:text-rose-400 bg-rose-50 dark:bg-rose-950/50 border-rose-200 dark:border-rose-800';
  };

  const getRatingBadge = (score: number) => {
    if (score >= 4.5) return { label: 'Excellent', color: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/60 dark:text-emerald-300' };
    if (score >= 3.5) return { label: 'Good', color: 'bg-blue-100 text-blue-800 dark:bg-blue-900/60 dark:text-blue-300' };
    if (score >= 2.5) return { label: 'Average', color: 'bg-amber-100 text-amber-800 dark:bg-amber-900/60 dark:text-amber-300' };
    return { label: 'Needs Improvement', color: 'bg-rose-100 text-rose-800 dark:bg-rose-900/60 dark:text-rose-300' };
  };

  const rating = getRatingBadge(report.average_score);

  return (
    <div className="space-y-8">
      {/* Overview Card */}
      <div className="bg-gradient-to-br from-blue-50 to-indigo-50 dark:from-blue-950/40 dark:to-indigo-950/40 p-6 rounded-2xl border border-blue-200 dark:border-blue-800/80 shadow-xs">
        <h2 className="text-2xl font-bold text-gray-900 dark:text-gray-100 mb-4">Interview Evaluation Report</h2>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="p-4 bg-white/80 dark:bg-gray-900/60 rounded-xl border border-blue-100 dark:border-blue-900/50">
            <span className="text-xs text-gray-500 block uppercase font-medium">Total Questions</span>
            <span className="text-2xl font-bold text-gray-900 dark:text-gray-100">{report.total_turns}</span>
          </div>
          <div className="p-4 bg-white/80 dark:bg-gray-900/60 rounded-xl border border-blue-100 dark:border-blue-900/50">
            <span className="text-xs text-gray-500 block uppercase font-medium">Average Score</span>
            <span className="text-2xl font-bold text-blue-600 dark:text-blue-400">{report.average_score} <span className="text-sm font-normal text-gray-500">/ 5.0</span></span>
          </div>
          <div className="p-4 bg-white/80 dark:bg-gray-900/60 rounded-xl border border-blue-100 dark:border-blue-900/50">
            <span className="text-xs text-gray-500 block uppercase font-medium">Overall Rating</span>
            <span className={`inline-block mt-1 px-3 py-1 rounded-full text-xs font-bold ${rating.color}`}>
              {rating.label}
            </span>
          </div>
        </div>
      </div>

      {/* Strengths & Areas for Improvement */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Strengths */}
        <div className="bg-white dark:bg-gray-900 p-6 rounded-2xl border border-gray-200 dark:border-gray-800 shadow-xs">
          <h3 className="text-lg font-bold text-emerald-600 dark:text-emerald-400 mb-4 flex items-center gap-2">
            <span>✅</span> Key Strengths
          </h3>
          <ul className="space-y-2.5">
            {report.strengths && report.strengths.length > 0 ? (
              report.strengths.map((str, idx) => (
                <li key={idx} className="flex gap-2.5 items-start text-sm text-gray-700 dark:text-gray-300">
                  <span className="text-emerald-500 font-bold">•</span>
                  <span>{str}</span>
                </li>
              ))
            ) : (
              <p className="text-sm text-gray-400 italic">No specific strengths recorded.</p>
            )}
          </ul>
        </div>

        {/* Areas for Improvement */}
        <div className="bg-white dark:bg-gray-900 p-6 rounded-2xl border border-gray-200 dark:border-gray-800 shadow-xs">
          <h3 className="text-lg font-bold text-rose-600 dark:text-rose-400 mb-4 flex items-center gap-2">
            <span>⚠️</span> Areas for Improvement
          </h3>
          <ul className="space-y-2.5">
            {report.weaknesses && report.weaknesses.length > 0 ? (
              report.weaknesses.map((weak, idx) => (
                <li key={idx} className="flex gap-2.5 items-start text-sm text-gray-700 dark:text-gray-300">
                  <span className="text-rose-500 font-bold">•</span>
                  <span>{weak}</span>
                </li>
              ))
            ) : (
              <p className="text-sm text-gray-400 italic">No specific weaknesses recorded.</p>
            )}
          </ul>
        </div>
      </div>

      {/* Actionable Suggestions */}
      {report.suggestions && report.suggestions.length > 0 && (
        <div className="bg-white dark:bg-gray-900 p-6 rounded-2xl border border-gray-200 dark:border-gray-800 shadow-xs">
          <h3 className="text-lg font-bold text-gray-900 dark:text-gray-100 mb-4 flex items-center gap-2">
            <span>💡</span> Actionable Recommendations
          </h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {report.suggestions.map((sug, idx) => (
              <div key={idx} className="p-3.5 bg-gray-50 dark:bg-gray-800/50 rounded-xl border border-gray-100 dark:border-gray-800 text-sm text-gray-700 dark:text-gray-300 leading-relaxed">
                <span className="font-bold text-blue-600 dark:text-blue-400 mr-2">#{idx + 1}</span>
                {sug}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Turn by Turn Breakdown */}
      <div className="bg-white dark:bg-gray-900 p-6 rounded-2xl border border-gray-200 dark:border-gray-800 shadow-xs">
        <h3 className="text-lg font-bold text-gray-900 dark:text-gray-100 mb-4">Detailed Turn-by-Turn Feedback</h3>
        <div className="space-y-3">
          {report.turns && report.turns.map((turn, idx) => {
            const isExpanded = expandedTurn === idx;
            return (
              <div key={idx} className="border border-gray-200 dark:border-gray-800 rounded-xl overflow-hidden">
                <button
                  onClick={() => setExpandedTurn(isExpanded ? null : idx)}
                  className="w-full p-4 text-left bg-gray-50/70 dark:bg-gray-800/40 hover:bg-gray-100 dark:hover:bg-gray-800 flex justify-between items-center transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <span className="font-bold text-sm text-gray-500">Q{turn.turn_number}</span>
                    <span className="font-medium text-sm text-gray-900 dark:text-gray-100 line-clamp-1">{turn.question}</span>
                  </div>
                  <div className="flex items-center gap-3 shrink-0">
                    <span className={`px-2.5 py-0.5 rounded-md text-xs font-bold border ${getScoreColor(turn.score)}`}>
                      {turn.score} / 5
                    </span>
                    <svg className={`w-4 h-4 text-gray-400 transform transition-transform ${isExpanded ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                    </svg>
                  </div>
                </button>
                
                {isExpanded && (
                  <div className="p-4 space-y-3 bg-white dark:bg-gray-900 border-t border-gray-200 dark:border-gray-800 text-sm">
                    <div>
                      <span className="text-xs font-bold text-gray-400 uppercase block mb-1">Your Response</span>
                      <p className="text-gray-700 dark:text-gray-300 italic bg-gray-50 dark:bg-gray-800/50 p-3 rounded-lg border border-gray-100 dark:border-gray-800">
                        {turn.answer || <span className="text-gray-400">No answer provided.</span>}
                      </p>
                    </div>
                    <div>
                      <span className="text-xs font-bold text-gray-400 uppercase block mb-1">Mentor Feedback</span>
                      <p className="text-gray-700 dark:text-gray-300 leading-relaxed">
                        {turn.feedback}
                      </p>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
