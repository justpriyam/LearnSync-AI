'use client';

import { useEffect, useState } from 'react';
import { useSession } from 'next-auth/react';
import Link from 'next/link';
import {
  BookOpen,
  Zap,
  Users,
  FileText,
  ArrowRight,
  Upload,
  Plus,
  TrendingUp,
  Clock,
} from 'lucide-react';
import { getDashboardSummary, syncUser, type DashboardSummary } from '@/lib/api';

export default function DashboardPage() {
  const { data: session } = useSession();
  const [summary, setSummary] = useState<DashboardSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [synced, setSynced] = useState(false);

  // Sync user with backend on first load
  useEffect(() => {
    if (session?.user && !synced) {
      syncUser({
        id: (session.user as any).id,
        email: session.user.email,
        name: session.user.name,
        image: session.user.image,
      }).then(() => setSynced(true));
    }
  }, [session, synced]);

  // Load dashboard data
  useEffect(() => {
    if (!synced) return;
    setLoading(true);
    getDashboardSummary()
      .then(setSummary)
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [synced]);

  const statCards = [
    {
      label: 'Documents',
      count: summary?.documents_count ?? 0,
      icon: FileText,
      href: '/courses',
      color: 'bg-violet-500/10 text-violet-500',
    },
    {
      label: 'Courses',
      count: summary?.courses_count ?? 0,
      icon: BookOpen,
      href: '/courses',
      color: 'bg-blue-500/10 text-blue-500',
    },
    {
      label: 'Sprint Plans',
      count: summary?.sprints_count ?? 0,
      icon: Zap,
      href: '/sprint',
      color: 'bg-amber-500/10 text-amber-500',
    },
    {
      label: 'Interviews',
      count: summary?.interviews_count ?? 0,
      icon: Users,
      href: '/interview',
      color: 'bg-emerald-500/10 text-emerald-500',
    },
  ];

  return (
    <div className="p-6 max-w-7xl mx-auto">
      {/* Welcome */}
      <div className="mb-8">
        <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
          Welcome back{session?.user?.name ? `, ${session.user.name.split(' ')[0]}` : ''}
        </h2>
        <p className="text-gray-500 mt-1">Here&apos;s what&apos;s happening with your learning journey.</p>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        {statCards.map((card) => {
          const Icon = card.icon;
          return (
            <Link
              key={card.label}
              href={card.href}
              className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 p-5 hover:border-gray-300 dark:hover:border-gray-700 transition-colors group"
            >
              <div className="flex items-center justify-between mb-3">
                <div className={`p-2 rounded-lg ${card.color}`}>
                  <Icon size={20} />
                </div>
                <ArrowRight size={16} className="text-gray-400 group-hover:text-gray-600 transition-colors" />
              </div>
              <p className="text-2xl font-bold text-gray-900 dark:text-white">
                {loading ? '—' : card.count}
              </p>
              <p className="text-sm text-gray-500">{card.label}</p>
            </Link>
          );
        })}
      </div>

      {/* Quick Actions + Recent Activity */}
      <div className="grid lg:grid-cols-3 gap-6">
        {/* Quick Actions */}
        <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 p-6">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Quick Actions</h3>
          <div className="space-y-3">
            <Link
              href="/courses"
              className="flex items-center gap-3 p-3 rounded-lg bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-400 hover:bg-blue-100 dark:hover:bg-blue-900/30 transition-colors"
            >
              <Upload size={18} />
              <span className="text-sm font-medium">Upload a Document</span>
            </Link>
            <Link
              href="/sprint"
              className="flex items-center gap-3 p-3 rounded-lg bg-amber-50 dark:bg-amber-900/20 text-amber-700 dark:text-amber-400 hover:bg-amber-100 dark:hover:bg-amber-900/30 transition-colors"
            >
              <Plus size={18} />
              <span className="text-sm font-medium">Create Sprint Plan</span>
            </Link>
            <Link
              href="/interview"
              className="flex items-center gap-3 p-3 rounded-lg bg-emerald-50 dark:bg-emerald-900/20 text-emerald-700 dark:text-emerald-400 hover:bg-emerald-100 dark:hover:bg-emerald-900/30 transition-colors"
            >
              <Users size={18} />
              <span className="text-sm font-medium">Start Mock Interview</span>
            </Link>
          </div>
        </div>

        {/* Recent Activity */}
        <div className="lg:col-span-2 bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 p-6">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Recent Activity</h3>
          {loading ? (
            <div className="space-y-3">
              {[1, 2, 3].map((i) => (
                <div key={i} className="h-14 bg-gray-100 dark:bg-gray-800 rounded-lg animate-pulse" />
              ))}
            </div>
          ) : !summary?.recent_activity?.length ? (
            <div className="text-center py-12">
              <div className="w-16 h-16 bg-gray-100 dark:bg-gray-800 rounded-full flex items-center justify-center mx-auto mb-4">
                <Clock size={24} className="text-gray-400" />
              </div>
              <p className="text-gray-500 text-sm">No activity yet. Start by uploading a document!</p>
            </div>
          ) : (
            <div className="space-y-2">
              {summary.recent_activity.map((item) => {
                const typeIcons: Record<string, any> = {
                  course: BookOpen,
                  sprint: Zap,
                  interview: Users,
                  document: FileText,
                };
                const typeColors: Record<string, string> = {
                  course: 'text-blue-500',
                  sprint: 'text-amber-500',
                  interview: 'text-emerald-500',
                  document: 'text-violet-500',
                };
                const Icon = typeIcons[item.type] || FileText;
                const color = typeColors[item.type] || 'text-gray-500';
                const statusColors: Record<string, string> = {
                  ready: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400',
                  completed: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400',
                  active: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
                  pending: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400',
                  generating: 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400',
                  failed: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400',
                };

                return (
                  <div
                    key={`${item.type}-${item.id}`}
                    className="flex items-center gap-3 p-3 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors"
                  >
                    <div className={color}>
                      <Icon size={18} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-gray-900 dark:text-white truncate">
                        {item.title}
                      </p>
                      <p className="text-xs text-gray-500">
                        {new Date(item.created_at).toLocaleDateString()}
                      </p>
                    </div>
                    <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${statusColors[item.status] || 'bg-gray-100 text-gray-600'}`}>
                      {item.status}
                    </span>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
