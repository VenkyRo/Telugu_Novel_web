/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import { Navbar } from './components/Navbar';
import { ToastContainer, ToastMessage } from './components/Toast';

// Public routed screens
import { Home } from './pages/public/Home';
import { Browse } from './pages/public/Browse';
import { NovelDetails } from './pages/public/NovelDetails';
import { ChapterRead } from './pages/public/ChapterRead';
import { Auth } from './pages/Auth';
import { Profile } from './pages/public/Profile';

// Admin routed screens
import { AdminDashboard } from './pages/admin/AdminDashboard';
import { AdminNovels } from './pages/admin/AdminNovels';
import { AdminChapters } from './pages/admin/AdminChapters';
import { AdminUsers } from './pages/admin/AdminUsers';
import { AdminComments } from './pages/admin/AdminComments';

// A strict guard that checks if the active session matches admin privileges
const AdminRoute: React.FC<{ children: React.ReactNode; addToast: any }> = ({ children, addToast }) => {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen bg-neutral-900 flex flex-col justify-center items-center font-mono text-xs text-orange-500">
        <div className="w-8 h-8 border-2 border-orange-500 border-t-transparent animate-spin rounded-full mb-3"></div>
        <span>CHECKING GOVERNANCE PRIVILEGES...</span>
      </div>
    );
  }

  if (!user || user.role !== 'ADMIN') {
    return (
      <div className="min-h-screen bg-neutral-900 text-neutral-100 flex flex-col justify-center items-center text-center p-6 font-sans">
        <div className="w-16 h-16 bg-rose-500/10 border border-rose-500/20 text-rose-500 rounded-2xl flex items-center justify-center text-2xl font-bold mb-4">
          403
        </div>
        <h2 className="text-xl sm:text-2xl font-display font-extrabold text-white">Permission Denied (Forbidden Access)</h2>
        <p className="text-xs sm:text-sm text-neutral-400 mt-2 max-w-sm leading-relaxed font-sans">
          Sorry! You do not have sufficient permissions to view this section. This area is restricted to authors or administrators only.
        </p>
        <a
          href="/"
          className="mt-6 px-5 py-2.5 bg-orange-500 hover:bg-orange-600 text-white font-semibold text-xs rounded-xl shadow-md transition-all shrink-0"
        >
          Return to Home
        </a>
      </div>
    );
  }

  return <>{children}</>;
};

// Guard protecting standard Reader routes (e.g. My Profile, Bookmarks list)
const ProtectedRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen bg-neutral-50 flex flex-col justify-center items-center font-sans text-xs text-neutral-500">
        <div className="w-6 h-6 border-2 border-orange-500 border-t-transparent animate-spin rounded-full mb-2"></div>
        <span>Verifying active login session...</span>
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  return <>{children}</>;
};

export default function App() {
  const [toasts, setToasts] = useState<ToastMessage[]>([]);

  // Globally distributed toast alerts helper
  const addToast = (text: string, type: 'success' | 'error' | 'info' = 'info') => {
    const id = Date.now().toString() + Math.random().toString();
    setToasts((prev) => [...prev, { id, text, type }]);
  };

  const handleCloseToast = (id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  };

  return (
    <AuthProvider>
      <Router>
        <div className="flex flex-col min-h-screen bg-neutral-50 font-sans">
          
          {/* Main Global Header */}
          <Navbar />

          {/* Main dynamic path viewport context */}
          <div className="flex-1">
            <Routes>
              {/* --- PUBLIC PORTAL PATHS --- */}
              <Route path="/" element={<Home addToast={addToast} />} />
              <Route path="/novels" element={<Browse addToast={addToast} />} />
              <Route path="/novels/:slug" element={<NovelDetails addToast={addToast} />} />
              <Route path="/read/:chapterId" element={<ChapterRead addToast={addToast} />} />
              
              {/* --- VISITOR AUTH HUBS --- */}
              <Route path="/login" element={<Auth mode="login" addToast={addToast} />} />
              <Route path="/register" element={<Auth mode="register" addToast={addToast} />} />
              <Route path="/admin/login" element={<Auth mode="admin-login" addToast={addToast} />} />

              {/* --- REGISTERED READER PROFILE --- */}
              <Route
                path="/profile"
                element={
                  <ProtectedRoute>
                    <Profile addToast={addToast} />
                  </ProtectedRoute>
                }
              />

              {/* --- PROTECTED ADMINISTRATION BOARD SHIELD --- */}
              <Route
                path="/admin/dashboard"
                element={
                  <AdminRoute addToast={addToast}>
                    <AdminDashboard addToast={addToast} />
                  </AdminRoute>
                }
              />

              <Route
                path="/admin/novels"
                element={
                  <AdminRoute addToast={addToast}>
                    <AdminNovels addToast={addToast} />
                  </AdminRoute>
                }
              />

              <Route
                path="/admin/novels/:novelId/chapters"
                element={
                  <AdminRoute addToast={addToast}>
                    <AdminChapters addToast={addToast} />
                  </AdminRoute>
                }
              />

              <Route
                path="/admin/users"
                element={
                  <AdminRoute addToast={addToast}>
                    <AdminUsers addToast={addToast} />
                  </AdminRoute>
                }
              />

              <Route
                path="/admin/comments"
                element={
                  <AdminRoute addToast={addToast}>
                    <AdminComments addToast={addToast} />
                  </AdminRoute>
                }
              />

              {/* Catch all fallback handler redirects readers back home */}
              <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
          </div>

          {/* Global Sticky footer card decoration */}
          <footer className="bg-neutral-900 border-t border-neutral-800 text-neutral-400 py-8 text-center text-xs font-mono shrink-0">
            <div className="max-w-7xl mx-auto px-4 space-y-2">
              <p className="font-sans text-neutral-300 font-bold">Novel Threads — Elegant Light Novel Hub</p>
              <p>Designed with pristine eye-care reader formats. © {new Date().getFullYear()} All Rights Reserved.</p>
              <p className="border border-neutral-800/80 rounded inline-block px-2.5 py-1 mt-2 text-[10px] text-neutral-500">
                Authorized Governance Console
              </p>
            </div>
          </footer>

          {/* Floating dynamic popups container */}
          <ToastContainer toasts={toasts} onClose={handleCloseToast} />

        </div>
      </Router>
    </AuthProvider>
  );
}
