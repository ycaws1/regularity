'use client'
import React, { useState, useEffect } from 'react';
import { Calendar, Settings, LogOut, Bell, TrendingUp, Home } from 'lucide-react';
import { createClient } from '@supabase/supabase-js';

// ============================================================================
// SUPABASE CLIENT CONFIGURATION
// ============================================================================
// Toggle between mock and real Supabase by changing USE_MOCK_SUPABASE
const USE_MOCK_SUPABASE = false;

// Mock Supabase Client
const createMockSupabaseClient = () => {
  let mockUser = null;
  let mockLogs = [];
  let mockProfiles = [];

  return {
    auth: {
      signUp: async ({ email, password }) => {
        await new Promise(resolve => setTimeout(resolve, 500));
        mockUser = { id: 'mock-user-id', email };
        mockProfiles.push({ id: mockUser.id, alert_threshold: 3, created_at: new Date().toISOString() });
        return { data: { user: mockUser }, error: null };
      },
      signInWithPassword: async ({ email, password }) => {
        await new Promise(resolve => setTimeout(resolve, 500));
        mockUser = { id: 'mock-user-id', email };
        return { data: { user: mockUser }, error: null };
      },
      signOut: async () => {
        await new Promise(resolve => setTimeout(resolve, 300));
        mockUser = null;
        return { error: null };
      },
      getSession: async () => {
        return { data: { session: mockUser ? { user: mockUser } : null }, error: null };
      },
      onAuthStateChange: (callback) => {
        return { data: { subscription: { unsubscribe: () => { } } } };
      }
    },
    from: (table) => ({
      select: (columns = '*') => ({
        eq: (column, value) => ({
          single: async () => {
            await new Promise(resolve => setTimeout(resolve, 200));
            if (table === 'profiles') {
              const profile = mockProfiles.find(p => p.id === value);
              return { data: profile || null, error: null };
            }
            return { data: null, error: null };
          },
          maybeSingle: async () => {
            await new Promise(resolve => setTimeout(resolve, 200));
            if (table === 'profiles') {
              const profile = mockProfiles.find(p => p.id === value);
              return { data: profile || null, error: null };
            }
            return { data: null, error: null };
          },
          execute: async () => {
            await new Promise(resolve => setTimeout(resolve, 200));
            if (table === 'logs') {
              const logs = mockLogs.filter(log => log.user_id === value);
              return { data: logs, error: null };
            }
            return { data: [], error: null };
          }
        })
      }),
      insert: (data) => ({
        select: () => ({
          single: async () => {
            await new Promise(resolve => setTimeout(resolve, 200));
            if (table === 'logs') {
              const newLog = { ...data, id: `log-${Date.now()}`, created_at: new Date().toISOString(), count: data.count || 1 };
              mockLogs.push(newLog);
              return { data: newLog, error: null };
            }
            return { data: null, error: null };
          }
        })
      }),
      delete: () => ({
        eq: (column, value) => ({
          eq: (column2, value2) => ({
            execute: async () => {
              await new Promise(resolve => setTimeout(resolve, 200));
              if (table === 'logs') {
                mockLogs = mockLogs.filter(log => !(log.user_id === value && log.log_date === value2));
                return { error: null };
              }
              return { error: null };
            }
          })
        })
      }),
      update: (data) => ({
        eq: (column, value) => ({
          eq: (column2, value2) => ({
            select: () => ({
              execute: async () => {
                await new Promise(resolve => setTimeout(resolve, 200));
                if (table === 'logs') {
                  const log = mockLogs.find(log => log.user_id === value && log.log_date === value2);
                  if (log) {
                    Object.assign(log, data);
                    return { data: [log], error: null };
                  }
                }
                return { data: [], error: null };
              }
            })
          }),
          select: () => ({
            execute: async () => {
              await new Promise(resolve => setTimeout(resolve, 200));
              if (table === 'profiles') {
                const profile = mockProfiles.find(p => p.id === value);
                if (profile) {
                  Object.assign(profile, data);
                  return { data: [profile], error: null };
                }
              }
              return { data: [], error: null };
            }
          }),
          execute: async () => {
            await new Promise(resolve => setTimeout(resolve, 200));
            if (table === 'profiles') {
              const profile = mockProfiles.find(p => p.id === value);
              if (profile) {
                Object.assign(profile, data);
              }
              return { error: null };
            }
            return { error: null };
          }
        })
      })
    })
  };
};

