'use client';

import React from 'react';
import { Module } from '@/lib/types';

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
          className={`text-left p-4 rounded-xl border transition-all ${
            selectedModuleId === module.id
              ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20 shadow-xs'
              : 'border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600 bg-white dark:bg-gray-900'
          }`}
        >
          <div className="text-xs font-bold uppercase tracking-wider text-blue-600 dark:text-blue-400 mb-1">
            Module {module.order_index + 1}
          </div>
          <h3 className="font-semibold text-base leading-snug mb-1.5 line-clamp-2 text-gray-900 dark:text-gray-100">
            {module.title}
          </h3>
          <div className="text-xs text-gray-600 dark:text-gray-400 line-clamp-2 leading-relaxed">
            {module.summary}
          </div>
          <div className="mt-3 flex items-center gap-3 text-xs text-gray-500 font-medium">
            <span>📝 {module.quiz_questions?.length || 0} Questions</span>
            <span>📌 {module.cheatsheet_bullets?.length || 0} Bullets</span>
          </div>
        </button>
      ))}
    </div>
  );
}
