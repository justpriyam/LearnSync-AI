"use client";

import React, { useEffect, useState, use, useRef } from "react";
import Link from "next/link";
import { getSprint } from "@/lib/api";
import { SprintPlanResponse } from "@/lib/types";
import SprintDashboard from "@/components/SprintDashboard";

export default function SprintViewPage({
  params,
}: {
  params: Promise<{ sprintId: string }>;
}) {
  const { sprintId } = use(params);
  const [sprint, setSprint] = useState<SprintPlanResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isPolling, setIsPolling] = useState(true);
  const failCountRef = useRef(0);

  useEffect(() => {
    let interval: NodeJS.Timeout;

    const fetchSprint = async () => {
      try {
        const data = await getSprint(sprintId);
        setSprint(data);
        failCountRef.current = 0;

        if (data.status === "ready" || data.status === "failed") {
          setIsPolling(false);
          clearInterval(interval);
        }
      } catch (err: unknown) {
        failCountRef.current += 1;
        if (failCountRef.current > 4) {
          const message = err instanceof Error ? err.message : "Failed to load sprint plan";
          setError(message);
          setIsPolling(false);
          clearInterval(interval);
        }
      }
    };

    fetchSprint();

    if (isPolling) {
      interval = setInterval(fetchSprint, 3000);
    }

    return () => clearInterval(interval);
  }, [sprintId, isPolling]);

  if (error) {
    return (
      <div className="max-w-2xl mx-auto py-12 px-4 text-center">
        <div className="p-8 border border-red-200 dark:border-red-900/60 rounded-2xl bg-red-50/80 dark:bg-red-950/30 space-y-4">
          <div className="w-12 h-12 rounded-full bg-red-100 text-red-600 flex items-center justify-center mx-auto text-xl font-bold">
            !
          </div>
          <h2 className="text-xl font-bold text-red-900 dark:text-red-200">Unable to Load Sprint Plan</h2>
          <p className="text-sm text-red-700 dark:text-red-400">{error}</p>
          <div className="pt-2 flex justify-center gap-4">
            <button
              onClick={() => { setError(null); setIsPolling(true); failCountRef.current = 0; }}
              className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg text-sm font-medium transition-colors"
            >
              Retry Connection
            </button>
            <Link
              href="/sprint"
              className="px-4 py-2 bg-gray-200 dark:bg-gray-800 text-gray-800 dark:text-gray-200 hover:bg-gray-300 rounded-lg text-sm font-medium transition-colors"
            >
              Back to Sprint Planner
            </Link>
          </div>
        </div>
      </div>
    );
  }

  if (!sprint) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[50vh] space-y-4">
        <div className="w-10 h-10 border-3 border-blue-200 border-t-blue-600 rounded-full animate-spin"></div>
        <p className="text-sm text-gray-500 animate-pulse">Loading sprint data...</p>
      </div>
    );
  }

  if (sprint.status === "failed") {
    return (
      <div className="max-w-xl mx-auto py-16 px-4 text-center">
        <div className="p-8 border border-rose-200 dark:border-rose-900/60 rounded-2xl bg-rose-50/70 dark:bg-rose-950/30 space-y-4">
          <div className="w-12 h-12 rounded-full bg-rose-100 text-rose-600 flex items-center justify-center mx-auto text-xl font-bold">
            ✕
          </div>
          <h2 className="text-xl font-bold text-gray-900 dark:text-gray-100">Sprint Plan Generation Failed</h2>
          <p className="text-sm text-gray-600 dark:text-gray-400">
            {sprint.error_message || "Unable to correlate syllabus topics with past exam questions."}
          </p>
          <div className="pt-4 flex justify-center gap-3">
            <Link
              href="/sprint"
              className="px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium rounded-xl shadow-xs transition-colors"
            >
              Back to Sprint Planner
            </Link>
          </div>
        </div>
      </div>
    );
  }

  if (sprint.status !== "ready") {
    return (
      <div className="flex flex-col items-center justify-center min-h-[55vh] space-y-6 px-4 text-center">
        <div className="relative">
          <div className="w-16 h-16 border-4 border-blue-200 dark:border-blue-900 border-t-blue-600 rounded-full animate-spin"></div>
          <div className="absolute inset-0 flex items-center justify-center text-xs font-bold text-blue-600">
            AI
          </div>
        </div>
        <div>
          <h2 className="text-2xl font-bold text-gray-900 dark:text-gray-100">Generating Study Sprint</h2>
          <p className="text-gray-500 dark:text-gray-400 text-sm max-w-md mx-auto mt-2 leading-relaxed">
            LearnSync AI is analyzing syllabus topics against past paper frequency and computing day-by-day exam priorities.
          </p>
        </div>
        <div className="flex items-center gap-2 px-3 py-1 bg-blue-50 dark:bg-blue-950/60 border border-blue-200 dark:border-blue-800 rounded-full text-xs font-semibold text-blue-700 dark:text-blue-300">
          <span className="w-2 h-2 rounded-full bg-blue-500 animate-ping"></span>
          Status: {sprint.status} • Live optimization in progress
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto pb-16">
      <SprintDashboard sprint={sprint} />
    </div>
  );
}
