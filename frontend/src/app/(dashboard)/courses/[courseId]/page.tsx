"use client";

import React, { useEffect, useState, use, useRef } from "react";
import Link from "next/link";
import { getCourse, generateCourse } from "@/lib/api";
import { CourseResponse } from "@/lib/types";
import ModuleList from "@/components/ModuleList";
import QuizView from "@/components/QuizView";
import CheatSheetDrawer from "@/components/CheatSheetDrawer";

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
  const [isRetrying, setIsRetrying] = useState(false);
  const failCountRef = useRef(0);

  useEffect(() => {
    let interval: NodeJS.Timeout;

    const fetchCourse = async () => {
      try {
        const data = await getCourse(courseId);
        setCourse(data);
        failCountRef.current = 0; // reset on success

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
        failCountRef.current += 1;
        // Allow up to 4 consecutive transient network errors before stopping
        if (failCountRef.current > 4) {
          const message =
            err instanceof Error ? err.message : "Failed to load course details";
          setError(message);
          setIsPolling(false);
          clearInterval(interval);
        }
      }
    };

    fetchCourse();

    if (isPolling) {
      interval = setInterval(fetchCourse, 3000);
    }

    return () => clearInterval(interval);
  }, [courseId, isPolling, selectedModuleId]);

  const handleRetryGeneration = async () => {
    if (!course?.document_id) return;
    setIsRetrying(true);
    setError(null);
    try {
      const res = await generateCourse(course.document_id);
      window.location.href = `/courses/${res.id}`;
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Failed to regenerate course";
      setError(message);
      setIsRetrying(false);
    }
  };

  if (error) {
    return (
      <div className="max-w-2xl mx-auto py-12 px-4 text-center">
        <div className="p-8 border border-red-200 dark:border-red-900/60 rounded-2xl bg-red-50/80 dark:bg-red-950/30 space-y-4">
          <div className="w-12 h-12 rounded-full bg-red-100 text-red-600 flex items-center justify-center mx-auto text-xl font-bold">
            !
          </div>
          <h2 className="text-xl font-bold text-red-900 dark:text-red-200">Unable to Load Course</h2>
          <p className="text-sm text-red-700 dark:text-red-400">{error}</p>
          <div className="pt-2 flex justify-center gap-4">
            <button
              onClick={() => { setError(null); setIsPolling(true); failCountRef.current = 0; }}
              className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg text-sm font-medium transition-colors"
            >
              Retry Connection
            </button>
            <Link
              href="/courses"
              className="px-4 py-2 bg-gray-200 dark:bg-gray-800 text-gray-800 dark:text-gray-200 hover:bg-gray-300 rounded-lg text-sm font-medium transition-colors"
            >
              Back to Courses
            </Link>
          </div>
        </div>
      </div>
    );
  }

  if (!course) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[50vh] space-y-4">
        <div className="w-10 h-10 border-3 border-blue-200 border-t-blue-600 rounded-full animate-spin"></div>
        <p className="text-sm text-gray-500 animate-pulse">Loading course data...</p>
      </div>
    );
  }

  if (course.status === "failed") {
    return (
      <div className="max-w-xl mx-auto py-16 px-4 text-center">
        <div className="p-8 border border-rose-200 dark:border-rose-900/60 rounded-2xl bg-rose-50/70 dark:bg-rose-950/30 space-y-4">
          <div className="w-12 h-12 rounded-full bg-rose-100 text-rose-600 flex items-center justify-center mx-auto text-xl font-bold">
            ✕
          </div>
          <h2 className="text-xl font-bold text-gray-900 dark:text-gray-100">Course Generation Failed</h2>
          <p className="text-sm text-gray-600 dark:text-gray-400">
            {course.error_message || "The AI model encountered an issue parsing the document structure."}
          </p>
          <div className="pt-4 flex justify-center gap-3">
            <button
              onClick={handleRetryGeneration}
              disabled={isRetrying}
              className="px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium rounded-xl shadow-xs transition-colors"
            >
              {isRetrying ? "Starting Generation..." : "Retry Generation"}
            </button>
            <Link
              href="/courses"
              className="px-5 py-2.5 bg-gray-100 hover:bg-gray-200 dark:bg-gray-800 dark:hover:bg-gray-700 text-gray-800 dark:text-gray-200 text-sm font-medium rounded-xl transition-colors"
            >
              Back to Documents
            </Link>
          </div>
        </div>
      </div>
    );
  }

  if (course.status !== "ready") {
    return (
      <div className="flex flex-col items-center justify-center min-h-[55vh] space-y-6 px-4 text-center">
        <div className="relative">
          <div className="w-16 h-16 border-4 border-blue-200 dark:border-blue-900 border-t-blue-600 rounded-full animate-spin"></div>
          <div className="absolute inset-0 flex items-center justify-center text-xs font-bold text-blue-600">
            AI
          </div>
        </div>
        <div>
          <h2 className="text-2xl font-bold text-gray-900 dark:text-gray-100">Generating Your Course</h2>
          <p className="text-gray-500 dark:text-gray-400 text-sm max-w-md mx-auto mt-2 leading-relaxed">
            LearnSync AI is reading the document, creating structured learning modules, generating practice quizzes, and compiling key cheat sheets.
          </p>
        </div>
        <div className="flex items-center gap-2 px-3 py-1 bg-blue-50 dark:bg-blue-950/60 border border-blue-200 dark:border-blue-800 rounded-full text-xs font-semibold text-blue-700 dark:text-blue-300">
          <span className="w-2 h-2 rounded-full bg-blue-500 animate-ping"></span>
          Status: {course.status} • Polling live updates
        </div>
      </div>
    );
  }

  const sortedModules = [...course.modules].sort(
    (a, b) => a.order_index - b.order_index
  );
  const selectedModule =
    sortedModules.find((m) => m.id === selectedModuleId) || sortedModules[0];

  return (
    <div className="space-y-8">
      {/* Header with Course Title & Cheat Sheet Button */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-gray-200 dark:border-gray-800">
        <div>
          <div className="flex items-center gap-2 text-xs font-medium text-blue-600 dark:text-blue-400 mb-1">
            <Link href="/courses" className="hover:underline">Courses</Link>
            <span>/</span>
            <span>Course Engine</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 dark:text-gray-100">
            {course.title}
          </h1>
          <p className="text-xs text-gray-500 mt-1">
            {course.modules.length} Modules Generated • Ready for Study
          </p>
        </div>

        {selectedModule && (
          <button
            onClick={() => setIsDrawerOpen(true)}
            className="self-start sm:self-auto flex items-center gap-2 px-4 py-2.5 bg-amber-500 hover:bg-amber-600 text-white text-sm font-semibold rounded-xl shadow-xs transition-colors"
          >
            <span>📌</span>
            <span>View Cheat Sheet</span>
            <span className="text-xs bg-amber-700/60 px-1.5 py-0.5 rounded-full">
              {selectedModule.cheatsheet_bullets?.length || 0}
            </span>
          </button>
        )}
      </div>

      {/* Main Course Layout: Left Module Sidebar, Right Content */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Left Column: Module Navigation List */}
        <div className="lg:col-span-1">
          <h2 className="text-sm font-bold uppercase tracking-wider text-gray-500 mb-3">
            Course Modules
          </h2>
          <ModuleList
            modules={sortedModules}
            selectedModuleId={selectedModule?.id || null}
            onSelectModule={setSelectedModuleId}
          />
        </div>

        {/* Right Column: Selected Module Content & Quiz */}
        <div className="lg:col-span-2 space-y-8">
          {selectedModule ? (
            <>
              {/* Module Overview Card */}
              <div className="p-6 bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-800 shadow-xs space-y-3">
                <div className="flex items-center gap-2 text-xs font-bold text-blue-600 uppercase tracking-wider">
                  Module {selectedModule.order_index + 1}
                </div>
                <h2 className="text-xl sm:text-2xl font-bold text-gray-900 dark:text-gray-100">
                  {selectedModule.title}
                </h2>
                <p className="text-sm text-gray-700 dark:text-gray-300 leading-relaxed">
                  {selectedModule.summary}
                </p>
              </div>

              {/* Module Quiz Knowledge Check */}
              <div>
                <h3 className="text-lg font-bold text-gray-900 dark:text-gray-100 mb-4 flex items-center gap-2">
                  <span>🧠</span> Knowledge Check Quiz
                </h3>
                <QuizView questions={selectedModule.quiz_questions || []} />
              </div>
            </>
          ) : (
            <div className="flex items-center justify-center p-12 text-gray-400 italic">
              No module selected.
            </div>
          )}
        </div>
      </div>

      {/* Cheat Sheet Slide-over Drawer */}
      {selectedModule && (
        <CheatSheetDrawer
          bullets={selectedModule.cheatsheet_bullets || []}
          isOpen={isDrawerOpen}
          onClose={() => setIsDrawerOpen(false)}
        />
      )}
    </div>
  );
}
