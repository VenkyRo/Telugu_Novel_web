/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { useNavigate, Link, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { BookOpen, User, Mail, Lock, ShieldCheck, UserCheck } from 'lucide-react';

interface AuthProps {
  mode: 'login' | 'register' | 'admin-login';
  addToast: (text: string, type: 'success' | 'error' | 'info') => void;
}

export const Auth: React.FC<AuthProps> = ({ mode, addToast }) => {
  const { login, register, user } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [formError, setFormError] = useState('');

  // Determine redirection target (e.g. going back to previous page or admin dashboard)
  const from = location.state?.from?.pathname || (mode === 'admin-login' ? '/admin/dashboard' : '/');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError('');

    // Pre-validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      setFormError('Please enter a valid email address.');
      return;
    }

    if (password.length < 6) {
      setFormError('Password must be at least 6 characters long.');
      return;
    }

    setLoading(true);

    try {
      if (mode === 'register') {
        if (!name || name.trim().length === 0) {
          setFormError('Please enter your full name.');
          setLoading(false);
          return;
        }
        if (password !== confirmPassword) {
          setFormError('Passwords do not match.');
          setLoading(false);
          return;
        }

        const res = await register(name.trim(), email.trim(), password, confirmPassword);
        if (res.success) {
          addToast('Registration Successful!', 'success');
          navigate('/');
        } else {
          setFormError(res.message);
          addToast(res.message, 'error');
        }
      } else {
        // Handle Login (both standard and admin login flows)
        const res = await login(email.trim(), password);
        if (res.success) {
          addToast('Login Successful! Welcome back.', 'success');
          
          if (mode === 'admin-login') {
            navigate('/admin/dashboard');
          } else {
            navigate(from, { replace: true });
          }
        } else {
          setFormError(res.message);
          addToast(res.message, 'error');
        }
      }
    } catch (err: any) {
      setFormError('Connection failed. Please try again.');
      addToast('Platform server connection error.', 'error');
    } finally {
      setLoading(false);
    }
  };

  const titleText = {
    login: 'Reader Login',
    register: 'Create Account',
    'admin-login': 'Admin & Writer Access'
  }[mode];

  return (
    <div className="flex justify-center items-center py-10 px-4 min-h-[calc(100vh-4rem)] bg-neutral-50 sm:px-6">
      <div className="w-full max-w-md bg-white border border-neutral-200/80 rounded-2xl shadow-xl overflow-hidden animate-fade-in">
        {/* Banner */}
        <div className="bg-neutral-900 px-6 py-8 text-center border-b border-orange-500/10">
          <Link to="/" className="inline-flex items-center gap-2 font-display text-2xl font-black text-transparent bg-clip-text bg-gradient-to-r from-orange-400 to-amber-500">
            <BookOpen className="w-7 h-7 text-orange-500" />
            <span>Novel Threads</span>
          </Link>
          <p className="text-neutral-400 text-xs mt-1.5 font-mono tracking-widest uppercase">
            {mode === 'admin-login' ? 'Author Hub & Governance Only' : 'Explore Endless Light Novels'}
          </p>
        </div>

        {/* Content Body */}
        <div className="p-6 sm:p-8">
          <div className="text-center mb-6">
            <h2 className="text-xl font-display font-bold text-neutral-800 flex items-center justify-center gap-2">
              {mode === 'admin-login' ? <ShieldCheck className="w-5 h-5 text-orange-500" /> : <UserCheck className="w-5 h-5 text-orange-500" />}
              {titleText}
            </h2>
            <p className="text-xs text-neutral-500 mt-1">
              {mode === 'admin-login' ? 'Please log in using registered administrative credentials.' : 'Welcome to Novel Threads!'}
            </p>
          </div>

          {formError && (
            <div className="mb-5 p-3.5 rounded-xl bg-rose-50 border border-rose-200 text-sm text-rose-700 flex gap-2 items-start leading-relaxed animate-shake">
              <span className="font-bold underline shrink-0">Error:</span>
              <span className="font-sans">{formError}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Name Input - only for Register */}
            {mode === 'register' && (
              <div>
                <label className="block text-xs font-semibold text-neutral-600 uppercase tracking-wider mb-1.5">
                  Your Full Name *
                </label>
                <div className="relative">
                  <User className="absolute left-3 top-3 h-4 w-4 text-neutral-400" />
                  <input
                    type="text"
                    required
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="Satish Kumar..."
                    className="pl-9 pr-4 py-2.5 w-full text-sm border border-neutral-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-orange-500/40 focus:border-orange-500 bg-neutral-50/50"
                  />
                </div>
              </div>
            )}

            {/* Email Input */}
            <div>
              <label className="block text-xs font-semibold text-neutral-600 uppercase tracking-wider mb-1.5">
                Your Email Address *
              </label>
              <div className="relative">
                <Mail className="absolute left-3 top-3 h-4 w-4 text-neutral-400" />
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="name@example.com"
                  className="pl-9 pr-4 py-2.5 w-full text-sm border border-neutral-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-orange-500/40 focus:border-orange-500 bg-neutral-50/50"
                />
              </div>
            </div>

            {/* Password Input */}
            <div>
              <label className="block text-xs font-semibold text-neutral-600 uppercase tracking-wider mb-1.5">
                Password *
              </label>
              <div className="relative">
                <Lock className="absolute left-3 top-3 h-4 w-4 text-neutral-400" />
                <input
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="pl-9 pr-4 py-2.5 w-full text-sm border border-neutral-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-orange-500/40 focus:border-orange-500 bg-neutral-50/50"
                />
              </div>
            </div>

            {/* Confirm Password - only for Register */}
            {mode === 'register' && (
              <div>
                <label className="block text-xs font-semibold text-neutral-600 uppercase tracking-wider mb-1.5">
                  Confirm Password *
                </label>
                <div className="relative">
                  <Lock className="absolute left-3 top-3 h-4 w-4 text-neutral-400" />
                  <input
                    type="password"
                    required
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="••••••••"
                    className="pl-9 pr-4 py-2.5 w-full text-sm border border-neutral-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-orange-500/40 focus:border-orange-500 bg-neutral-50/50"
                  />
                </div>
              </div>
            )}

            {/* Register/Login Action Button */}
            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 mt-2 bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-600 hover:to-amber-600 text-white font-medium text-sm rounded-xl transition-all shadow-md shadow-orange-500/10 active:scale-[0.99] disabled:opacity-50"
            >
              {loading ? (
                <div className="flex items-center justify-center gap-2">
                  <span className="w-4 h-4 border-2 border-white border-t-transparent animate-spin rounded-full"></span>
                  <span>Processing request...</span>
                </div>
              ) : (
                mode === 'register' ? 'Create Account' : 'Log In'
              )}
            </button>
          </form>

          {/* Quick Footer Links */}
          <div className="mt-6 pt-5 border-t border-neutral-100 flex items-center justify-between text-xs text-neutral-500 font-sans">
            {mode === 'register' ? (
              <>
                <span>Already have an account?</span>
                <Link to="/login" className="text-orange-500 hover:underline font-bold">
                  Login here
                </Link>
              </>
            ) : mode === 'login' ? (
              <>
                <span>New to Novel Threads?</span>
                <Link to="/register" className="text-orange-500 hover:underline font-bold">
                  Register as Reader
                </Link>
              </>
            ) : (
              <>
                <span>Reader Hub Entry</span>
                <Link to="/login" className="text-orange-500 hover:underline font-bold">
                  Standard Reader Login
                </Link>
              </>
            )}
          </div>

          {/* Private Admin Entrypoint helper on standard login page */}
          {mode === 'login' && (
            <div className="mt-4 text-center">
              <Link to="/admin/login" className="text-[10px] uppercase font-mono tracking-wider text-neutral-400 hover:text-orange-500 transition-colors">
                🔐 Author / Admin Governance Entry Point
              </Link>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
