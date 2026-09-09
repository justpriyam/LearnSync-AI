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
    for (let i = 1; i <= sprint.total_days; i++) {
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
      <div className="bg-blue-50 dark:bg-blue-900/20 p-6 rounded-lg border border-blue-200 dark:border-blue-800">
        <h2 className="text-2xl font-bold text-blue-800 dark:text-blue-300">Sprint Plan</h2>
        <div className="mt-2 flex gap-6 text-sm text-blue-700 dark:text-blue-400">
          <div><span className="font-semibold">Deadline:</span> {sprint.deadline}</div>
          <div><span className="font-semibold">Days Remaining:</span> {daysRemaining}</div>
          <div><span className="font-semibold">Total Plan Days:</span> {sprint.total_days}</div>
        </div>
      </div>

      <div className="space-y-6">
        {Array.from(topicsByDay.entries()).map(([day, topics]) => {
          const highPriority = topics.filter(t => !t.is_low_priority);
          const lowPriority = topics.filter(t => t.is_low_priority);

          return (
            <div key={day} className="bg-white dark:bg-gray-900 rounded-xl shadow-sm border border-gray-200 dark:border-gray-800 overflow-hidden">
              <div className="bg-gray-50 dark:bg-gray-800 px-6 py-4 border-b border-gray-200 dark:border-gray-700">
                <h3 className="text-xl font-semibold text-gray-900 dark:text-gray-100">Day {day}</h3>
              </div>
              <div className="p-6 space-y-4">
                {highPriority.length === 0 && lowPriority.length === 0 && (
                  <p className="text-gray-700 italic">No topics assigned for this day.</p>
                )}
                
                {highPriority.length > 0 && (
                  <div className="space-y-3">
                    {highPriority.map(topic => (
                      <TopicCard key={topic.id} topic={topic} />
                    ))}
                  </div>
                )}

                {lowPriority.length > 0 && (
                  <div className="mt-6">
                    <h4 className="text-sm font-medium text-gray-700 uppercase tracking-wider mb-3">Low Priority / Optional</h4>
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
    <div className={`p-4 rounded-lg border ${isLow ? 'bg-gray-50 border-gray-200 dark:bg-gray-800/50 dark:border-gray-700 opacity-75' : 'bg-white border-gray-200 dark:bg-gray-900 dark:border-gray-700 shadow-sm'}`}>
      <div className="flex justify-between items-start">
        <div>
          <h4 className={`font-semibold ${isLow ? 'text-gray-600 dark:text-gray-400' : 'text-gray-900 dark:text-gray-100'}`}>
            {topic.topic_title}
          </h4>
          <div className="mt-1 flex items-center gap-4 text-xs">
            <span className={isLow ? 'text-gray-700' : 'text-orange-600 dark:text-orange-400 font-medium'}>
              PYQ Frequency: {topic.pyq_frequency}
            </span>
            <span className="text-gray-700">
              Confidence: {Math.round(topic.similarity_score * 100)}%
            </span>
          </div>
        </div>
        <div>
          <span className={`inline-block px-2 py-1 rounded text-xs font-semibold ${isLow ? 'bg-gray-200 text-gray-600 dark:bg-gray-700 dark:text-gray-400' : 'bg-blue-100 text-blue-700 dark:bg-blue-900/50 dark:text-blue-400'}`}>
            Rank #{topic.priority_rank}
          </span>
        </div>
      </div>
    </div>
  );
}
