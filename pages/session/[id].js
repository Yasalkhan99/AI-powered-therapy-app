import { useSession } from 'next-auth/react';
import { useRouter } from 'next/router';
import { useState, useEffect } from 'react';
import ReactMarkdown from 'react-markdown';

export default function SessionDetails() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const { id } = router.query;
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [sessionData, setSessionData] = useState(null);

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/login');
    }
  }, [status, router]);

  useEffect(() => {
    const fetchSessionDetails = async () => {
      if (!id) return;

      try {
        const response = await fetch(`/api/chat/session/${id}`);
        if (!response.ok) {
          throw new Error('Failed to fetch session details');
        }
        const data = await response.json();
        setSessionData(data);
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    if (status === 'authenticated') {
      fetchSessionDetails();
    }
  }, [id, status]);

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

  if (!sessionData) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-gray-600">Session not found</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Session Title */}
        <div className="flex items-center mb-6">
          <h1 className="text-3xl font-bold text-purple-700 mr-4">{sessionData.title || 'Session'}</h1>
        </div>
        {/* Header */}
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-2xl font-bold text-gray-900">Session Details</h1>
          <button
            onClick={() => router.push('/history')}
            className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50"
          >
            Back to History
          </button>
        </div>

        {/* Session Overview */}
        <div className="bg-white rounded-lg shadow p-6 mb-6">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
            <div>
              <h3 className="text-sm font-medium text-gray-500">Date</h3>
              <p className="mt-1 text-lg text-gray-900">
                {new Date(sessionData.date).toLocaleDateString()}
              </p>
            </div>
            <div>
              <h3 className="text-sm font-medium text-gray-500">Duration</h3>
              <p className="mt-1 text-lg text-gray-900">{sessionData.duration} minutes</p>
            </div>
            <div>
              <h3 className="text-sm font-medium text-gray-500">Mood</h3>
              <p className={`mt-1 text-lg ${getMoodColor(sessionData.mood)}`}>
                {getMoodLabel(sessionData.mood)}
              </p>
            </div>
            <div>
              <h3 className="text-sm font-medium text-gray-500">Messages</h3>
              <p className="mt-1 text-lg text-gray-900">{sessionData.messageCount}</p>
            </div>
          </div>
        </div>

        {/* Session Summary */}
        <div className="bg-white rounded-lg shadow p-6 mb-6">
          <h2 className="text-lg font-medium text-gray-900 mb-4">Session Summary</h2>
          <p className="text-gray-600">{sessionData.summary}</p>
        </div>

        {/* Chat Messages */}
        <div className="bg-white rounded-lg shadow overflow-hidden">
          <div className="p-6">
            <h2 className="text-lg font-medium text-gray-900 mb-4">Chat Messages</h2>
            <div className="space-y-4">
              {sessionData.messages.map((message, index) => (
                <div
                  key={index}
                  className={`flex ${
                    message.role === 'user' ? 'justify-end' : 'justify-start'
                  }`}
                >
                  <div
                    className={`max-w-3xl rounded-lg px-4 py-2 ${
                      message.role === 'user'
                        ? 'bg-purple-600 text-white'
                        : 'bg-gray-100 text-gray-900'
                    }`}
                  >
                    <div className="text-sm mb-1">
                      {message.role === 'user' ? 'You' : 'Therapist'}
                    </div>
                    <div className="prose prose-sm">
                      <ReactMarkdown>{message.content}</ReactMarkdown>
                    </div>
                    <div className="text-xs mt-1 opacity-75">
                      {new Date(message.timestamp).toLocaleTimeString()}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
} 