// Real Supabase Client
const createRealSupabaseClient = () => {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
  const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';

  if (!supabaseUrl || !supabaseKey) {
    console.warn('Supabase credentials not found. Using mock client.');
    return createMockSupabaseClient();
  }

  return createClient(supabaseUrl, supabaseKey);
};

const supabase = USE_MOCK_SUPABASE ? createMockSupabaseClient() : createRealSupabaseClient();

// ============================================================================
// MAIN APP COMPONENT
// ============================================================================
export default function RegularityApp() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [view, setView] = useState('home');
  const [isPasswordRecovery, setIsPasswordRecovery] = useState(false);

  useEffect(() => {
    checkUser();
    checkPasswordRecovery();
  }, []);

  const checkUser = async () => {
    const { data } = await supabase.auth.getSession();
    setUser(data.session?.user || null);
    setLoading(false);
  };

  const checkPasswordRecovery = () => {
    // Check if the URL contains a password recovery hash
    const hash = window.location.hash;
    if (hash && hash.includes('type=recovery')) {
      setIsPasswordRecovery(true);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gradient-to-br from-amber-50 to-teal-50">
        <div className="text-teal-600 text-xl">Loading...</div>
      </div>
    );
  }

  if (isPasswordRecovery) {
    return <PasswordResetScreen onResetComplete={() => {
      setIsPasswordRecovery(false);
      window.location.hash = '';
      checkUser();
    }} />;
  }

  if (!user) {
    return <AuthScreen onAuthSuccess={checkUser} />;
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-amber-50 to-teal-50 pb-20">
      <nav className="bg-white shadow-sm border-b border-teal-100">
        <div className="max-w-4xl mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <img
              src="/android-chrome-192x192.png"
              alt="Regularity App Icon"
              className="w-10 h-10 rounded-xl shadow-md"
            />
            <h1 className="text-2xl font-bold text-teal-700">Regularity</h1>
          </div>
          <div className="flex items-center gap-3">
            <span className="text-sm text-gray-600 hidden sm:inline">Welcome back <strong>{user?.email}</strong>!</span>
            <button
              onClick={async () => {
                await supabase.auth.signOut();
                setUser(null);
              }}
              className="p-2 rounded-lg text-gray-600 hover:bg-gray-100"
              title="Log out"
            >
              <LogOut size={20} />
            </button>
          </div>
        </div>
      </nav>

      <main className="max-w-4xl mx-auto px-4 py-8">
        {view === 'home' && <CalendarView userId={user.id} />}
        {view === 'trends' && <TrendsView userId={user.id} />}
        {view === 'settings' && <SettingsView userId={user.id} />}
      </main>

      {/* Bottom Navigation */}
      <nav className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 shadow-lg">
        <div className="max-w-4xl mx-auto px-4">
          <div className="grid grid-cols-3 gap-1">
            <button
              onClick={() => setView('home')}
              className={`flex flex-col items-center py-3 ${view === 'home' ? 'text-teal-600' : 'text-gray-600'
                }`}
            >
              <Home size={24} />
              <span className="text-xs mt-1 font-medium">Home</span>
            </button>
            <button
              onClick={() => setView('trends')}
              className={`flex flex-col items-center py-3 ${view === 'trends' ? 'text-teal-600' : 'text-gray-600'
                }`}
            >
              <TrendingUp size={24} />
              <span className="text-xs mt-1 font-medium">Trends</span>
            </button>
            <button
              onClick={() => setView('settings')}
              className={`flex flex-col items-center py-3 ${view === 'settings' ? 'text-teal-600' : 'text-gray-600'
                }`}
            >
              <Settings size={24} />
              <span className="text-xs mt-1 font-medium">Settings</span>
            </button>
          </div>
        </div>
      </nav>
    </div>
  );
}

