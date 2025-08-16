import { useSession } from 'next-auth/react';
import { useRouter } from 'next/router';
import { useState, useEffect } from 'react';

export default function History() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [sessions, setSessions] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [dateFilter, setDateFilter] = useState('all');
  const [moodFilter, setMoodFilter] = useState('all');
  const [isStacked, setIsStacked] = useState(false);

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/login');
    }
  }, [status, router]);

  useEffect(() => {
    const fetchSessions = async () => {
      try {
        const response = await fetch('/api/chat/history');
        if (!response.ok) {
          throw new Error('Failed to fetch chat history');
        }
        const data = await response.json();
        setSessions(data);
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    if (status === 'authenticated') {
      fetchSessions();
    }
  }, [status]);

  const filteredSessions = sessions.filter(session => {
    const matchesSearch = session.summary?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         session.date.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesDate = dateFilter === 'all' ? true :
      dateFilter === 'week' ? isWithinLastWeek(session.date) :
      dateFilter === 'month' ? isWithinLastMonth(session.date) :
      dateFilter === 'year' ? isWithinLastYear(session.date) : true;

    const matchesMood = moodFilter === 'all' ? true :
      moodFilter === 'positive' ? session.mood >= 7 :
      moodFilter === 'neutral' ? session.mood >= 4 && session.mood < 7 :
      moodFilter === 'negative' ? session.mood < 4 : true;

    return matchesSearch && matchesDate && matchesMood;
  });

  const isWithinLastWeek = (date) => {
    const sessionDate = new Date(date);
    const weekAgo = new Date();
    weekAgo.setDate(weekAgo.getDate() - 7);
    return sessionDate >= weekAgo;
  };

  const isWithinLastMonth = (date) => {
    const sessionDate = new Date(date);
    const monthAgo = new Date();
    monthAgo.setMonth(monthAgo.getMonth() - 1);
    return sessionDate >= monthAgo;
  };

  const isWithinLastYear = (date) => {
    const sessionDate = new Date(date);
    const yearAgo = new Date();
    yearAgo.setFullYear(yearAgo.getFullYear() - 1);
    return sessionDate >= yearAgo;
  };

  const getMoodLabel = (mood) => {
    if (mood >= 7) return 'Positive';
    if (mood >= 4) return 'Neutral';
    return 'Negative';
  };

  const getMoodColor = (mood) => {
    if (mood >= 7) return 'text-green-600';
    if (mood >= 4) return 'text-yellow-600';
    return 'text-red-600';
  };

  if (status === 'loading' || loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-purple-600"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-red-600">Error: {error}</div>
      </div>
    );
  }

  return (
    <div className="echonest-history-root" style={{ minHeight: '100vh', background: '#f7faff', display: 'flex', flexDirection: 'row', fontFamily: 'system-ui, Arial, sans-serif' }}>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-2xl font-bold text-gray-900">Chat History</h1>
          <button
            onClick={() => router.push('/dashboard')}
            className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50"
          >
            Back to Dashboard
          </button>
        </div>

        {/* Filters */}
        <div className="bg-white rounded-lg shadow p-4 mb-6">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div>
              <label htmlFor="search" className="block text-sm font-medium text-gray-700 mb-1">
                Search
              </label>
              <input
                type="text"
                id="search"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Search sessions..."
                className="w-full rounded-md border-gray-300 shadow-sm focus:border-purple-500 focus:ring-purple-500"
              />
            </div>
            <div>
              <label htmlFor="dateFilter" className="block text-sm font-medium text-gray-700 mb-1">
                Date Range
              </label>
              <select
                id="dateFilter"
                value={dateFilter}
                onChange={(e) => setDateFilter(e.target.value)}
                className="w-full rounded-md border-gray-300 shadow-sm focus:border-purple-500 focus:ring-purple-500"
              >
                <option value="all">All Time</option>
                <option value="week">Last Week</option>
                <option value="month">Last Month</option>
                <option value="year">Last Year</option>
              </select>
            </div>
            <div>
              <label htmlFor="moodFilter" className="block text-sm font-medium text-gray-700 mb-1">
                Mood
              </label>
              <select
                id="moodFilter"
                value={moodFilter}
                onChange={(e) => setMoodFilter(e.target.value)}
                className="w-full rounded-md border-gray-300 shadow-sm focus:border-purple-500 focus:ring-purple-500"
              >
                <option value="all">All Moods</option>
                <option value="positive">Positive</option>
                <option value="neutral">Neutral</option>
                <option value="negative">Negative</option>
              </select>
            </div>
          </div>
        </div>

        {/* Sessions Table */}
        <div className="bg-white rounded-lg shadow overflow-hidden">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Date
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Duration
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Mood
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Summary
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {filteredSessions.map((session) => (
                  <tr key={session.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {new Date(session.date).toLocaleDateString()}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {session.duration} min
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm">
                      <span className={`${getMoodColor(session.mood)} font-medium`}>
                        {getMoodLabel(session.mood)}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-900">
                      {session.summary}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      <button
                        onClick={() => router.push(`/session/${session.id}`)}
                        className="text-purple-600 hover:text-purple-900"
                      >
                        View Details
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {filteredSessions.length === 0 && (
            <div className="text-center py-8 text-gray-500">
              No sessions found matching your criteria
            </div>
          )}
        </div>
      </div>
    </div>
  );
} 