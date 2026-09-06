'use client';

import React, { useState } from 'react';
import { QuizQuestion } from '../lib/types';

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

  return (
    <div className="space-y-8">
      {questions.map((q, idx) => {
        const selected = answers[q.id];
        const isAnswered = !!selected;
        
        return (
          <div key={q.id} className="border border-gray-200 dark:border-gray-700 p-6 rounded-lg shadow-sm">
            <h4 className="font-semibold text-lg mb-4">
              {idx + 1}. {q.question}
            </h4>
            
            <div className="space-y-3">
              {q.options.map((opt, i) => {
                let btnClass = "w-full text-left p-3 border rounded-md transition-colors ";
                
                if (!isAnswered) {
                  btnClass += "border-gray-300 hover:bg-gray-50 dark:border-gray-600 dark:hover:bg-gray-800";
                } else {
                  if (opt === q.correct_answer) {
                    btnClass += "border-green-500 bg-green-50 text-green-900 dark:bg-green-900/30 dark:text-green-100";
                  } else if (opt === selected) {
                    btnClass += "border-red-500 bg-red-50 text-red-900 dark:bg-red-900/30 dark:text-red-100";
                  } else {
                    btnClass += "border-gray-200 opacity-50";
                  }
                }
                
                return (
                  <button
                    key={i}
                    onClick={() => handleSelect(q.id, opt)}
                    disabled={isAnswered}
                    className={btnClass}
                  >
                    {opt}
                  </button>
                );
              })}
            </div>
            
            {isAnswered && (
              <div className="mt-4 p-4 bg-blue-50 dark:bg-blue-900/20 rounded-md">
                <p className="font-medium mb-1">Explanation:</p>
                <p className="text-gray-700 dark:text-gray-300">{q.explanation}</p>
                <div className="mt-3 inline-block px-2 py-1 bg-gray-200 dark:bg-gray-700 text-xs text-gray-600 dark:text-gray-300 rounded font-mono">
                  Source: {q.source_chunk_id}
                </div>
              </div>
            )}
          </div>
        );
      })}
      
      {questions.length > 0 && (
        <div className="p-4 bg-gray-100 dark:bg-gray-800 rounded-lg text-center font-semibold text-lg">
          Score: {correctCount} / {questions.length} 
          {answeredCount < questions.length && ` (${questions.length - answeredCount} remaining)`}
        </div>
      )}
    </div>
  );
}
