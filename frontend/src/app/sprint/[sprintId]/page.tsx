"use client";

import React, { useEffect, useState, use } from "react";
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

  useEffect(() => {
    let interval: NodeJS.Timeout;

    const fetchSprint = async () => {
      try {
        const data = await getSprint(sprintId);
        setSprint(data);

        if (data.status === "ready" || data.status === "failed") {
          setIsPolling(false);
          clearInterval(interval);
        }
      } catch (err: unknown) {
        const message = err instanceof Error ? err.message : "Failed to load sprint plan";
        setError(message);
        setIsPolling(false);
        clearInterval(interval);
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
      <div className="text-red-500 p-8 border border-red-200 rounded-lg bg-red-50">
        {error}
      </div>
    );
  }

  if (!sprint) {
    return (
      <div className="p-8 text-center text-gray-500 animate-pulse">
        Loading sprint data...
      </div>
    );
  }

  if (sprint.status !== "ready") {
    return (
      <div className="flex flex-col items-center justify-center min-h-[50vh] space-y-6">
        <div className="w-16 h-16 border-4 border-blue-200 border-t-blue-600 rounded-full animate-spin"></div>
        <h2 className="text-2xl font-bold">Generating Sprint Plan</h2>
        <p className="text-gray-500 max-w-md text-center">
          LearnSync AI is analyzing your syllabus and PYQs to build an optimized study plan. This might take a minute or two.
        </p>
        <p className="text-sm font-mono bg-gray-100 dark:bg-gray-800 px-3 py-1 rounded">
          Status: {sprint.status}
        </p>
        {sprint.error_message && (
          <p className="text-red-500 text-sm">{sprint.error_message}</p>
        )}
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto pb-16">
      <SprintDashboard sprint={sprint} />
    </div>
  );
}
