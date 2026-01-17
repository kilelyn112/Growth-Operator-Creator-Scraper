'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

interface User {
  id: number;
  email: string;
  phone: string | null;
  first_name: string;
  is_member: boolean;
  trial_started_at: string;
  last_login_at: string | null;
  created_at: string;
}

interface Stats {
  total: number;
  members: number;
  activeTrials: number;
  expiredTrials: number;
}

function getTrialStatus(user: User): { status: string; daysRemaining: number; className: string } {
  if (user.is_member) {
    return { status: 'Member', daysRemaining: 0, className: 'bg-emerald-100 text-emerald-800' };
  }

  const trialStart = new Date(user.trial_started_at);
  const now = new Date();
  const diffTime = now.getTime() - trialStart.getTime();
  const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
  const daysRemaining = Math.max(0, 7 - diffDays);

  if (daysRemaining > 0) {
    return {
      status: `${daysRemaining} days left`,
      daysRemaining,
      className: daysRemaining <= 2 ? 'bg-amber-100 text-amber-800' : 'bg-blue-100 text-blue-800'
    };
  }

  return { status: 'Expired', daysRemaining: 0, className: 'bg-red-100 text-red-800' };
}

function formatDate(dateString: string | null): string {
  if (!dateString) return 'Never';
  return new Date(dateString).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

export default function AdminPage() {
  const router = useRouter();
  const [users, setUsers] = useState<User[]>([]);
  const [stats, setStats] = useState<Stats | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [actionLoading, setActionLoading] = useState<number | null>(null);

  const fetchUsers = async () => {
    try {
      const response = await fetch('/api/admin/users');

      if (response.status === 401) {
        router.push('/login');
        return;
      }

      if (response.status === 403) {
        setError('You do not have permission to access this page');
        setIsLoading(false);
        return;
      }

      if (!response.ok) {
        throw new Error('Failed to fetch users');
      }

      const data = await response.json();
      setUsers(data.users);
      setStats(data.stats);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load users');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchUsers();
  }, []);

  const toggleMembership = async (userId: number, currentStatus: boolean) => {
    setActionLoading(userId);
    try {
      const response = await fetch(`/api/admin/users/${userId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isMember: !currentStatus }),
      });

      if (!response.ok) {
        throw new Error('Failed to update user');
      }

      // Refresh user list
      await fetchUsers();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update user');
    } finally {
      setActionLoading(null);
    }
  };

  const deleteUserHandler = async (userId: number, email: string) => {
    if (!confirm(`Are you sure you want to delete ${email}? This cannot be undone.`)) {
      return;
    }

    setActionLoading(userId);
    try {
      const response = await fetch(`/api/admin/users/${userId}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to delete user');
      }

      // Refresh user list
      await fetchUsers();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete user');
    } finally {
      setActionLoading(null);
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-[var(--bg-primary)] flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-[var(--accent)] border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (error && !users.length) {
    return (
      <div className="min-h-screen bg-[var(--bg-primary)] flex flex-col">
        <header className="border-b border-[var(--border-default)]">
          <div className="max-w-6xl mx-auto px-6 py-4">
            <Link href="/" className="block">
              <h1 className="font-fancy text-2xl font-semibold text-[var(--text-primary)]">
                creatorpairing.com
              </h1>
            </Link>
          </div>
        </header>
        <main className="flex-1 flex items-center justify-center">
          <div className="text-center">
            <div className="text-[var(--status-error)] mb-4">
              <svg className="w-16 h-16 mx-auto" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
            </div>
            <h2 className="text-xl font-semibold text-[var(--text-primary)] mb-2">Access Denied</h2>
            <p className="text-[var(--text-secondary)]">{error}</p>
            <Link href="/" className="btn-primary mt-6 inline-block">
              Go Back
            </Link>
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[var(--bg-primary)]">
      {/* Header */}
      <header className="border-b border-[var(--border-default)]">
        <div className="max-w-6xl mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div>
              <Link href="/" className="block">
                <h1 className="font-fancy text-2xl font-semibold text-[var(--text-primary)]">
                  creatorpairing.com
                </h1>
              </Link>
              <p className="text-sm text-[var(--text-secondary)] mt-0.5">
                Admin Dashboard
              </p>
            </div>
            <Link href="/" className="btn-secondary text-sm">
              Back to App
            </Link>
          </div>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-6 py-10">
        {error && (
          <div className="mb-6 px-4 py-3 rounded-lg bg-[var(--status-error-light)] border border-[var(--status-error)]">
            <span className="text-[var(--status-error)] text-sm">{error}</span>
          </div>
        )}

        {/* Stats Cards */}
        {stats && (
          <div className="grid grid-cols-4 gap-4 mb-8">
            <div className="card p-5">
              <div className="text-3xl font-bold text-[var(--text-primary)]">{stats.total}</div>
              <div className="text-sm text-[var(--text-secondary)]">Total Users</div>
            </div>
            <div className="card p-5">
              <div className="text-3xl font-bold text-emerald-600">{stats.members}</div>
              <div className="text-sm text-[var(--text-secondary)]">Members</div>
            </div>
            <div className="card p-5">
              <div className="text-3xl font-bold text-blue-600">{stats.activeTrials}</div>
              <div className="text-sm text-[var(--text-secondary)]">Active Trials</div>
            </div>
            <div className="card p-5">
              <div className="text-3xl font-bold text-red-600">{stats.expiredTrials}</div>
              <div className="text-sm text-[var(--text-secondary)]">Expired</div>
            </div>
          </div>
        )}

        {/* Users Table */}
        <div className="card overflow-hidden">
          <div className="px-6 py-4 border-b border-[var(--border-default)]">
            <h2 className="font-semibold text-[var(--text-primary)]">All Users</h2>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-[var(--bg-subtle)]">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-[var(--text-secondary)] uppercase tracking-wider">
                    User
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-[var(--text-secondary)] uppercase tracking-wider">
                    Contact
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-[var(--text-secondary)] uppercase tracking-wider">
                    Status
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-[var(--text-secondary)] uppercase tracking-wider">
                    Joined
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-[var(--text-secondary)] uppercase tracking-wider">
                    Last Login
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-[var(--text-secondary)] uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--border-default)]">
                {users.map((user) => {
                  const trialStatus = getTrialStatus(user);
                  const isActionLoading = actionLoading === user.id;

                  return (
                    <tr key={user.id} className="hover:bg-[var(--bg-subtle)]">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="font-medium text-[var(--text-primary)]">{user.first_name}</div>
                        <div className="text-sm text-[var(--text-muted)]">ID: {user.id}</div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-[var(--text-primary)]">{user.email}</div>
                        {user.phone && (
                          <div className="text-sm text-[var(--text-muted)]">{user.phone}</div>
                        )}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${trialStatus.className}`}>
                          {trialStatus.status}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-[var(--text-secondary)]">
                        {formatDate(user.created_at)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-[var(--text-secondary)]">
                        {formatDate(user.last_login_at)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right text-sm">
                        <div className="flex items-center justify-end gap-2">
                          <button
                            onClick={() => toggleMembership(user.id, user.is_member)}
                            disabled={isActionLoading}
                            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                              user.is_member
                                ? 'bg-amber-100 text-amber-700 hover:bg-amber-200'
                                : 'bg-emerald-100 text-emerald-700 hover:bg-emerald-200'
                            } ${isActionLoading ? 'opacity-50' : ''}`}
                          >
                            {isActionLoading ? '...' : user.is_member ? 'Revoke' : 'Make Member'}
                          </button>
                          <button
                            onClick={() => deleteUserHandler(user.id, user.email)}
                            disabled={isActionLoading}
                            className={`px-3 py-1.5 rounded-lg text-xs font-medium bg-red-100 text-red-700 hover:bg-red-200 transition-colors ${isActionLoading ? 'opacity-50' : ''}`}
                          >
                            Delete
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {users.length === 0 && (
            <div className="text-center py-12">
              <p className="text-[var(--text-secondary)]">No users found</p>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
