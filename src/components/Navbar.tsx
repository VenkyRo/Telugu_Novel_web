/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { BookOpen, User, Bookmark, LogOut, ShieldAlert, Menu, X, Library } from 'lucide-react';

export const Navbar: React.FC = () => {
  const { user, logout, isAdmin } = useAuth();
  const navigate = useNavigate();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const handleLogout = () => {
    logout();
    setMobileMenuOpen(false);
    navigate('/');
  };

  const navLinks = [
    { label: 'Home', path: '/' },
    { label: 'Library', path: '/novels' },
  ];

  return (
    <nav className="bg-neutral-900 border-b border-neutral-800 text-neutral-100 font-sans tracking-wide sticky top-0 z-40 shadow-md">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Logo Brand */}
          <div className="flex items-center">
            <Link to="/" className="flex items-center gap-2.5 font-display font-extrabold text-xl sm:text-2xl text-transparent bg-clip-text bg-gradient-to-r from-orange-400 to-amber-500 hover:opacity-95 transition-opacity">
              <BookOpen className="w-6 h-6 text-orange-500 shrink-0" />
              <span>Novel Threads</span>
              <span className="text-xs font-mono font-medium tracking-widest text-[#f97316] uppercase border border-orange-500/30 px-1.5 py-0.5 rounded ml-1 hidden sm:inline">
                ENG
              </span>
            </Link>
          </div>

          {/* Desktop Right navigation */}
          <div className="hidden md:flex items-center gap-6">
            <div className="flex gap-4">
              {navLinks.map((link) => (
                <Link
                  key={link.path}
                  to={link.path}
                  className="px-3 py-2 rounded-md text-sm font-medium hover:text-orange-400 transition-colors"
                >
                  {link.label}
                </Link>
              ))}
            </div>

            {/* User Controls Panel */}
            <div className="flex items-center gap-4 pl-4 border-l border-neutral-800">
              {user ? (
                <>
                  {isAdmin && (
                    <Link
                      to="/admin/dashboard"
                      className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-mono font-semibold bg-orange-600/10 text-orange-400 hover:bg-orange-600/20 hover:text-orange-300 border border-orange-500/20 transition-all"
                    >
                      <ShieldAlert className="w-3.5 h-3.5" />
                      ADMIN PANEL
                    </Link>
                  )}
                  
                  <Link
                    to="/profile"
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm font-medium hover:text-orange-400 hover:bg-neutral-800/50 transition-all"
                  >
                    <User className="w-4 h-4 text-orange-500" />
                    <span>{user.name}</span>
                  </Link>
                  
                  <button
                    onClick={handleLogout}
                    className="flex items-center gap-1 px-3 py-1.5 rounded-md text-sm font-medium text-neutral-400 hover:text-rose-400 hover:bg-rose-500/5 transition-all"
                    title="Log Out"
                  >
                    <LogOut className="w-4 h-4" />
                  </button>
                </>
              ) : (
                <div className="flex items-center gap-3">
                  <Link
                    to="/login"
                    className="px-3 py-1.5 rounded-md text-sm font-medium border border-neutral-700/50 text-neutral-300 hover:text-orange-400 hover:border-orange-500/40 transition-all"
                  >
                    Log In
                  </Link>
                  <Link
                    to="/register"
                    className="px-3.5 py-1.5 rounded-md text-sm font-semibold bg-orange-500 hover:bg-orange-600 text-white shadow-md shadow-orange-500/10 transition-all"
                  >
                    Register
                  </Link>
                </div>
              )}
            </div>
          </div>

          {/* Mobile hamburger menu button */}
          <div className="flex md:hidden">
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              type="button"
              className="inline-flex items-center justify-center p-2 rounded-md text-neutral-400 hover:text-neutral-100 hover:bg-neutral-800 focus:outline-none transition-colors"
            >
              {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
            </button>
          </div>
        </div>
      </div>

      {/* Mobile Menu panel */}
      {mobileMenuOpen && (
        <div className="md:hidden bg-neutral-950 border-b border-neutral-800">
          <div className="px-2 pt-2 pb-3 space-y-1 sm:px-3">
            {navLinks.map((link) => (
              <Link
                key={link.path}
                to={link.path}
                onClick={() => setMobileMenuOpen(false)}
                className="block px-3 py-2 rounded-md text-base font-medium hover:text-orange-400 hover:bg-neutral-900 transition-colors"
              >
                {link.label}
              </Link>
            ))}
          </div>

          <div className="pt-4 pb-4 border-t border-neutral-900 px-4">
            {user ? (
              <div className="space-y-2">
                <div className="flex items-center gap-3 mb-3">
                  <div className="bg-neutral-800 w-9 h-9 rounded-full flex items-center justify-center text-orange-500">
                    <User className="w-5 h-5" />
                  </div>
                  <div>
                    <div className="text-sm font-semibold text-neutral-200">{user.name}</div>
                    <div className="text-xs text-neutral-400">{user.email}</div>
                  </div>
                </div>

                {isAdmin && (
                  <Link
                    to="/admin/dashboard"
                    onClick={() => setMobileMenuOpen(false)}
                    className="flex items-center gap-2 w-full px-3 py-2 rounded-md text-sm font-semibold bg-orange-500/10 border border-orange-500/20 text-orange-400"
                  >
                    <ShieldAlert className="w-4 h-4" />
                    ADMIN DASHBOARD
                  </Link>
                )}

                <Link
                  to="/profile"
                  onClick={() => setMobileMenuOpen(false)}
                  className="flex items-center gap-2 w-full px-3 py-2 rounded-md text-base font-medium hover:bg-neutral-900 text-neutral-300"
                >
                  <User className="w-4 h-4 text-orange-500" />
                  My Profile
                </Link>

                <button
                  onClick={handleLogout}
                  className="flex items-center gap-2 w-full px-3 py-2 text-left rounded-md text-base font-medium text-rose-400 hover:bg-rose-500/5 transition-all"
                >
                  <LogOut className="w-4 h-4 text-rose-500" />
                  Log Out
                </button>
              </div>
            ) : (
              <div className="flex flex-col gap-2">
                <Link
                  to="/login"
                  onClick={() => setMobileMenuOpen(false)}
                  className="flex items-center justify-center w-full px-4 py-2 border border-neutral-800 text-center rounded-md text-base font-medium hover:text-orange-400 hover:bg-neutral-900 transition-colors"
                >
                  Log In
                </Link>
                <Link
                  to="/register"
                  onClick={() => setMobileMenuOpen(false)}
                  className="flex items-center justify-center w-full px-4 py-2 bg-orange-500 text-center text-white font-semibold rounded-md text-base transition-colors hover:bg-orange-600"
                >
                  Register
                </Link>
              </div>
            )}
          </div>
        </div>
      )}
    </nav>
  );
};
