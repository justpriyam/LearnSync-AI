'use client';

import React from 'react';
import { CheatSheetBullet } from '@/lib/types';

interface CheatSheetDrawerProps {
  bullets: CheatSheetBullet[];
  isOpen: boolean;
  onClose: () => void;
}

export default function CheatSheetDrawer({ bullets, isOpen, onClose }: CheatSheetDrawerProps) {
  return (
    <>
      {/* Overlay */}
      {isOpen && (
        <div 
          className="fixed inset-0 bg-black/60 backdrop-blur-xs z-40 transition-opacity"
          onClick={onClose}
        />
      )}
      
      {/* Drawer */}
      <div 
        className={`fixed top-0 right-0 h-full w-full sm:w-96 bg-white dark:bg-gray-900 border-l border-gray-200 dark:border-gray-800 shadow-2xl z-50 transform transition-transform duration-300 ease-in-out ${
          isOpen ? 'translate-x-0' : 'translate-x-full'
        }`}
      >
        <div className="p-6 h-full flex flex-col">
          <div className="flex justify-between items-center pb-4 border-b border-gray-200 dark:border-gray-800 mb-6">
            <div>
              <h2 className="text-xl font-bold text-gray-900 dark:text-gray-100">Cheat Sheet</h2>
              <p className="text-xs text-gray-500 mt-0.5">Key takeaways & exam concepts</p>
            </div>
            <button 
              onClick={onClose}
              className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg text-gray-500 hover:text-gray-900 dark:hover:text-gray-100 transition-colors"
              aria-label="Close drawer"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
          
          <div className="flex-1 overflow-y-auto pr-1">
            <ul className="space-y-3.5">
              {bullets.sort((a, b) => a.order_index - b.order_index).map((bullet, idx) => (
                <li key={idx} className="flex gap-3 items-start p-3 bg-gray-50 dark:bg-gray-800/60 rounded-lg border border-gray-100 dark:border-gray-800">
                  <div className="min-w-5 h-5 rounded-full bg-blue-100 text-blue-800 dark:bg-blue-900/80 dark:text-blue-200 flex items-center justify-center text-xs font-bold shrink-0 mt-0.5">
                    {idx + 1}
                  </div>
                  <p className="text-sm text-gray-800 dark:text-gray-200 leading-relaxed">
                    {bullet.text}
                  </p>
                </li>
              ))}
              {bullets.length === 0 && (
                <p className="text-gray-500 text-center italic mt-12 text-sm">No cheat sheet items generated for this module.</p>
              )}
            </ul>
          </div>
        </div>
      </div>
    </>
  );
}
