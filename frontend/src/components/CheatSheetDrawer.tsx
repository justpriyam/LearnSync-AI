'use client';

import React from 'react';
import { CheatSheetBullet } from '../lib/types';

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
          className="fixed inset-0 bg-black/50 z-40 transition-opacity"
          onClick={onClose}
        />
      )}
      
      {/* Drawer */}
      <div 
        className={`fixed top-0 right-0 h-full w-full sm:w-96 bg-white dark:bg-gray-900 shadow-2xl z-50 transform transition-transform duration-300 ease-in-out ${
          isOpen ? 'translate-x-0' : 'translate-x-full'
        }`}
      >
        <div className="p-6 h-full flex flex-col">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-2xl font-bold">Cheat Sheet</h2>
            <button 
              onClick={onClose}
              className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-full transition-colors"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
          
          <div className="flex-1 overflow-y-auto pr-2">
            <ul className="space-y-4">
              {bullets.sort((a, b) => a.order_index - b.order_index).map((bullet, idx) => (
                <li key={idx} className="flex gap-3 items-start">
                  <div className="min-w-6 h-6 rounded-full bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200 flex items-center justify-center text-sm font-semibold shrink-0 mt-0.5">
                    {idx + 1}
                  </div>
                  <p className="text-gray-700 dark:text-gray-300 leading-relaxed">
                    {bullet.text}
                  </p>
                </li>
              ))}
              {bullets.length === 0 && (
                <p className="text-gray-500 text-center italic mt-10">No cheat sheet items available for this module.</p>
              )}
            </ul>
          </div>
        </div>
      </div>
    </>
  );
}
