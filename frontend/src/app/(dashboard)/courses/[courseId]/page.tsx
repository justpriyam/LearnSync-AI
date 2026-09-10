"use client";

import React, { useEffect, useState, use } from "react";
import { getCourse } from "@/lib/api";
import { CourseResponse } from "@/lib/types";
import ModuleList from "@/components/ModuleList";
import QuizView from "@/components/QuizView";
import CheatSheetDrawer from "@/components/CheatSheetDrawer";
import CourseSummary from "@/components/CourseSummary";

export default function CoursePage({
  params,
}: {
  params: Promise<{ courseId: string }>;
}) {
  const { courseId } = use(params);
  const [course, setCourse] = useState<CourseResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [selectedModuleId, setSelectedModuleId] = useState<string | null>(null);
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [isPolling, setIsPolling] = useState(true);
  const [currentModuleIndex, setCurrentModuleIndex] = useState(0);
  const [completedScores, setCompletedScores] = useState<Record<string, number>>({});

  useEffect(() => {
    let interval: NodeJS.Timeout;

    const fetchCourse = async () => {
      try {
        const data = await getCourse(courseId);
        setCourse(data);

        if (data.status === "ready" || data.status === "failed") {
          setIsPolling(false);
          clearInterval(interval);

          if (
            data.status === "ready" &&
            data.modules.length > 0 &&
            !selectedModuleId
          ) {
            setSelectedModuleId(
              data.modules.sort((a, b) => a.order_index - b.order_index)[0].id
            );
          }
        }
      } catch (err: unknown) {
        const message =
          err instanceof Error ? err.message : "Failed to load course";
        setError(message);
        setIsPolling(false);
        clearInterval(interval);
      }
    };

    fetchCourse();

    if (isPolling) {
      interval = setInterval(fetchCourse, 3000);
    }

    return () => clearInterval(interval);
  }, [courseId, isPolling, selectedModuleId]);

  if (error) {
    return (
      <div className="text-red-500 p-8 border border-red-200 rounded-lg bg-red-50">
        {error}
      </div>
    );
  }

  if (!course) {
    return (
      <div className="p-8 text-center text-gray-500 animate-pulse">
        Loading course data...
      </div>
    );
  }

  if (course.status !== "ready") {
    return (
      <div className="flex flex-col items-center justify-center min-h-[50vh] space-y-6">
        <div className="w-16 h-16 border-4 border-blue-200 border-t-blue-600 rounded-full animate-spin"></div>
        <h2 className="text-2xl font-bold">Generating Course</h2>
        <p className="text-gray-500 max-w-md text-center">
          LearnSync AI is analyzing your document and generating modules,
          quizzes, and cheat sheets. This might take a minute or two.
        </p>
        <p className="text-sm font-mono bg-gray-100 dark:bg-gray-800 px-3 py-1 rounded">
          Status: {course.status}
        </p>
        {course.error_message && (
          <p className="text-red-500 text-sm">{course.error_message}</p>
        )}
      </div>
    );
  }

  const sortedModules = [...course.modules].sort(
    (a, b) => a.order_index - b.order_index
  );
  const selectedModule =
    sortedModules[currentModuleIndex];
  const allModulesCompleted = sortedModules.length > 0 && sortedModules.every((module) => completedScores[module.id] !== undefined);

  const selectModule = (moduleId: string) => {
    const index = sortedModules.findIndex((module) => module.id === moduleId);
    if (index >= 0) {
      setCurrentModuleIndex(index);
      setSelectedModuleId(moduleId);
    }
  };

  const resetCourse = () => {
    setCompletedScores({});
    setCurrentModuleIndex(0);
    setSelectedModuleId(sortedModules[0]?.id || null);
  };

  if (allModulesCompleted) {
    return <CourseSummary scores={sortedModules.map((module) => completedScores[module.id])} questionCount={5} onRetake={resetCourse} />;
  }

  return (
    <div className="flex flex-col md:flex-row gap-8 min-h-[calc(100vh-6rem)]">
      {/* Sidebar */}
      <div className="w-full md:w-80 shrink-0">
        <div className="sticky top-24">
          <h2
            className="text-xl font-bold mb-4 line-clamp-2"
            title={course.title}
          >
            {course.title}
          </h2>
          <ModuleList
            modules={sortedModules}
            selectedModuleId={selectedModule?.id || null}
            onSelectModule={selectModule}
          />
        </div>
      </div>

      {/* Main Content Area */}
      {selectedModule ? (
        <div className="flex-1 min-w-0 pb-16">
          <div className="flex items-start justify-between gap-4 mb-6">
            <div>
              <div className="text-sm font-semibold text-blue-600 dark:text-blue-400 mb-1">
                MODULE {selectedModule.order_index + 1}
              </div>
              <h1 className="text-3xl font-bold leading-tight">
                {selectedModule.title}
              </h1>
            </div>

            <button
              onClick={() => setIsDrawerOpen(true)}
              className="shrink-0 flex items-center gap-2 px-4 py-2 bg-gray-900 text-white dark:bg-gray-100 dark:text-gray-900 rounded-md font-medium hover:bg-gray-800 dark:hover:bg-gray-200 transition-colors"
            >
              <svg
                className="w-5 h-5"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                />
              </svg>
              Cheat Sheet
            </button>
          </div>

          <div className="prose dark:prose-invert max-w-none mb-10">
            <p className="text-lg leading-relaxed text-gray-700 dark:text-gray-300">
              {selectedModule.summary}
            </p>
          </div>

          <div className="border-t border-gray-200 dark:border-gray-800 pt-10">
            <h3 className="text-2xl font-bold mb-6">Knowledge Check</h3>
            <QuizView
              key={selectedModule.id}
              questions={selectedModule.quiz_questions}
              resetKey={selectedModule.id}
              onComplete={(score) => setCompletedScores((previous) => ({ ...previous, [selectedModule.id]: score }))}
            />
            <div className="mt-8 flex items-center justify-between border-t border-gray-200 pt-6 dark:border-gray-800">
              <button
                onClick={() => selectModule(sortedModules[currentModuleIndex - 1]?.id)}
                disabled={currentModuleIndex === 0}
                className="rounded-lg border border-gray-300 px-5 py-2 font-medium disabled:cursor-not-allowed disabled:opacity-40 dark:border-gray-700"
              >
                Previous
              </button>
              <span className="text-sm text-gray-500">Module {currentModuleIndex + 1} of {sortedModules.length}</span>
              <button
                onClick={() => selectModule(sortedModules[currentModuleIndex + 1]?.id)}
                disabled={currentModuleIndex >= sortedModules.length - 1 || completedScores[selectedModule.id] === undefined}
                className="rounded-lg bg-blue-600 px-5 py-2 font-medium text-white disabled:cursor-not-allowed disabled:opacity-40"
              >
                Next
              </button>
            </div>
          </div>

          <CheatSheetDrawer
            isOpen={isDrawerOpen}
            onClose={() => setIsDrawerOpen(false)}
            bullets={selectedModule.cheatsheet_bullets}
          />
        </div>
      ) : (
        <div className="flex-1 flex items-center justify-center text-gray-500">
          No modules found for this course.
        </div>
      )}
    </div>
  );
}
