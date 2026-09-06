'use client';

import React from 'react';
import { Module } from '../lib/types';

interface ModuleListProps {
  modules: Module[];
  selectedModuleId: string | null;
  onSelectModule: (id: string) => void;
}

export default function ModuleList({ modules, selectedModuleId, onSelectModule }: ModuleListProps) {
  return (
    <div className="flex flex-col gap-2 w-full">
      {modules.map((module) => (
        <button
          key={module.id}
          onClick={() => onSelectModule(module.id)}
          className={`text-left p-4 rounded-lg border transition-all ${
            selectedModuleId === module.id
              ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20'
              : 'border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600'
          }`}
        >
          <div className="text-xs font-semibold text-gray-500 mb-1">
            MODULE {module.order_index + 1}
          </div>
          <h3 className="font-medium text-lg leading-tight mb-2 line-clamp-2">
            {module.title}
          </h3>
          <div className="text-sm text-gray-600 dark:text-gray-400 line-clamp-2">
            {module.summary}
          </div>
          <div className="mt-3 flex gap-3 text-xs text-gray-500">
            <span>{module.quiz_questions.length} Questions</span>
            <span>{module.cheatsheet_bullets.length} Bullets</span>
          </div>
        </button>
      ))}
    </div>
  );
}
