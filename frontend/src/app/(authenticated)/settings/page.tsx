'use client';

import { useSession, signOut } from 'next-auth/react';
import { LogOut, User, Mail, Shield } from 'lucide-react';

export default function SettingsPage() {
  const { data: session } = useSession();
  const user = session?.user;

  return (
    <div className="p-6 max-w-3xl mx-auto">
      <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-6">Settings</h2>

      {/* Profile Card */}
      <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 p-6 mb-6">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Profile</h3>
        <div className="flex items-center gap-4 mb-6">
          {user?.image ? (
            <img
              src={user.image}
              alt={user.name || ''}
              className="w-16 h-16 rounded-full"
            />
          ) : (
            <div className="w-16 h-16 rounded-full bg-blue-600 flex items-center justify-center text-white text-xl font-medium">
              {user?.name?.[0] || '?'}
            </div>
          )}
          <div>
            <p className="text-lg font-medium text-gray-900 dark:text-white">{user?.name}</p>
            <p className="text-sm text-gray-500">{user?.email}</p>
          </div>
        </div>

        <div className="space-y-3">
          <div className="flex items-center gap-3 p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
            <User size={18} className="text-gray-400" />
            <div>
              <p className="text-xs text-gray-500">Name</p>
              <p className="text-sm text-gray-900 dark:text-white">{user?.name || 'Not set'}</p>
            </div>
          </div>
          <div className="flex items-center gap-3 p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
            <Mail size={18} className="text-gray-400" />
            <div>
              <p className="text-xs text-gray-500">Email</p>
              <p className="text-sm text-gray-900 dark:text-white">{user?.email || 'Not set'}</p>
            </div>
          </div>
          <div className="flex items-center gap-3 p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
            <Shield size={18} className="text-gray-400" />
            <div>
              <p className="text-xs text-gray-500">Authentication</p>
              <p className="text-sm text-gray-900 dark:text-white">Google OAuth</p>
            </div>
          </div>
        </div>
      </div>

      {/* Sign Out */}
      <div className="bg-white dark:bg-gray-900 rounded-xl border border-red-200 dark:border-red-900/30 p-6">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">Sign Out</h3>
        <p className="text-sm text-gray-500 mb-4">
          Sign out of your LearnSync AI account. Your data will be preserved.
        </p>
        <button
          onClick={() => signOut({ callbackUrl: '/' })}
          className="flex items-center gap-2 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors text-sm font-medium"
        >
          <LogOut size={16} />
          Sign Out
        </button>
      </div>
    </div>
  );
}
