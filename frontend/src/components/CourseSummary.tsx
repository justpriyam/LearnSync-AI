'use client';

interface CourseSummaryProps {
  scores: number[];
  questionCount: number;
  onRetake: () => void;
}

export default function CourseSummary({ scores, questionCount, onRetake }: CourseSummaryProps) {
  const totalQuestions = scores.length * questionCount;
  const correctAnswers = scores.reduce((total, score) => total + score, 0);
  const overallMarks = totalQuestions ? Math.round((correctAnswers / totalQuestions) * 100) : 0;
  const overallExperience = overallMarks >= 80 ? 'Excellent' : overallMarks >= 60 ? 'Strong' : overallMarks >= 40 ? 'Developing' : 'Needs practice';

  return (
    <div className="mx-auto max-w-2xl rounded-2xl border border-gray-200 bg-white p-8 text-center shadow-sm dark:border-gray-800 dark:bg-gray-900">
      <p className="text-sm font-semibold uppercase tracking-wide text-blue-600">Course complete</p>
      <h1 className="mt-2 text-3xl font-bold">Your learning summary</h1>
      <div className="mt-8 grid gap-4 sm:grid-cols-2">
        <div className="rounded-xl bg-blue-50 p-5 dark:bg-blue-900/20">
          <p className="text-sm text-gray-600 dark:text-gray-300">Overall Marks</p>
          <p className="mt-2 text-4xl font-bold text-blue-700 dark:text-blue-300">{overallMarks}%</p>
          <p className="mt-1 text-sm">{correctAnswers} / {totalQuestions} correct</p>
        </div>
        <div className="rounded-xl bg-green-50 p-5 dark:bg-green-900/20">
          <p className="text-sm text-gray-600 dark:text-gray-300">Overall Experience</p>
          <p className="mt-2 text-3xl font-bold text-green-700 dark:text-green-300">{overallExperience}</p>
          <p className="mt-1 text-sm">Across {scores.length} modules</p>
        </div>
      </div>
      <button onClick={onRetake} className="mt-8 rounded-lg bg-gray-900 px-6 py-3 font-semibold text-white hover:bg-gray-700 dark:bg-gray-100 dark:text-gray-900 dark:hover:bg-white">
        Retake Test
      </button>
    </div>
  );
}