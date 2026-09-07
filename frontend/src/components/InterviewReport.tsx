'use client';

import React, { useState } from 'react';
import { InterviewReportResponse } from '@/lib/types';

export default function InterviewReport({ report }: { report: InterviewReportResponse }) {
  const [expandedTurn, setExpandedTurn] = useState<number | null>(null);

  const getRating = (score: number) => {
    if (score >= 8.5) return { label: 'Excellent', color: 'text-green-600', bg: 'bg-green-100' };
    if (score >= 7) return { label: 'Good', color: 'text-blue-600', bg: 'bg-blue-100' };
    if (score >= 5) return { label: 'Average', color: 'text-yellow-600', bg: 'bg-yellow-100' };
    return { label: 'Needs Improvement', color: 'text-red-600', bg: 'bg-red-100' };
  };

  const rating = getRating(report.average_score);

  return (
    <div className="space-y-8">
      {/* Summary Header */}
      <div className="bg-white dark:bg-gray-900 p-6 rounded-xl border dark:border-gray-800 shadow-sm flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
        <div>
          <h1 className="text-2xl font-bold mb-2">Mock Interview Report</h1>
          <p className="text-gray-500">Session ID: <span className="font-mono text-sm">{report.session_id}</span></p>
        </div>
        <div className="flex gap-4">
          <div className="text-center p-4 bg-gray-50 dark:bg-gray-800 rounded-lg">
            <div className="text-sm text-gray-500 uppercase tracking-wider font-semibold mb-1">Total Turns</div>
            <div className="text-2xl font-bold">{report.total_turns}</div>
          </div>
          <div className="text-center p-4 bg-gray-50 dark:bg-gray-800 rounded-lg">
            <div className="text-sm text-gray-500 uppercase tracking-wider font-semibold mb-1">Avg Score</div>
            <div className="text-2xl font-bold">{report.average_score.toFixed(1)}<span className="text-gray-400 text-lg">/10</span></div>
          </div>
          <div className={`text-center p-4 rounded-lg ${rating.bg} dark:bg-opacity-20`}>
            <div className="text-sm text-gray-500 uppercase tracking-wider font-semibold mb-1">Rating</div>
            <div className={`text-2xl font-bold ${rating.color}`}>{rating.label}</div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        {/* Strengths */}
        <div className="bg-white dark:bg-gray-900 p-6 rounded-xl border dark:border-gray-800 shadow-sm">
          <h2 className="text-xl font-bold text-green-700 dark:text-green-400 mb-4 flex items-center gap-2">
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
            Key Strengths
          </h2>
          <ul className="space-y-3">
            {report.strengths.map((s, i) => (
              <li key={i} className="flex items-start gap-3">
                <span className="text-green-500 mt-1">•</span>
                <span className="text-gray-700 dark:text-gray-300">{s}</span>
              </li>
            ))}
          </ul>
        </div>

        {/* Weaknesses */}
        <div className="bg-white dark:bg-gray-900 p-6 rounded-xl border dark:border-gray-800 shadow-sm">
          <h2 className="text-xl font-bold text-red-700 dark:text-red-400 mb-4 flex items-center gap-2">
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" /></svg>
            Areas for Improvement
          </h2>
          <ul className="space-y-3">
            {report.weaknesses.map((w, i) => (
              <li key={i} className="flex items-start gap-3">
                <span className="text-red-500 mt-1">•</span>
                <span className="text-gray-700 dark:text-gray-300">{w}</span>
              </li>
            ))}
          </ul>
        </div>
      </div>

      {/* Difficulty Progression */}
      <div className="bg-white dark:bg-gray-900 p-6 rounded-xl border dark:border-gray-800 shadow-sm">
        <h2 className="text-xl font-bold mb-4">Difficulty Progression</h2>
        <div className="flex flex-wrap items-center gap-2">
          {report.difficulty_progression.map((level, i) => {
            const color = level === 'Beginner' ? 'bg-green-100 text-green-800' : 
                          level === 'Intermediate' ? 'bg-yellow-100 text-yellow-800' : 
                          'bg-red-100 text-red-800';
            return (
              <React.Fragment key={i}>
                <div className={`px-3 py-1 rounded-full text-sm font-semibold ${color}`}>
                  Q{i+1}: {level}
                </div>
                {i < report.difficulty_progression.length - 1 && (
                  <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" /></svg>
                )}
              </React.Fragment>
            );
          })}
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        {/* Topic Coverage */}
        <div className="bg-white dark:bg-gray-900 p-6 rounded-xl border dark:border-gray-800 shadow-sm">
          <h2 className="text-xl font-bold mb-4">Topic Mastery</h2>
          <div className="overflow-hidden rounded-lg border dark:border-gray-700">
            <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
              <thead className="bg-gray-50 dark:bg-gray-800">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Topic</th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Score</th>
                </tr>
              </thead>
              <tbody className="bg-white dark:bg-gray-900 divide-y divide-gray-200 dark:divide-gray-700">
                {report.topic_coverage.map((tc, i) => (
                  <tr key={i}>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">{tc.topic}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-right font-bold">
                      <span className={tc.score >= 8 ? 'text-green-600' : tc.score >= 5 ? 'text-yellow-600' : 'text-red-600'}>
                        {tc.score}/10
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Suggestions */}
        <div className="bg-white dark:bg-gray-900 p-6 rounded-xl border dark:border-gray-800 shadow-sm">
          <h2 className="text-xl font-bold mb-4 flex items-center gap-2 text-blue-700 dark:text-blue-400">
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" /></svg>
            Actionable Suggestions
          </h2>
          <ul className="space-y-4">
            {report.suggestions.map((s, i) => (
              <li key={i} className="flex gap-3">
                <span className="flex-shrink-0 w-6 h-6 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center text-sm font-bold mt-0.5">{i+1}</span>
                <span className="text-gray-700 dark:text-gray-300">{s}</span>
              </li>
            ))}
          </ul>
        </div>
      </div>

      {/* Turn-by-turn Details */}
      <div className="bg-white dark:bg-gray-900 p-6 rounded-xl border dark:border-gray-800 shadow-sm">
        <h2 className="text-xl font-bold mb-6">Turn-by-Turn Analysis</h2>
        <div className="space-y-4">
          {report.turns.map((turn) => (
            <div key={turn.turn_number} className="border dark:border-gray-700 rounded-lg overflow-hidden">
              <button 
                onClick={() => setExpandedTurn(expandedTurn === turn.turn_number ? null : turn.turn_number)}
                className="w-full px-6 py-4 bg-gray-50 dark:bg-gray-800/50 flex justify-between items-center hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
              >
                <div className="flex items-center gap-4">
                  <span className="font-bold text-gray-500 w-8">Q{turn.turn_number}</span>
                  <span className="font-medium text-left line-clamp-1">{turn.question}</span>
                </div>
                <div className="flex items-center gap-4 flex-shrink-0">
                  <span className={`font-bold px-2 py-1 rounded text-sm ${turn.score >= 8 ? 'bg-green-100 text-green-700' : turn.score >= 5 ? 'bg-yellow-100 text-yellow-700' : 'bg-red-100 text-red-700'}`}>
                    {turn.score}/10
                  </span>
                  <svg className={`w-5 h-5 text-gray-500 transform transition-transform ${expandedTurn === turn.turn_number ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" /></svg>
                </div>
              </button>
              
              {expandedTurn === turn.turn_number && (
                <div className="p-6 space-y-4 bg-white dark:bg-gray-900">
                  <div>
                    <h4 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-2">Question</h4>
                    <p className="font-medium text-lg">{turn.question}</p>
                  </div>
                  <div>
                    <h4 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-2">Your Answer</h4>
                    <div className="p-4 bg-gray-50 dark:bg-gray-800 rounded-lg text-gray-700 dark:text-gray-300">
                      {turn.answer || <span className="italic text-gray-400">No answer provided.</span>}
                    </div>
                  </div>
                  <div>
                    <h4 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-2">Feedback</h4>
                    <p className="text-gray-700 dark:text-gray-300">{turn.feedback}</p>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
