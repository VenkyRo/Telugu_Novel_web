/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useEffect, useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { Users, Search, Trash2, ArrowLeft } from 'lucide-react';
import { User } from '../../types';

interface AdminUsersProps {
  addToast: (text: string, type: 'success' | 'error' | 'info') => void;
}

export const AdminUsers: React.FC<AdminUsersProps> = ({ addToast }) => {
  const { token, user: currentUser } = useAuth();
  const navigate = useNavigate();

  const [users, setUsers] = useState<User[]>([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);

  const fetchUsers = async () => {
    if (!token) return;
    setLoading(true);
    try {
      const res = await fetch(`/api/admin/users?search=${encodeURIComponent(search)}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await res.json();
      if (data.success && data.users) {
        setUsers(data.users);
      } else {
        addToast(data.message || 'Error loading users catalogue.', 'error');
      }
    } catch (err) {
      console.error('Fetch users error:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUsers();
  }, [token, search]);

  // Ban User with dynamic reason prompt (Enforces Criteria #12: "Ban a user. Add a required ban reason.")
  const handleBanUser = async (user: User) => {
    if (user._id === currentUser?._id) {
      addToast('Self ban is restricted!', 'error');
      return;
    }

    const reason = window.prompt(`Please enter the reason for banning the user "${user.name}":`);
    if (reason === null) return; // User closed prompt

    if (!reason.trim()) {
      addToast('All bans require a specified reason.', 'error');
      return;
    }

    try {
      const res = await fetch(`/api/admin/users/${user._id}/ban`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ banReason: reason.trim() })
      });
      const data = await res.json();

      if (data.success) {
        addToast(`User "${user.name}" was successfully banned.`, 'success');
        fetchUsers();
      } else {
        addToast(data.message || 'Error banning user.', 'error');
      }
    } catch (err) {
      console.error('Ban user error:', err);
    }
  };

  // Unban user
  const handleUnbanUser = async (user: User) => {
    try {
      const res = await fetch(`/api/admin/users/${user._id}/unban`, {
        method: 'PATCH',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await res.json();

      if (data.success) {
        addToast(`Ban on user "${user.name}" was lifted successfully.`, 'success');
        fetchUsers();
      } else {
        addToast(data.message || 'Unban call error.', 'error');
      }
    } catch (err) {
      console.error('Unban user error:', err);
    }
  };

  // Delete User with confirmation prompt check
  const handleDeleteUser = async (user: User) => {
    if (user._id === currentUser?._id) {
      addToast('You cannot delete your own account.', 'error');
      return;
    }

    const checkText = `Are you sure you want to permanently delete the account of "${user.name}"?`;
    if (!window.confirm(checkText)) {
      return;
    }

    try {
      const res = await fetch(`/api/admin/users/${user._id}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await res.json();

      if (data.success) {
        addToast('Reader account deleted successfully.', 'success');
        setUsers(users.filter(u => u._id !== user._id));
      } else {
        addToast(data.message || 'Deletion failed.', 'error');
      }
    } catch (err) {
      console.error('Delete user error:', err);
    }
  };

  return (
    <div className="bg-neutral-900 text-neutral-100 min-h-screen py-10 font-sans">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-6">
        
        {/* BAN SHEET TOP BAR */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-neutral-950/40 p-5 rounded-2xl border border-neutral-800">
          <div className="flex items-center gap-2.5">
            <Users className="w-6.5 h-6.5 text-[#f97316] shrink-0" />
            <div>
              <h1 className="text-xl sm:text-2xl font-display font-black text-white">
                Reader Account Management
              </h1>
              <p className="text-xs text-neutral-400 mt-0.5">Search, ban, regulate, or delete registered reader accounts from the database.</p>
            </div>
          </div>

          <Link
            to="/admin/dashboard"
            className="flex items-center gap-1.5 px-3 py-2 bg-neutral-800 hover:bg-neutral-700 text-neutral-200 rounded-xl text-xs font-semibold border border-neutral-700/60 transition-all shadow shrink-0"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to Dashboard
          </Link>
        </div>

        {/* SEARCH CRITERIA CONSOLE */}
        <div className="bg-white/5 border border-white/5 p-4 rounded-xl relative flex items-center max-w-md">
          <Search className="absolute left-3.5 w-4.5 h-4.5 text-neutral-500" />
          <input
            type="text"
            placeholder="Search by reader name or email..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full text-sm font-sans pl-9 pr-4 py-2 border border-neutral-700 bg-neutral-900 rounded-xl focus:outline-none focus:ring-2 focus:ring-orange-500/30 text-white"
          />
        </div>

        {/* --- USERS INDEX TABULAR GRID --- */}
        {loading ? (
          <div className="flex flex-col items-center justify-center py-24">
            <div className="w-8 h-8 border-3 border-orange-500 border-t-transparent animate-spin rounded-full"></div>
            <p className="text-neutral-500 text-xs mt-3.5 font-medium">Loading reader metadata...</p>
          </div>
        ) : users.length === 0 ? (
          <p className="text-center py-16 text-xs text-neutral-500 italic bg-neutral-950/40 rounded-xl border border-dashed border-neutral-800">
            No registered readers found.
          </p>
        ) : (
          <div className="bg-neutral-950/60 border border-neutral-800 rounded-2xl overflow-hidden shadow-xl animate-fade-in">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-neutral-950/90 border-b border-neutral-800 text-xs font-mono font-bold text-neutral-400 uppercase tracking-widest">
                    <th className="p-4 sm:p-5">User Full Name</th>
                    <th className="p-4 sm:p-5">Email Address</th>
                    <th className="p-4 sm:p-5">Joined Date</th>
                    <th className="p-4 sm:p-5">Account Status</th>
                    <th className="p-4 sm:p-5">Ban Reason</th>
                    <th className="p-4 sm:p-5 text-center">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-neutral-800/80 text-sm">
                  {users.map((item) => (
                    <tr key={item._id} className="hover:bg-neutral-900/30 transition-colors">
                      <td className="p-4 font-sans font-bold text-neutral-200">
                        {item.name}
                        {item._id === currentUser?._id && (
                          <span className="ml-1.5 px-1.5 py-0.5 rounded font-mono text-[8px] tracking-wider font-extrabold bg-[#f97316]/20 text-orange-400 border border-orange-500/10">YOU</span>
                        )}
                      </td>

                      <td className="p-4 font-mono text-xs text-neutral-300">
                        {item.email}
                      </td>

                      <td className="p-4 font-mono text-xs text-neutral-400">
                        {new Date(item.createdAt).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' })}
                      </td>

                      <td className="p-4 text-xs font-bold">
                        {item.isBanned ? (
                          <span className="px-2.5 py-1 rounded bg-rose-950/65 text-rose-400 border border-rose-900/40">Banned</span>
                        ) : (
                          <span className="px-2.5 py-1 rounded bg-emerald-950/65 text-emerald-400 border border-emerald-900/40">Active Reader</span>
                        )}
                      </td>

                      {/* Ban reason column indicator */}
                      <td className="p-4 text-xs font-sans text-neutral-400 max-w-xs truncate" title={item.banReason}>
                        {item.isBanned ? item.banReason || 'No reason specified' : '—'}
                      </td>

                      <td className="p-4 text-center shrink-0">
                        <div className="flex items-center justify-center gap-2">
                          {item.isBanned ? (
                            <button
                              onClick={() => handleUnbanUser(item)}
                              className="px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-xs transition-colors cursor-pointer shrink-0"
                              title="Unban"
                            >
                              Unban
                            </button>
                          ) : (
                            <button
                              onClick={() => handleBanUser(item)}
                              className="px-3 py-1.5 rounded-lg bg-rose-600/15 hover:bg-rose-600 hover:text-white text-rose-400 font-semibold text-xs transition-all cursor-pointer shrink-0"
                              title="Ban"
                            >
                              Ban User
                            </button>
                          )}

                          <button
                            onClick={() => handleDeleteUser(item)}
                            className="p-2 rounded-lg bg-neutral-800 hover:bg-rose-600 text-neutral-400 hover:text-white transition-colors cursor-pointer shrink-0"
                            title="Delete Account"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

      </div>
    </div>
  );
};
