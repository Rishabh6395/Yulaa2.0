'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { ThemeToggle } from '@/components/ui/theme-toggle';

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const handleLogin = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });

      const data = await res.json();
      if (!res.ok) {
        setError(data.error || 'Login failed');
        return;
      }

      localStorage.setItem('token', data.token);
      localStorage.setItem('user', JSON.stringify(data.user));
      document.cookie = `token=${data.token}; path=/; max-age=${7 * 24 * 60 * 60}`;
      router.push(data.user.mustResetPassword ? '/change-password' : '/dashboard');
    } catch {
      setError('Network error. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const demoLogin = async (email: string) => {
    setEmail(email);
    setPassword('password123');
    setError('');
    setLoading(true);

    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password: 'password123' }),
      });
      const data = await res.json();
      if (res.ok) {
        localStorage.setItem('token', data.token);
        localStorage.setItem('user', JSON.stringify(data.user));
        document.cookie = `token=${data.token}; path=/; max-age=${7 * 24 * 60 * 60}`;
        router.push(data.user.mustResetPassword ? '/change-password' : '/dashboard');
      } else {
        setError(data.error);
      }
    } catch {
      setError('Network error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex relative">
      {/* Theme toggle — top right corner */}
      <div className="absolute top-4 right-4 z-50">
        <ThemeToggle />
      </div>
      {/* Left panel - branding */}
      <div className="hidden lg:flex lg:w-[45%] bg-gradient-to-br from-brand-700 via-brand-600 to-brand-500 relative overflow-hidden">
        <div className="absolute inset-0 opacity-10">
          <svg width="100%" height="100%" xmlns="http://www.w3.org/2000/svg">
            <defs>
              <pattern id="grid" width="40" height="40" patternUnits="userSpaceOnUse">
                <path d="M 40 0 L 0 0 0 40" fill="none" stroke="white" strokeWidth="0.5"/>
              </pattern>
            </defs>
            <rect width="100%" height="100%" fill="url(#grid)"/>
          </svg>
        </div>
        <div className="relative z-10 flex flex-col justify-between p-12 text-white w-full">
          <div>
            <div className="flex items-center gap-3 mb-2">
              <div className="w-10 h-10 rounded-xl bg-white/20 flex items-center justify-center backdrop-blur-sm">
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M22 10v6M2 10l10-5 10 5-10 5z"/>
                  <path d="M6 12v5c3 3 9 3 12 0v-5"/>
                </svg>
              </div>
              <span className="text-2xl font-display font-bold tracking-tight">Yulaa</span>
            </div>
            <p className="text-white/60 text-sm ml-[52px] -mt-1">Student Management System</p>
          </div>

          <div className="space-y-8">
            <h1 className="text-4xl font-display font-bold leading-tight">
              Everything your<br/>school needs.<br/>
              <span className="text-white/60">One platform.</span>
            </h1>
            <div className="space-y-4">
              {[
                { icon: '📊', text: 'Real-time attendance & analytics' },
                { icon: '💰', text: 'Fee management with online payments' },
                { icon: '👨‍👩‍👧‍👦', text: 'Multi-child, multi-school parent dashboard' },
                { icon: '📚', text: 'Homework tracking & submissions' },
              ].map((item, i) => (
                <div key={i} className="flex items-center gap-3 text-white/80">
                  <span className="text-lg">{item.icon}</span>
                  <span className="text-sm">{item.text}</span>
                </div>
              ))}
            </div>
          </div>

          <p className="text-white/40 text-xs">Multi-tenant SaaS for schools across India</p>
        </div>
      </div>

      {/* Right panel - login form */}
      <div className="flex-1 flex items-center justify-center p-8 bg-white dark:bg-gray-950">
        <div className="w-full max-w-[400px] space-y-8">
          {/* Mobile logo */}
          <div className="lg:hidden flex items-center gap-3 mb-4">
            <div className="w-9 h-9 rounded-xl bg-brand-500 flex items-center justify-center text-white">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M22 10v6M2 10l10-5 10 5-10 5z"/>
                <path d="M6 12v5c3 3 9 3 12 0v-5"/>
              </svg>
            </div>
            <span className="text-xl font-display font-bold text-brand-800 dark:text-brand-300">Yulaa</span>
          </div>

          <div>
            <h2 className="text-2xl font-display font-bold text-gray-900 dark:text-gray-100">Welcome back</h2>
            <p className="text-surface-400 dark:text-gray-500 mt-1">Sign in to your account to continue</p>
          </div>

          <form onSubmit={handleLogin} className="space-y-5">
            {error && (
              <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-xl text-sm animate-fade-in">
                {error}
              </div>
            )}

            <div>
              <label className="label">Email address</label>
              <input
                type="email"
                className="input-field"
                placeholder="you@school.edu.in"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </div>

            <div>
              <label className="label">Password</label>
              <input
                type="password"
                className="input-field"
                placeholder="Enter your password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="btn-primary w-full flex items-center justify-center gap-2 py-3"
            >
              {loading ? (
                <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none"/>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/>
                </svg>
              ) : null}
              {loading ? 'Signing in...' : 'Sign in'}
            </button>
          </form>

          {/* Demo accounts */}
          <div className="space-y-3">
            <div className="flex items-center gap-3">
              <div className="flex-1 h-px bg-surface-200 dark:bg-gray-800"/>
              <span className="text-xs text-surface-400 dark:text-gray-500 font-medium">Quick demo access</span>
              <div className="flex-1 h-px bg-surface-200 dark:bg-gray-800"/>
            </div>
            <div className="grid grid-cols-2 gap-2">
              {[
                { label: 'School Admin', email: 'admin@dps45.edu.in', color: 'bg-indigo-50 text-indigo-700 hover:bg-indigo-100' },
                { label: 'Teacher', email: 'priya.teacher@dps45.edu.in', color: 'bg-emerald-50 text-emerald-700 hover:bg-emerald-100' },
                { label: 'Parent', email: 'parent.singh@gmail.com', color: 'bg-amber-50 text-amber-700 hover:bg-amber-100' },
                { label: 'Super Admin', email: 'superadmin@yulaa.ai', color: 'bg-rose-50 text-rose-700 hover:bg-rose-100' },
              ].map((demo) => (
                <button
                  key={demo.email}
                  onClick={() => demoLogin(demo.email)}
                  className={`${demo.color} px-3 py-2 rounded-xl text-xs font-semibold transition-colors`}
                >
                  {demo.label}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
