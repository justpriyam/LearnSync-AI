'use client';

import React, { useEffect, useRef, useState } from 'react';
import { QuizQuestion } from '../lib/types';

interface QuizViewProps {
  questions: QuizQuestion[];
  onComplete?: (score: number, total: number) => void;
  resetKey?: string;
}

interface ScoreSummaryProps {
  score: number;
  total: number;
  onRetake: () => void;
}

function ScoreSummary({ score, total, onRetake }: ScoreSummaryProps) {
  const percentage = total > 0 ? Math.round((score / total) * 100) : 0;
  const rank = percentage === 100
    ? '🏆 Outstanding!'
    : percentage > 80
      ? '🔥 Excellent!'
      : percentage > 60
        ? '👍 Good Work!'
        : 'Keep Practicing!';

  return (
    <div className={`relative overflow-hidden rounded-2xl border border-gray-200 bg-white p-8 text-center shadow-sm dark:border-gray-700 dark:bg-gray-900 ${percentage > 80 ? 'animate-pulse' : ''}`}>
      {percentage > 80 && (
        <div aria-hidden="true" className="pointer-events-none absolute inset-0 text-2xl opacity-30">
          <span className="absolute left-8 top-8 animate-bounce">✦</span>
          <span className="absolute right-12 top-16 animate-bounce">✧</span>
          <span className="absolute bottom-12 left-1/4 animate-bounce">✦</span>
          <span className="absolute bottom-8 right-1/4 animate-bounce">✧</span>
        </div>
      )}
      <p className="text-sm font-semibold uppercase tracking-wide text-blue-600">Quiz complete</p>
      <h2 className={`mt-4 text-4xl font-black ${percentage > 80 ? 'animate-bounce' : ''}`}>{rank}</h2>
      <p className="mt-5 text-5xl font-bold text-blue-600">{percentage}%</p>
      <p className="mt-2 text-gray-600 dark:text-gray-300">You scored {score} out of {total}.</p>
      <button type="button" onClick={onRetake} className="mt-8 rounded-lg bg-gray-900 px-6 py-3 font-semibold text-white transition hover:bg-gray-700 dark:bg-gray-100 dark:text-gray-900">
        Retake Test
      </button>
    </div>
  );
}

export default function QuizView({ questions, onComplete, resetKey }: QuizViewProps) {
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [score, setScore] = useState(0);
  const [selectedAnswers, setSelectedAnswers] = useState<Record<string, string>>({});
  const [scoredQuestions, setScoredQuestions] = useState<Record<string, boolean>>({});
  const [validationMessage, setValidationMessage] = useState<string | null>(null);
  const completionReported = useRef(false);

  const currentQuestion = questions[currentQuestionIndex];
  const selectedAnswer = currentQuestion ? selectedAnswers[currentQuestion.id] : undefined;
  const isComplete = currentQuestionIndex === questions.length;

  useEffect(() => {
    setCurrentQuestionIndex(0);
    setScore(0);
    setSelectedAnswers({});
    setScoredQuestions({});
    setValidationMessage(null);
    completionReported.current = false;
  }, [resetKey]);

  useEffect(() => {
    if (isComplete && questions.length > 0 && !completionReported.current) {
      completionReported.current = true;
      onComplete?.(score, questions.length);
    }
  }, [isComplete, onComplete, questions.length, score]);

  const handleAnswerSelect = (option: string) => {
    if (!currentQuestion || scoredQuestions[currentQuestion.id]) return;
    setSelectedAnswers((previous) => ({ ...previous, [currentQuestion.id]: option }));
    setValidationMessage(null);
  };

  const handleNext = () => {
    if (!currentQuestion) return;
    if (!selectedAnswer) {
      setValidationMessage('Choose an answer before continuing.');
      return;
    }

    if (!scoredQuestions[currentQuestion.id]) {
      if (selectedAnswer === currentQuestion.correct_answer) setScore((previous) => previous + 1);
      setScoredQuestions((previous) => ({ ...previous, [currentQuestion.id]: true }));
    }

    setValidationMessage(null);
    setCurrentQuestionIndex((previous) => previous + 1);
  };

  const handlePrevious = () => {
    setValidationMessage(null);
    setCurrentQuestionIndex((previous) => Math.max(0, previous - 1));
  };

  const handleRetake = () => {
    setCurrentQuestionIndex(0);
    setScore(0);
    setSelectedAnswers({});
    setScoredQuestions({});
    setValidationMessage(null);
  };

  if (isComplete) return <ScoreSummary score={score} total={questions.length} onRetake={handleRetake} />;
  if (!currentQuestion) return <p className="rounded-lg bg-gray-100 p-6 text-gray-600">No questions are available for this module.</p>;

  return (
    <div className="pb-28">
      <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm dark:border-gray-700 dark:bg-gray-900">
        <div className="mb-6 flex items-center justify-between gap-4">
          <span className="text-sm font-semibold uppercase tracking-wide text-blue-600">Question {currentQuestionIndex + 1} of {questions.length}</span>
          <span className="rounded-full bg-gray-100 px-3 py-1 text-sm font-semibold dark:bg-gray-800">Score: {score}</span>
        </div>
        <h4 className="text-xl font-semibold leading-relaxed">{currentQuestion.question}</h4>
        <div className="mt-6 space-y-3">
          {currentQuestion.options.map((option) => {
            const isSelected = selectedAnswer === option;
            const isCorrect = scoredQuestions[currentQuestion.id] && option === currentQuestion.correct_answer;
            const isWrong = scoredQuestions[currentQuestion.id] && isSelected && option !== currentQuestion.correct_answer;
            return (
              <button key={option} type="button" onClick={() => handleAnswerSelect(option)} className={`w-full rounded-lg border p-4 text-left transition ${isCorrect ? 'border-green-500 bg-green-50 dark:bg-green-900/20' : isWrong ? 'border-red-500 bg-red-50 dark:bg-red-900/20' : isSelected ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20' : 'border-gray-300 hover:border-blue-400 hover:bg-gray-50 dark:border-gray-600 dark:hover:bg-gray-800'}`}>
                {option}
              </button>
            );
          })}
        </div>
        {scoredQuestions[currentQuestion.id] && (
          <div className="mt-6 rounded-lg bg-blue-50 p-4 dark:bg-blue-900/20">
            <p className="font-semibold">Explanation</p>
            <p className="mt-1 text-gray-700 dark:text-gray-300">{currentQuestion.explanation}</p>
          </div>
        )}
        {validationMessage && <p className="mt-4 text-sm font-medium text-red-600">{validationMessage}</p>}
      </div>

      <footer className="fixed bottom-0 left-0 right-0 z-20 border-t border-gray-200 bg-white/95 px-6 py-4 shadow-lg backdrop-blur dark:border-gray-700 dark:bg-gray-950/95">
        <div className="mx-auto flex max-w-4xl items-center justify-between gap-4">
          <button type="button" onClick={handlePrevious} disabled={currentQuestionIndex === 0} className="rounded-lg border border-gray-300 px-5 py-2 font-semibold disabled:cursor-not-allowed disabled:opacity-40 dark:border-gray-700">Previous</button>
          <button type="button" onClick={handleNext} className="rounded-lg bg-blue-600 px-6 py-2 font-semibold text-white hover:bg-blue-700">{currentQuestionIndex === questions.length - 1 ? 'Finish' : 'Next'}</button>
        </div>
      </footer>
    </div>
  );
}