// ============================================================================
// AUTH SCREEN
// ============================================================================
function AuthScreen({ onAuthSuccess }) {
  const [isSignUp, setIsSignUp] = useState(false);
  const [isForgotPassword, setIsForgotPassword] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    if (e) e.preventDefault();
    if (!email || !password) {
      setError('Please enter both email and password');
      return;
    }
    setError('');
    setSuccess('');
    setLoading(true);

    try {
      const { error } = isSignUp
        ? await supabase.auth.signUp({ email, password })
        : await supabase.auth.signInWithPassword({ email, password });

      if (error) throw error;
      onAuthSuccess();
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleForgotPassword = async (e) => {
    if (e) e.preventDefault();
    if (!email) {
      setError('Please enter your email address');
      return;
    }
    setError('');
    setSuccess('');
    setLoading(true);

    try {
      // Use environment variable for production URL, fallback to current origin for local dev
      const redirectUrl = process.env.NEXT_PUBLIC_SITE_URL
        ? `${process.env.NEXT_PUBLIC_SITE_URL}`
        : window.location.origin;

      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: redirectUrl,
      });

      if (error) throw error;
      setSuccess('If an account exists with this email, you will receive a password reset link shortly.');
      setEmail('');
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-amber-50 to-teal-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-xl p-8 w-full max-w-md">
        <div className="text-center mb-8">
          <div className="flex justify-center mb-4">
            <img
              src="/android-chrome-192x192.png"
              alt="Regularity App Icon"
              className="w-20 h-20 rounded-2xl shadow-lg"
            />
          </div>
          <h1 className="text-3xl font-bold text-teal-700 mb-2">Regularity</h1>
          <p className="text-gray-600">
            {isForgotPassword ? 'Reset your password' : 'Track your digestive health'}
          </p>
        </div>

        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && (isForgotPassword ? handleForgotPassword(e) : handleSubmit(e))}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg text-gray-900 focus:ring-2 focus:ring-teal-500 focus:border-transparent"
            />
          </div>

          {!isForgotPassword && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Password</label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleSubmit(e)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg text-gray-900 focus:ring-2 focus:ring-teal-500 focus:border-transparent"
              />
            </div>
          )}

          {error && (
            <div className="bg-red-50 text-red-600 p-3 rounded-lg text-sm">
              {error}
            </div>
          )}

          {success && (
            <div className="bg-teal-50 text-teal-700 p-3 rounded-lg text-sm">
              {success}
            </div>
          )}

          <button
            onClick={isForgotPassword ? handleForgotPassword : handleSubmit}
            disabled={loading}
            className="w-full bg-teal-600 text-white py-2 rounded-lg hover:bg-teal-700 disabled:opacity-50 disabled:cursor-not-allowed font-medium"
          >
            {loading ? 'Please wait...' : (isForgotPassword ? 'Send Reset Link' : (isSignUp ? 'Sign Up' : 'Log In'))}
          </button>
        </div>

        <div className="mt-6 text-center space-y-2">
          {!isForgotPassword && (
            <>
              <button
                onClick={() => {
                  setIsForgotPassword(false);
                  setIsSignUp(!isSignUp);
                  setError('');
                  setSuccess('');
                }}
                className="block w-full text-teal-600 hover:text-teal-700 text-sm"
              >
                {isSignUp ? 'Already have an account? Log in' : "Don't have an account? Sign up"}
              </button>
              <button
                onClick={() => {
                  setIsForgotPassword(true);
                  setError('');
                  setSuccess('');
                }}
                className="block w-full text-gray-600 hover:text-gray-700 text-sm"
              >
                Forgot password?
              </button>
            </>
          )}
          {isForgotPassword && (
            <button
              onClick={() => {
                setIsForgotPassword(false);
                setError('');
                setSuccess('');
              }}
              className="block w-full text-teal-600 hover:text-teal-700 text-sm"
            >
              Back to log in
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

// ============================================================================
// PASSWORD RESET SCREEN
// ============================================================================
function PasswordResetScreen({ onResetComplete }) {
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handlePasswordReset = async (e) => {
    if (e) e.preventDefault();

    if (!newPassword || !confirmPassword) {
      setError('Please enter both password fields');
      return;
    }

    if (newPassword.length < 6) {
      setError('Password must be at least 6 characters long');
      return;
    }

    if (newPassword !== confirmPassword) {
      setError('Passwords do not match');
      return;
    }

    setError('');
    setLoading(true);

    try {
      const { error } = await supabase.auth.updateUser({
        password: newPassword
      });

      if (error) throw error;

      alert('Password updated successfully!');
      onResetComplete();
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-amber-50 to-teal-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-xl p-8 w-full max-w-md">
        <div className="text-center mb-8">
          <div className="flex justify-center mb-4">
            <img
              src="/android-chrome-192x192.png"
              alt="Regularity App Icon"
              className="w-20 h-20 rounded-2xl shadow-lg"
            />
          </div>
          <h1 className="text-3xl font-bold text-teal-700 mb-2">Reset Password</h1>
          <p className="text-gray-600">Enter your new password</p>
        </div>

        <form onSubmit={handlePasswordReset} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">New Password</label>
            <input
              type="password"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg text-gray-900 focus:ring-2 focus:ring-teal-500 focus:border-transparent"
              placeholder="At least 6 characters"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Confirm Password</label>
            <input
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handlePasswordReset(e)}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg text-gray-900 focus:ring-2 focus:ring-teal-500 focus:border-transparent"
              placeholder="Re-enter your password"
            />
          </div>

          {error && (
            <div className="bg-red-50 text-red-600 p-3 rounded-lg text-sm">
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-teal-600 text-white py-2 rounded-lg hover:bg-teal-700 disabled:opacity-50 disabled:cursor-not-allowed font-medium"
          >
            {loading ? 'Updating...' : 'Update Password'}
          </button>
        </form>
      </div>
    </div>
  );
}

// ============================================================================
// CALENDAR VIEW
// ============================================================================
function CalendarView({ userId }) {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [logs, setLogs] = useState([]);
  const [selectedDate, setSelectedDate] = useState(null);
  const [loading, setLoading] = useState(true);
  const [threshold, setThreshold] = useState(3);
  const [editCount, setEditCount] = useState(1);

  useEffect(() => {
    fetchLogs();
    fetchProfile();
  }, [userId]);

  const fetchLogs = async () => {
    const { data, error } = await supabase
      .from('logs')
      .select('*')
      .eq('user_id', userId);

    if (!error && data) {
      setLogs(data);
    }
    setLoading(false);
  };

  const fetchProfile = async () => {
    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', userId)
      .single();

    if (!error && data) {
      setThreshold(data.alert_threshold || 3);
    }
  };

  const getDaysInMonth = (date) => {
    const year = date.getFullYear();
    const month = date.getMonth();
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const daysInMonth = lastDay.getDate();
    const startingDayOfWeek = firstDay.getDay();

    return { daysInMonth, startingDayOfWeek };
  };

  const isDateLogged = (day) => {
    const dateStr = formatDate(new Date(currentDate.getFullYear(), currentDate.getMonth(), day));
    return logs.some(log => log.log_date === dateStr);
  };

  const getLogForDate = (day) => {
    const dateStr = formatDate(new Date(currentDate.getFullYear(), currentDate.getMonth(), day));
    return logs.find(log => log.log_date === dateStr);
  };

  const formatDate = (date) => {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };

  const addLog = async (day) => {
    const date = new Date(currentDate.getFullYear(), currentDate.getMonth(), day);
    const dateStr = formatDate(date);

    const { data, error } = await supabase
      .from('logs')
      .insert({
        user_id: userId,
        log_date: dateStr,
        count: 1
      })
      .select()
      .single();

    if (!error && data) {
      setLogs([...logs, data]);
    }
    setSelectedDate(null);
    setEditCount(1);
  };

  const deleteLog = async (day) => {
    const date = new Date(currentDate.getFullYear(), currentDate.getMonth(), day);
    const dateStr = formatDate(date);

    await supabase
      .from('logs')
      .delete()
      .eq('user_id', userId)
      .eq('log_date', dateStr);

    setLogs(logs.filter(log => log.log_date !== dateStr));
    setSelectedDate(null);
    setEditCount(1);
  };

  const updateLogCount = async (day) => {
    const date = new Date(currentDate.getFullYear(), currentDate.getMonth(), day);
    const dateStr = formatDate(date);

    const { data, error } = await supabase
      .from('logs')
      .update({ count: editCount })
      .eq('user_id', userId)
      .eq('log_date', dateStr)
      .select();

    if (error) {
      console.error('Error updating log count:', error);
      alert('Failed to update log count. Please check console for details.');
      return;
    }

    // Refetch logs to ensure we have the latest data
    await fetchLogs();
    setSelectedDate(null);
    setEditCount(1);
  };

  const getLastLogDate = () => {
    if (logs.length === 0) return null;
    const sortedLogs = [...logs].sort((a, b) =>
      b.log_date.localeCompare(a.log_date)
    );
    return sortedLogs[0];
  };

  const getDaysSinceLastLog = () => {
    const lastLog = getLastLogDate();
    if (!lastLog) return null;
    const [year, month, day] = lastLog.log_date.split('-').map(Number);
    const lastDateLocal = new Date(year, month - 1, day);
    const today = new Date();
    const todayLocal = new Date(today.getFullYear(), today.getMonth(), today.getDate());
    const diffTime = todayLocal.getTime() - lastDateLocal.getTime();
    const diffDays = Math.round(diffTime / (1000 * 60 * 60 * 24));
    return diffDays;
  };

  const daysSinceLastLog = getDaysSinceLastLog();
  const showAlert = daysSinceLastLog !== null && daysSinceLastLog >= threshold;

  const { daysInMonth, startingDayOfWeek } = getDaysInMonth(currentDate);
  const monthName = currentDate.toLocaleString('default', { month: 'long', year: 'numeric' });

  const changeMonth = (delta) => {
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + delta, 1));
  };

  if (loading) {
    return <div className="text-center text-gray-600">Loading calendar...</div>;
  }

  return (
    <div>
      {showAlert && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6 flex items-start gap-3">
          <Bell className="text-red-600 mt-1" size={20} />
          <div>
            <h3 className="font-semibold text-red-900">Constipation Alert</h3>
            <p className="text-red-800 text-sm">
              It's been <strong>{daysSinceLastLog} days</strong> since your last log
              (recorded on {getLastLogDate()?.log_date}).
            </p>
            <p className="text-red-700 text-xs mt-1 italic">
              Threshold: {threshold} days
            </p>
          </div>
        </div>
      )}

      {logs.length === 0 && (
        <div className="bg-teal-50 border border-teal-200 rounded-lg p-6 mb-6 text-center">
          <p className="text-teal-800">Tap today's date to log your first entry</p>
        </div>
      )}

      <div className="bg-white rounded-2xl shadow-lg p-6">
        <div className="flex items-center justify-between mb-6">
          <button
            onClick={() => changeMonth(-1)}
            className="px-4 py-2 text-teal-600 hover:bg-teal-50 rounded-lg"
          >
            ←
          </button>
          <h2 className="text-xl font-semibold text-gray-800">{monthName}</h2>
          <button
            onClick={() => changeMonth(1)}
            className="px-4 py-2 text-teal-600 hover:bg-teal-50 rounded-lg"
          >
            →
          </button>
        </div>

        <div className="grid grid-cols-7 gap-2 mb-2">
          {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(day => (
            <div key={day} className="text-center text-sm font-medium text-gray-600 py-2">
              {day}
            </div>
          ))}
        </div>

        <div className="grid grid-cols-7 gap-2">
          {[...Array(startingDayOfWeek)].map((_, i) => (
            <div key={`empty-${i}`} />
          ))}
          {[...Array(daysInMonth)].map((_, i) => {
            const day = i + 1;
            const isLogged = isDateLogged(day);
            const isToday = new Date().getDate() === day &&
              new Date().getMonth() === currentDate.getMonth() &&
              new Date().getFullYear() === currentDate.getFullYear();

            const logData = getLogForDate(day);

            return (
              <button
                key={day}
                onClick={() => {
                  setSelectedDate(day);
                  const existingLog = getLogForDate(day);
                  setEditCount(existingLog ? existingLog.count : 1);
                }}
                className={`aspect-square rounded-lg flex flex-col items-center justify-center text-sm font-medium relative
                  ${isLogged ? 'bg-teal-100 text-teal-700 hover:bg-teal-200' : 'bg-gray-50 text-gray-700 hover:bg-gray-100'}
                  ${isToday ? 'ring-2 ring-teal-500' : ''}
                `}
              >
                <span className={isLogged && logData?.count ? 'text-xs' : ''}>{day}</span>
                {isLogged && logData?.count && (
                  <span className="text-xs font-bold text-teal-800">×{logData.count}</span>
                )}
              </button>
            );
          })}
        </div>
      </div>

      {selectedDate && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl p-6 max-w-sm w-full">
            <h3 className="text-lg font-semibold mb-4 text-gray-800">
              {monthName.split(' ')[0]} {selectedDate}
            </h3>

            {isDateLogged(selectedDate) ? (
              <>
                <p className="text-gray-600 mb-4">Edit log count:</p>
                <div className="flex items-center justify-center gap-4 mb-6">
                  <button
                    onClick={() => setEditCount(Math.max(1, editCount - 1))}
                    className="w-12 h-12 bg-gray-200 rounded-lg hover:bg-gray-300 text-2xl font-bold text-gray-700"
                  >
                    −
                  </button>
                  <span className="text-3xl font-bold text-gray-800 w-12 text-center">
                    {editCount}
                  </span>
                  <button
                    onClick={() => setEditCount(editCount + 1)}
                    className="w-12 h-12 bg-gray-200 rounded-lg hover:bg-gray-300 text-2xl font-bold text-gray-700"
                  >
                    +
                  </button>
                </div>
                <div className="flex flex-col gap-3">
                  <button
                    onClick={() => updateLogCount(selectedDate)}
                    className="w-full bg-teal-600 text-white py-2 rounded-lg hover:bg-teal-700 font-medium"
                  >
                    Change Log Count
                  </button>
                  <button
                    onClick={() => deleteLog(selectedDate)}
                    className="w-full bg-red-600 text-white py-2 rounded-lg hover:bg-red-700 font-medium"
                  >
                    Delete Log
                  </button>
                  <button
                    onClick={() => {
                      setSelectedDate(null);
                      setEditCount(1);
                    }}
                    className="w-full bg-gray-200 text-gray-700 py-2 rounded-lg hover:bg-gray-300 font-medium"
                  >
                    Cancel
                  </button>
                </div>
              </>
            ) : (
              <>
                <p className="text-gray-600 mb-6">Log entry for this date?</p>
                <div className="flex gap-3">
                  <button
                    onClick={() => addLog(selectedDate)}
                    className="flex-1 bg-teal-600 text-white py-2 rounded-lg hover:bg-teal-700 font-medium"
                  >
                    Add Log
                  </button>
                  <button
                    onClick={() => {
                      setSelectedDate(null);
                      setEditCount(1);
                    }}
                    className="flex-1 bg-gray-200 text-gray-700 py-2 rounded-lg hover:bg-gray-300 font-medium"
                  >
                    Cancel
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

// ============================================================================
// TRENDS VIEW
// ============================================================================
function TrendsView({ userId }) {
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [timeRange, setTimeRange] = useState(7);
  const [hoveredBar, setHoveredBar] = useState(null);

  useEffect(() => {
    fetchLogs();
  }, [userId, timeRange]); // Refetch or re-process when range changes

  const fetchLogs = async () => {
    const { data, error } = await supabase
      .from('logs')
      .select('*')
      .eq('user_id', userId);

    if (!error && data) {
      setLogs(data);
    }
    setLoading(false);
  };

  const getChartData = () => {
    const now = new Date();
    const startDate = new Date(now);
    startDate.setDate(startDate.getDate() - timeRange + 1);

    const dateMap = {};

    for (let i = 0; i < timeRange; i++) {
      const date = new Date(startDate);
      date.setDate(date.getDate() + i);
      const dateStr = formatDateForChart(date);
      const logDateStr = formatLogDate(date);
      dateMap[dateStr] = { date: dateStr, hasLog: 0, logDate: logDateStr, count: 0 };
    }

    logs.forEach(log => {
      const logDate = new Date(log.log_date + 'T00:00:00');
      if (logDate >= startDate && logDate <= now) {
        const dateStr = formatDateForChart(logDate);
        if (dateMap[dateStr]) {
          dateMap[dateStr].hasLog = 1;
          dateMap[dateStr].count = log.count || 1;
        }
      }
    });

    return Object.values(dateMap);
  };

  const formatDateForChart = (date) => {
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${month}/${day}`;
  };

  const formatLogDate = (date) => {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };

  const chartData = getChartData();
  const totalDaysLogged = chartData.reduce((sum, d) => sum + d.hasLog, 0);
  const percentageLogged = ((totalDaysLogged / timeRange) * 100).toFixed(0);
  const maxCount = Math.max(...chartData.map(d => d.count), 1);
  
  const consistencyValue = (totalDaysLogged / timeRange) * 100;
  const getConsistencyColor = (val) => {
    if (val < 20) return { bg: 'bg-red-50', text: 'text-red-700', deepText: 'text-red-900' };
    if (val < 50) return { bg: 'bg-yellow-50', text: 'text-yellow-700', deepText: 'text-yellow-900' };
    return { bg: 'bg-teal-50', text: 'text-teal-700', deepText: 'text-teal-900' };
  };
  const colors = getConsistencyColor(consistencyValue);

  if (loading) {
    return <div className="text-center text-gray-600">Loading trends...</div>;
  }

  return (
    <div>
      <div className="bg-white rounded-2xl shadow-lg p-6 mb-6">
        <h2 className="text-2xl font-bold text-gray-800 mb-6">Activity Trends</h2>

        <div className="flex gap-2 mb-6">
          {[7, 14, 30].map(days => (
            <button
              key={days}
              onClick={() => setTimeRange(days)}
              className={`px-4 py-2 rounded-lg font-medium ${timeRange === days
                  ? 'bg-teal-600 text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
            >
              {days} days
            </button>
          ))}
        </div>

        <div className="grid grid-cols-2 gap-4 mb-6">
          <div className="bg-teal-50 rounded-lg p-4">
            <p className="text-sm text-teal-700 font-medium">Days Logged</p>
            <p className="text-3xl font-bold text-teal-900">{totalDaysLogged}/{timeRange}</p>
          </div>
          <div className={`${colors.bg} rounded-lg p-4 transition-colors duration-500`}>
            <p className={`text-sm ${colors.text} font-medium`}>Consistency</p>
            <p className={`text-3xl font-bold ${colors.deepText}`}>{percentageLogged}%</p>
          </div>
          {/* <div className="bg-amber-50 rounded-lg p-4">
            <p className="text-sm text-amber-700 font-medium">Consistency</p>
            <p className="text-3xl font-bold text-amber-900">{percentageLogged}%</p>
          </div> */}
        </div>

        <div className="relative h-64 bg-gray-50 rounded-lg p-4">
          {/* Y-axis labels based on maxCount */}
          <div className="absolute left-0 top-0 bottom-8 flex flex-col justify-between text-xs text-gray-600 pr-2 w-6 text-right">
            <span>{maxCount}</span>
            <span>{Math.floor(maxCount / 2)}</span>
            <span>0</span>
          </div>

          {/* Chart area */}
          <div className="ml-8 h-full pb-8 relative">
            {/* Grid lines */}
            <div className="absolute inset-0 flex flex-col justify-between pointer-events-none">
              <div className="border-t border-gray-200 w-full"></div>
              <div className="border-t border-dashed border-gray-200 w-full"></div>
              <div className="border-t border-gray-300 w-full"></div>
            </div>

            {/* Bar chart */}
            <div className="absolute inset-0 flex items-end justify-between gap-1 px-2">
              {chartData.map((item, index) => {
                // Calculate height as a percentage of the maxCount
                const barHeight = item.count > 0 ? (item.count / maxCount) * 100 : 0;

                return (
                  <div
                    key={index}
                    className="flex-1 relative h-full"
                    style={{ minWidth: '4px' }}
                  >
                    <div className="absolute bottom-0 left-0 right-0 flex items-end h-full">
                      <div
                        onMouseEnter={() => setHoveredBar(index)}
                        onMouseLeave={() => setHoveredBar(null)}
                        className={`w-full rounded-t transition-all duration-500 ease-out ${item.count > 0 ? 'bg-teal-500 hover:bg-teal-600 cursor-pointer' : 'bg-transparent'
                          }`}
                        style={{
                          height: `${barHeight}%`
                        }}
                      />
                    </div>
                    {hoveredBar === index && item.count > 0 && (
                      <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 bg-gray-900 text-white text-xs rounded px-2 py-1 whitespace-nowrap z-10 pointer-events-none">
                        <div className="font-semibold">{item.logDate}</div>
                        <div>Count: {item.count}</div>
                        <div className="absolute top-full left-1/2 transform -translate-x-1/2 border-4 border-transparent border-t-gray-900"></div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          {/* X-axis labels */}
          <div className="flex justify-between ml-8 text-xs text-gray-600">
            <span>{chartData[0]?.date}</span>
            <span>{chartData[Math.floor(chartData.length / 2)]?.date}</span>
            <span>{chartData[chartData.length - 1]?.date}</span>
          </div>
        </div>
      </div>

      {logs.length === 0 && (
        <div className="bg-gray-50 rounded-lg p-6 text-center">
          <p className="text-gray-600">No data yet. Start logging to see your trends!</p>
        </div>
      )}
    </div>
  );
}


// ============================================================================
// SETTINGS VIEW
// ============================================================================
function SettingsView({ userId }) {
  const [threshold, setThreshold] = useState(3);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    fetchProfile();
  }, [userId]);

  const fetchProfile = async () => {
    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', userId)
      .maybeSingle();

    if (!error && data) {
      setThreshold(data.alert_threshold || 3);
    }
    setLoading(false);
  };

  const saveThreshold = async () => {
    setSaving(true);
    setSaved(false);

    await supabase
      .from('profiles')
      .update({ alert_threshold: threshold })
      .eq('id', userId);

    setSaving(false);
    setSaved(true);
    setTimeout(() => setSaved(false), 3000);
  };

  if (loading) {
    return <div className="text-center text-gray-600">Loading settings...</div>;
  }

  return (
    <div className="bg-white rounded-2xl shadow-lg p-6 max-w-2xl">
      <h2 className="text-2xl font-bold text-gray-800 mb-6">Settings</h2>

      <div className="space-y-6">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Constipation Alert Threshold (days)
          </label>
          <p className="text-sm text-gray-600 mb-3">
            You'll receive an alert if you haven't logged an entry in this many days.
          </p>
          <input
            type="number"
            min="1"
            max="14"
            value={threshold}
            onChange={(e) => setThreshold(parseInt(e.target.value))}
            className="w-32 px-4 py-2 border border-gray-300 rounded-lg text-gray-900 focus:ring-2 focus:ring-teal-500"
          />
        </div>

        <button
          onClick={saveThreshold}
          disabled={saving}
          className="bg-teal-600 text-white px-6 py-2 rounded-lg hover:bg-teal-700 disabled:opacity-50 disabled:cursor-not-allowed font-medium"
        >
          {saving ? 'Saving...' : 'Save Settings'}
        </button>

        {saved && (
          <div className="bg-teal-50 text-teal-700 p-3 rounded-lg text-sm">
            Settings saved successfully!
          </div>
        )}
      </div>

      <div className="mt-8 pt-6 border-t border-gray-200">
        <h3 className="font-semibold text-gray-800 mb-2">About Regularity</h3>
        <p className="text-sm text-gray-600">
          This app helps you track your digestive health privately and securely. All data is encrypted and only accessible by you.
        </p>
      </div>
    </div>
  );
}