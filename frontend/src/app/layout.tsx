import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import './globals.css';

const inter = Inter({ subsets: ['latin'] });

import Link from 'next/link';

export const metadata: Metadata = {
  title: 'LearnSync AI',
  description: 'Course Engine MVP',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className={`${inter.className} bg-white dark:bg-gray-950 text-gray-900 dark:text-gray-100 min-h-screen flex flex-col`}>
        <header className="border-b border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-950 px-6 py-4 sticky top-0 z-30">
          <div className="max-w-7xl mx-auto flex items-center gap-6">
            <Link href="/" className="text-xl font-bold text-blue-600 dark:text-blue-500">
              LearnSync AI
            </Link>
            <nav className="flex gap-4">
              <Link href="/" className="text-gray-600 dark:text-gray-300 hover:text-blue-600 dark:hover:text-blue-400 font-medium">
                Courses
              </Link>
              <Link href="/sprint" className="text-gray-600 dark:text-gray-300 hover:text-blue-600 dark:hover:text-blue-400 font-medium">
                Sprint Planner
              </Link>
              <Link href="/interview" className="text-gray-600 dark:text-gray-300 hover:text-blue-600 dark:hover:text-blue-400 font-medium">
                Mock Interview
              </Link>
            </nav>
          </div>
        </header>
        <main className="flex-1 max-w-7xl mx-auto w-full p-6">
          {children}
        </main>
      </body>
    </html>
  );
}
