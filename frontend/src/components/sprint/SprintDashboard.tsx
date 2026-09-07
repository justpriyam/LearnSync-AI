'use client';

import React, { useMemo } from 'react';
import { SprintPlanResponse, SprintTopic } from '@/lib/types';

interface Props {
  sprint: SprintPlanResponse;
}

export default function SprintDashboard({ sprint }: Props) {
  const daysRemaining = useMemo(() => {
    const today = new Date();
    const deadline = new Date(sprint.deadline);
    const diffTime = deadline.getTime() - today.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays > 0 ? diffDays : 0;
  }, [sprint.deadline]);

  const topicsByDay = useMemo(() => {
    const grouped = new Map<number, SprintTopic[]>();
    for (let i = 1; i <= Math.max(sprint.total_days, 1); i++) {
      grouped.set(i, []);
    }
    sprint.topics.forEach((topic) => {
      if (!grouped.has(topic.assigned_day)) {
        grouped.set(topic.assigned_day, []);
      }
      grouped.get(topic.assigned_day)!.push(topic);
    });

    // Sort by priority_rank within each day
    grouped.forEach((topics) => {
      topics.sort((a, b) => a.priority_rank - b.priority_rank);
    });

    return grouped;
  }, [sprint]);

  return (
    <div className="space-y-8">
      {/* Header Stat Card */}
      <div className="bg-gradient-to-br from-blue-50 to-indigo-50 dark:from-blue-950/40 dark:to-indigo-950/40 p-6 rounded-2xl border border-blue-200 dark:border-blue-800/80 shadow-xs">
        <h2 className="text-2xl font-bold text-gray-900 dark:text-gray-100">Study Sprint Schedule</h2>
        <div className="mt-4 grid grid-cols-1 sm:grid-cols-3 gap-4 text-sm">
          <div className="p-3 bg-white/80 dark:bg-gray-900/60 rounded-xl border border-blue-100 dark:border-blue-900/50">
            <span className="text-xs text-gray-500 block uppercase font-medium">Exam Deadline</span>
            <span className="text-base font-semibold text-gray-900 dark:text-gray-100">{sprint.deadline}</span>
          </div>
          <div className="p-3 bg-white/80 dark:bg-gray-900/60 rounded-xl border border-blue-100 dark:border-blue-900/50">
            <span className="text-xs text-gray-500 block uppercase font-medium">Days Remaining</span>
            <span className="text-base font-semibold text-blue-600 dark:text-blue-400">{daysRemaining} Days</span>
          </div>
          <div className="p-3 bg-white/80 dark:bg-gray-900/60 rounded-xl border border-blue-100 dark:border-blue-900/50">
            <span className="text-xs text-gray-500 block uppercase font-medium">Sprint Duration</span>
            <span className="text-base font-semibold text-gray-900 dark:text-gray-100">{sprint.total_days} Study Days</span>
          </div>
        </div>
      </div>

      {/* Daily Breakdown */}
      <div className="space-y-6">
        {Array.from(topicsByDay.entries()).map(([day, topics]) => {
          const highPriority = topics.filter(t => !t.is_low_priority);
          const lowPriority = topics.filter(t => t.is_low_priority);

          return (
            <div key={day} className="bg-white dark:bg-gray-900 rounded-2xl shadow-xs border border-gray-200 dark:border-gray-800 overflow-hidden">
              <div className="bg-gray-50/80 dark:bg-gray-800/50 px-6 py-4 border-b border-gray-200 dark:border-gray-800 flex items-center justify-between">
                <h3 className="text-lg font-bold text-gray-900 dark:text-gray-100">Day {day}</h3>
                <span className="text-xs text-gray-500 font-medium">{topics.length} Topics Planned</span>
              </div>
              <div className="p-6 space-y-4">
                {highPriority.length === 0 && lowPriority.length === 0 && (
                  <p className="text-gray-500 italic text-sm text-center py-4">No topics assigned for this day (Rest / Review Day).</p>
                )}
                
                {highPriority.length > 0 && (
                  <div className="space-y-3">
                    {highPriority.map(topic => (
                      <TopicCard key={topic.id} topic={topic} />
                    ))}
                  </div>
                )}

                {lowPriority.length > 0 && (
                  <div className="mt-6 pt-4 border-t border-gray-100 dark:border-gray-800">
                    <h4 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-3">Optional / Low Exam Probability</h4>
                    <div className="space-y-2">
                      {lowPriority.map(topic => (
                        <TopicCard key={topic.id} topic={topic} />
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function TopicCard({ topic }: { topic: SprintTopic }) {
  const isLow = topic.is_low_priority;
  
  return (
    <div className={`p-4 rounded-xl border transition-colors ${
      isLow 
        ? 'bg-gray-50/60 border-gray-200 dark:bg-gray-800/30 dark:border-gray-800 opacity-75' 
        : 'bg-white border-gray-200 dark:bg-gray-900 dark:border-gray-800 shadow-xs hover:border-gray-300 dark:hover:border-gray-700'
    }`}>
      <div className="flex justify-between items-start gap-4">
        <div>
          <h4 className={`font-semibold text-sm sm:text-base ${isLow ? 'text-gray-600 dark:text-gray-400' : 'text-gray-900 dark:text-gray-100'}`}>
            {topic.topic_title}
          </h4>
          <div className="mt-2 flex flex-wrap items-center gap-3 text-xs">
            <span className={`inline-flex items-center gap-1 font-medium ${
              topic.pyq_frequency > 1 
                ? 'text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/40 px-2 py-0.5 rounded-md' 
                : 'text-gray-500'
            }`}>
              🔥 PYQ Frequency: {topic.pyq_frequency}
            </span>
            <span className="text-gray-400">•</span>
            <span className="text-gray-500">
              Exam Match: {Math.round(topic.similarity_score * 100)}%
            </span>
          </div>
        </div>
        <div className="shrink-0">
          <span className={`inline-block px-2.5 py-1 rounded-full text-xs font-bold ${
            isLow 
              ? 'bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400' 
              : 'bg-blue-100 text-blue-800 dark:bg-blue-900/60 dark:text-blue-300'
          }`}>
            Rank #{topic.priority_rank}
          </span>
        </div>
      </div>
    </div>
  );
}
