'use client';

import React, { useState } from 'react';
import { QuizQuestion } from '@/lib/types';

interface QuizViewProps {
  questions: QuizQuestion[];
}

export default function QuizView({ questions }: QuizViewProps) {
  const [answers, setAnswers] = useState<Record<string, string>>({});

  const handleSelect = (questionId: string, option: string) => {
    if (answers[questionId]) return; // prevent changing answer
    setAnswers(prev => ({ ...prev, [questionId]: option }));
  };

  const correctCount = questions.filter(q => answers[q.id] === q.correct_answer).length;
  const answeredCount = Object.keys(answers).length;

  if (!questions || questions.length === 0) {
    return (
      <div className="p-8 text-center text-gray-500 italic bg-gray-50 dark:bg-gray-800/50 rounded-xl">
        No quiz questions generated for this module yet.
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {questions.map((q, idx) => {
        const selected = answers[q.id];
        const isAnswered = !!selected;
        
        return (
          <div key={q.id} className="border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 p-6 rounded-xl shadow-xs">
            <h4 className="font-semibold text-base sm:text-lg mb-4 text-gray-900 dark:text-gray-100">
              <span className="text-blue-600 dark:text-blue-400 mr-2">{idx + 1}.</span>
              {q.question}
            </h4>
            
            <div className="space-y-2.5">
              {q.options.map((opt, i) => {
                let btnClass = "w-full text-left p-3.5 border rounded-lg transition-all text-sm ";
                
                if (!isAnswered) {
                  btnClass += "border-gray-200 dark:border-gray-700 hover:border-blue-400 hover:bg-blue-50/50 dark:hover:bg-blue-900/20";
                } else {
                  if (opt === q.correct_answer) {
                    btnClass += "border-emerald-500 bg-emerald-50 text-emerald-950 dark:bg-emerald-950/40 dark:text-emerald-200 font-medium";
                  } else if (opt === selected) {
                    btnClass += "border-rose-500 bg-rose-50 text-rose-950 dark:bg-rose-950/40 dark:text-rose-200 font-medium";
                  } else {
                    btnClass += "border-gray-200 dark:border-gray-800 opacity-40";
                  }
                }
                
                return (
                  <button
                    key={i}
                    onClick={() => handleSelect(q.id, opt)}
                    disabled={isAnswered}
                    className={btnClass}
                  >
                    <span className="font-semibold text-gray-400 mr-2">{String.fromCharCode(65 + i)}.</span>
                    {opt}
                  </button>
                );
              })}
            </div>
            
            {isAnswered && (
              <div className="mt-4 p-4 bg-gray-50 dark:bg-gray-800/60 border border-gray-200 dark:border-gray-700 rounded-lg">
                <p className="font-semibold text-sm mb-1 text-gray-900 dark:text-gray-100">Explanation</p>
                <p className="text-sm text-gray-700 dark:text-gray-300 leading-relaxed">{q.explanation}</p>
                {q.source_chunk_id && (
                  <div className="mt-3 inline-block px-2 py-0.5 bg-gray-200 dark:bg-gray-700 text-[11px] text-gray-600 dark:text-gray-400 rounded font-mono">
                    Citation: {q.source_chunk_id}
                  </div>
                )}
              </div>
            )}
          </div>
        );
      })}
      
      {questions.length > 0 && (
        <div className="p-5 bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-950/40 dark:to-indigo-950/40 border border-blue-200 dark:border-blue-800 rounded-xl text-center">
          <div className="font-bold text-lg text-gray-900 dark:text-gray-100">
            Quiz Progress: {correctCount} / {questions.length} Correct
          </div>
          <div className="text-xs text-gray-600 dark:text-gray-400 mt-1">
            {answeredCount < questions.length 
              ? `${questions.length - answeredCount} questions remaining to complete` 
              : "Great job! You have answered all questions in this module."}
          </div>
        </div>
      )}
    </div>
  );
}
