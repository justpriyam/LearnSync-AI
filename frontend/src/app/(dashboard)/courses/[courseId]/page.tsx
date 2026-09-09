"use client";

import React, { useEffect, useState, use } from "react";
import { useRouter } from "next/navigation";
import { getCourse } from "@/lib/api";
import { CourseResponse } from "@/lib/types";
import ModuleList from "@/components/ModuleList";
import QuizView from "@/components/QuizView";
import CheatSheetDrawer from "@/components/CheatSheetDrawer";
import CourseSummary from "@/components/CourseSummary";

// Simple markdown renderer
function renderMarkdown(text: string) {
  if (!text) return "";
  let html = text
    .replace(/^### (.*$)/gim, '<h3 class="text-xl font-bold mt-6 mb-3">$1</h3>')
    .replace(/^## (.*$)/gim, '<h2 class="text-2xl font-bold mt-8 mb-4">$1</h2>')
    .replace(/^# (.*$)/gim, '<h1 class="text-3xl font-bold mt-10 mb-6">$1</h1>')
    .replace(/\*\*(.*?)\*\*/gim, '<strong>$1</strong>')
    .replace(/\*(.*?)\*/gim, '<em>$1</em>')
    .replace(/`(.*?)`/gim, '<code class="bg-gray-100 px-1 rounded text-sm">$1</code>')
    .replace(/\n\n/gim, '</p><p class="my-4">')
    .replace(/\n/gim, '<br />');
  return `<p class="my-4">${html}</p>`;
}

export default function CoursePage({
  params,
}: {
  params: Promise<{ courseId: string }>;
}) {
  const router = useRouter();
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

          if (data.status === "ready" && data.modules.length > 0 && !selectedModuleId) {
            setSelectedModuleId(data.modules.sort((a, b) => a.order_index - b.order_index)[0].id);
          }
        }
      } catch (err: unknown) {
        setError(err instanceof Error ? err.message : "Failed to load course");
        setIsPolling(false);
        clearInterval(interval);
      }
    };

    fetchCourse();
    if (isPolling) interval = setInterval(fetchCourse, 3000);

    return () => clearInterval(interval);
  }, [courseId, isPolling, selectedModuleId]);

  if (error) {
    return (
      <div className="text-red-500 p-8 border border-red-200 rounded-lg bg-red-50 max-w-2xl mx-auto mt-10">
        <h2 className="text-xl font-bold mb-4">Error</h2>
        <p className="mb-6">{error}</p>
        <button onClick={() => router.back()} className="px-4 py-2 bg-gray-900 text-white rounded-md hover:bg-gray-800">
          Go Back
        </button>
      </div>
    );
  }

  if (!course) {
    return <div className="p-8 text-center text-gray-700 animate-pulse">Loading course data...</div>;
  }

  if (course.status === "failed") {
    return (
      <div className="flex flex-col items-center justify-center min-h-[50vh] space-y-6">
        <div className="w-16 h-16 border-4 border-red-200 border-t-red-600 rounded-full"></div>
        <h2 className="text-2xl font-bold text-red-600">Course Generation Failed</h2>
        <p className="text-gray-700 max-w-md text-center">
          {course.error_message || "We encountered an error while trying to generate this course. Please try a different topic or document."}
        </p>
        <button onClick={() => router.back()} className="px-6 py-2 bg-gray-900 text-white rounded-md hover:bg-gray-800">
          Go Back
        </button>
      </div>
    );
  }

  if (course.status !== "ready") {
    return (
      <div className="flex flex-col items-center justify-center min-h-[50vh] space-y-6">
        <div className="w-16 h-16 border-4 border-blue-200 border-t-blue-600 rounded-full animate-spin"></div>
        <h2 className="text-2xl font-bold">Generating Course</h2>
        <p className="text-gray-700 max-w-md text-center">
          LearnSync AI is building your curriculum, generating lessons,
          quizzes, and curating resources. This might take a minute or two.
        </p>
        <p className="text-sm font-mono bg-gray-100 px-3 py-1 rounded">Status: {course.status}</p>
      </div>
    );
  }

  const sortedModules = [...course.modules].sort((a, b) => a.order_index - b.order_index);
  const selectedModule = sortedModules[currentModuleIndex];
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

  let ytLinks: {title: string, url: string}[] = [];
  try {
    if (selectedModule?.youtube_links) {
      ytLinks = JSON.parse(selectedModule.youtube_links);
    }
  } catch (e) {
    console.error("Failed to parse youtube_links", e);
  }

  return (
    <div className="flex flex-col md:flex-row gap-8 min-h-[calc(100vh-6rem)]">
      {/* Sidebar */}
      <div className="w-full md:w-80 shrink-0 border-r border-gray-200 pr-4">
        <div className="sticky top-24">
          <button onClick={() => router.back()} className="text-sm text-gray-500 hover:text-gray-900 mb-4 flex items-center gap-1">
            &larr; Back to Courses
          </button>
          <h2 className="text-xl font-bold mb-6 line-clamp-2" title={course.title}>
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
        <div className="flex-1 min-w-0 pb-16 max-w-4xl">
          <div className="flex items-start justify-between gap-4 mb-8 pb-6 border-b border-gray-200">
            <div>
              <div className="text-sm font-semibold text-indigo-600 mb-2 tracking-wide uppercase">
                MODULE {selectedModule.order_index + 1}
              </div>
              <h1 className="text-4xl font-bold leading-tight text-gray-900">
                {selectedModule.title}
              </h1>
            </div>
            <button
              onClick={() => setIsDrawerOpen(true)}
              className="shrink-0 flex items-center gap-2 px-4 py-2 bg-indigo-50 text-indigo-700 border border-indigo-200 rounded-md font-medium hover:bg-indigo-100 transition-colors"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
              Cheat Sheet
            </button>
          </div>

          <div className="space-y-12">
            {/* Lesson Content */}
            <div className="prose max-w-none text-gray-800 text-lg leading-relaxed">
              {selectedModule.lesson_content ? (
                <div dangerouslySetInnerHTML={{ __html: renderMarkdown(selectedModule.lesson_content) }} />
              ) : (
                <p>{selectedModule.summary}</p>
              )}
            </div>

            {/* YouTube Videos */}
            {ytLinks.length > 0 && (
              <div className="bg-gray-50 rounded-xl p-6 border border-gray-200">
                <h3 className="text-xl font-bold mb-4 flex items-center gap-2">
                  <svg className="w-6 h-6 text-red-600" fill="currentColor" viewBox="0 0 24 24"><path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z"/></svg>
                  Recommended Videos
                </h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {ytLinks.map((link, idx) => {
                    const videoIdMatch = link.url.match(/(?:youtu\.be\/|youtube\.com\/(?:[^\/]+\/.+\/|(?:v|e(?:mbed)?)\/|.*[?&]v=)|youtu\.be\/)([^"&?\/\s]{11})/);
                    const videoId = videoIdMatch ? videoIdMatch[1] : null;
                    const thumbnailUrl = videoId ? `https://img.youtube.com/vi/${videoId}/hqdefault.jpg` : null;

                    return (
                      <a key={idx} href={link.url} target="_blank" rel="noopener noreferrer" className="block group border border-gray-200 rounded-lg overflow-hidden bg-white hover:border-indigo-400 transition-colors shadow-sm">
                        {thumbnailUrl && (
                          <div className="w-full h-32 bg-gray-200 relative overflow-hidden">
                            <img src={thumbnailUrl} alt={link.title} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" />
                            <div className="absolute inset-0 bg-black/20 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                              <div className="w-12 h-12 bg-white/90 rounded-full flex items-center justify-center pl-1 shadow-lg">
                                <svg className="w-6 h-6 text-indigo-600" fill="currentColor" viewBox="0 0 24 24"><path d="M8 5v14l11-7z"/></svg>
                              </div>
                            </div>
                          </div>
                        )}
                        <div className="p-3">
                          <h4 className="font-medium text-gray-900 line-clamp-2 text-sm">{link.title}</h4>
                        </div>
                      </a>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Key Concepts */}
            {selectedModule.cheatsheet_bullets && selectedModule.cheatsheet_bullets.length > 0 && (
              <div className="bg-yellow-50 rounded-xl p-6 border border-yellow-200">
                <h3 className="text-xl font-bold mb-4 text-yellow-800 flex items-center gap-2">
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" /></svg>
                  Key Concepts
                </h3>
                <ul className="space-y-3">
                  {selectedModule.cheatsheet_bullets.map((bullet, i) => (
                    <li key={i} className="flex items-start gap-3 text-gray-800">
                      <div className="mt-1.5 w-1.5 h-1.5 rounded-full bg-yellow-500 shrink-0"></div>
                      <span>{bullet.text}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {/* Knowledge Check */}
            <div className="border-t border-gray-200 pt-10">
              <h3 className="text-2xl font-bold mb-6">Knowledge Check</h3>
              <QuizView
                key={selectedModule.id}
                questions={selectedModule.quiz_questions}
                resetKey={selectedModule.id}
                onComplete={(score) => setCompletedScores((prev) => ({ ...prev, [selectedModule.id]: score }))}
              />
            </div>
            
            <div className="mt-8 flex items-center justify-between border-t border-gray-200 pt-6">
              <button
                onClick={() => selectModule(sortedModules[currentModuleIndex - 1]?.id)}
                disabled={currentModuleIndex === 0}
                className="rounded-lg border border-gray-300 px-5 py-2 font-medium disabled:cursor-not-allowed disabled:opacity-40 text-gray-700 hover:bg-gray-50"
              >
                Previous
              </button>
              <span className="text-sm text-gray-500">Module {currentModuleIndex + 1} of {sortedModules.length}</span>
              <button
                onClick={() => selectModule(sortedModules[currentModuleIndex + 1]?.id)}
                disabled={currentModuleIndex >= sortedModules.length - 1 || completedScores[selectedModule.id] === undefined}
                className="rounded-lg bg-indigo-600 px-6 py-2 font-medium text-white disabled:cursor-not-allowed disabled:opacity-40 hover:bg-indigo-700 transition-colors shadow-sm"
              >
                Next Module
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
