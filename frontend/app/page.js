'use client'
import React, { useState, useEffect } from 'react';
import { Calendar, Settings, LogOut, Check, X, Bell } from 'lucide-react';
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
              const newLog = { ...data, id: `log-${Date.now()}`, created_at: new Date().toISOString() };
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

  // Note: In a real Next.js app, you would import from '@supabase/supabase-js'
  // For this artifact, we'll fall back to mock
  // return createMockSupabaseClient();
  return createClient(supabaseUrl, supabaseKey);
};

const supabase = USE_MOCK_SUPABASE ? createMockSupabaseClient() : createRealSupabaseClient();

// ============================================================================
// MAIN APP COMPONENT
// ============================================================================
export default function RegularityApp() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [view, setView] = useState('calendar'); // 'calendar', 'settings', 'auth'

  useEffect(() => {
    checkUser();
  }, []);

  const checkUser = async () => {
    const { data } = await supabase.auth.getSession();
    setUser(data.session?.user || null);
    setLoading(false);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gradient-to-br from-amber-50 to-teal-50">
        <div className="text-teal-600 text-xl">Loading...</div>
      </div>
    );
  }

  if (!user) {
    return <AuthScreen onAuthSuccess={checkUser} />;
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-amber-50 to-teal-50">
      <nav className="bg-white shadow-sm border-b border-teal-100">
        <div className="max-w-4xl mx-auto px-4 py-4 flex items-center justify-between">
          <h1 className="text-2xl font-bold text-teal-700">Regularity</h1>
          <div className="flex gap-2">
            <button
              onClick={() => setView('calendar')}
              className={`p-2 rounded-lg ${view === 'calendar' ? 'bg-teal-100 text-teal-700' : 'text-gray-600 hover:bg-gray-100'}`}
            >
              <Calendar size={20} />
            </button>
            <button
              onClick={() => setView('settings')}
              className={`p-2 rounded-lg ${view === 'settings' ? 'bg-teal-100 text-teal-700' : 'text-gray-600 hover:bg-gray-100'}`}
            >
              <Settings size={20} />
            </button>
            <button
              onClick={async () => {
                await supabase.auth.signOut();
                setUser(null);
              }}
              className="p-2 rounded-lg text-gray-600 hover:bg-gray-100"
            >
              <LogOut size={20} />
            </button>
          </div>
        </div>
      </nav>

      <main className="max-w-4xl mx-auto px-4 py-8">
        {view === 'calendar' ? (
          <CalendarView userId={user.id} />
        ) : (
          <SettingsView userId={user.id} />
        )}
      </main>
    </div>
  );
}

// ============================================================================
// AUTH SCREEN
// ============================================================================
function AuthScreen({ onAuthSuccess }) {
  const [isSignUp, setIsSignUp] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    if (e) e.preventDefault();
    if (!email || !password) {
      setError('Please enter both email and password');
      return;
    }
    setError('');
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

  return (
    <div className="min-h-screen bg-gradient-to-br from-amber-50 to-teal-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-xl p-8 w-full max-w-md">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-teal-700 mb-2">Regularity</h1>
          <p className="text-gray-600">Track your digestive health</p>
        </div>

        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleSubmit(e)}
              // className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-transparent"
              className="w-full px-4 py-2 border border-gray-300 rounded-lg text-gray-900 focus:ring-2 focus:ring-teal-500 focus:border-transparent"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Password</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleSubmit(e)}
              // className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-transparent"
              className="w-full px-4 py-2 border border-gray-300 rounded-lg text-gray-900 focus:ring-2 focus:ring-teal-500 focus:border-transparent"
            />
          </div>

          {error && (
            <div className="bg-red-50 text-red-600 p-3 rounded-lg text-sm">
              {error}
            </div>
          )}

          <button
            onClick={handleSubmit}
            disabled={loading}
            className="w-full bg-teal-600 text-white py-2 rounded-lg hover:bg-teal-700 disabled:opacity-50 disabled:cursor-not-allowed font-medium"
          >
            {loading ? 'Please wait...' : (isSignUp ? 'Sign Up' : 'Log In')}
          </button>
        </div>

        <div className="mt-6 text-center">
          <button
            onClick={() => setIsSignUp(!isSignUp)}
            className="text-teal-600 hover:text-teal-700 text-sm"
          >
            {isSignUp ? 'Already have an account? Log in' : "Don't have an account? Sign up"}
          </button>
        </div>
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

  const formatDate = (date) => {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };

  const toggleLog = async (day) => {
    const date = new Date(currentDate.getFullYear(), currentDate.getMonth(), day);
    const dateStr = formatDate(date);

    // Find all logs for this specific date
    const existingLogs = logs.filter(log => log.log_date === dateStr);

    if (existingLogs.length > 0) {
      // OPTION A: Delete all logs for that day (Original "Toggle" behavior)
      await supabase
        .from('logs')
        .delete()
        .eq('user_id', userId)
        .eq('log_date', dateStr);

      setLogs(logs.filter(log => log.log_date !== dateStr));
    } else {
      // OPTION B: Simply insert a new log (No 409 error will occur now)
      const { data, error } = await supabase
        .from('logs')
        .insert({
          user_id: userId,
          log_date: dateStr
        })
        .select()
        .single();

      if (!error && data) {
        setLogs([...logs, data]);
      }
    }
    setSelectedDate(null);
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
        <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 mb-6 flex items-start gap-3">
          <Bell className="text-amber-600 mt-1" size={20} />
          <div>
            <h3 className="font-semibold text-amber-900">Constipation Alert</h3>
            <p className="text-amber-800 text-sm">
              It's been <strong>{daysSinceLastLog} days</strong> since your last log
              (recorded on {getLastLogDate()?.log_date}).
            </p>
            <p className="text-amber-700 text-xs mt-1 italic">
              Threshold: {threshold} days
            </p>
          </div>
        </div>
      )}
      {/* {showAlert && (
        <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 mb-6 flex items-start gap-3">
          <Bell className="text-amber-600 mt-1" size={20} />
          <div>
            <h3 className="font-semibold text-amber-900">Constipation Alert</h3>
            <p className="text-amber-800 text-sm">
              It's been {daysSinceLastLog} days since your last log. Consider consulting a healthcare provider if this continues.
            </p>
          </div>
        </div>
      )} */}

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

            return (
              <button
                key={day}
                onClick={() => setSelectedDate(day)}
                className={`aspect-square rounded-lg flex items-center justify-center text-sm font-medium relative
                  ${isLogged ? 'bg-teal-100 text-teal-700 hover:bg-teal-200' : 'bg-gray-50 text-gray-700 hover:bg-gray-100'}
                  ${isToday ? 'ring-2 ring-teal-500' : ''}
                `}
              >
                {day}
                {isLogged && (
                  <Check className="absolute top-1 right-1" size={12} />
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
            <p className="text-gray-600 mb-6">
              {isDateLogged(selectedDate) ? 'Remove this log?' : 'Log entry for this date?'}
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => toggleLog(selectedDate)}
                className="flex-1 bg-teal-600 text-white py-2 rounded-lg hover:bg-teal-700"
              >
                {isDateLogged(selectedDate) ? 'Remove' : 'Add Log'}
              </button>
              <button
                onClick={() => setSelectedDate(null)}
                className="flex-1 bg-gray-200 text-gray-700 py-2 rounded-lg hover:bg-gray-300"
              >
                Cancel
              </button>
            </div>
          </div>
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
            // className="w-32 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-transparent"
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