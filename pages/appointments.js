import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import Notification from '../components/Notification';
import { mutate } from 'swr';

const SESSION_TYPES = [
  { label: 'Chat Session', value: 'chat', icon: '💬' },
  { label: 'Voice Session', value: 'voice', icon: '🎤' },
];
const TIMES = [
  '09:00', '10:00', '11:00', '12:00', '13:00', '14:00', '15:00', '16:00', '17:00', '18:00', '19:00', '20:00'
];
const SESSION_TITLES = [
  'Anxiety Support',
  'Career Guidance',
  'Relationship Advice',
  'Stress Management',
  'Self-Esteem',
  'Grief Counseling',
  'Goal Setting',
  'Other',
];

export default function AppointmentsPage() {
  const router = useRouter();
  const [sessionType, setSessionType] = useState('chat');
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [selectedTime, setSelectedTime] = useState('');
  const [bookingLoading, setBookingLoading] = useState(false);
  const [appointments, setAppointments] = useState([]);
  const [notification, setNotification] = useState(null);
  const [fetching, setFetching] = useState(true);
  const [rescheduleId, setRescheduleId] = useState(null);
  const [rescheduleDate, setRescheduleDate] = useState(new Date());
  const [rescheduleTime, setRescheduleTime] = useState('');
  const [rescheduleLoading, setRescheduleLoading] = useState(false);
  const [sessionTitle, setSessionTitle] = useState(SESSION_TITLES[0]);

  const today = new Date();
  today.setHours(0,0,0,0);
  const isCurrentMonth = selectedDate.getFullYear() === today.getFullYear() && selectedDate.getMonth() === today.getMonth();

  // Fetch appointments on mount
  useEffect(() => {
    const fetchAppointments = async () => {
      setFetching(true);
      try {
        const res = await fetch('/api/appointments');
        const data = await res.json();
        if (res.ok) setAppointments(data.appointments);
      } catch (e) {}
      setFetching(false);
    };
    fetchAppointments();
  }, []);

  // Calendar helpers
  const getMonthDays = (date) => {
    const year = date.getFullYear();
    const month = date.getMonth();
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const days = [];
    for (let i = 1; i <= lastDay.getDate(); i++) {
      days.push(new Date(year, month, i));
    }
    return days;
  };
  const monthDays = getMonthDays(selectedDate);
  const startDay = monthDays[0].getDay();

  // Booking handler
  const handleBook = async () => {
    setBookingLoading(true);
    setNotification(null);
    try {
      const res = await fetch('/api/appointments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sessionType,
          date: selectedDate.toISOString(),
          time: selectedTime,
          title: sessionTitle,
        }),
      });
      const data = await res.json();
      if (res.ok) {
        setNotification({ type: 'success', message: 'Appointment booked!' });
        setAppointments((prev) => [...prev, data.appointment]);
        setSelectedTime('');
        mutate('/api/dashboard/stats');
      } else {
        setNotification({ type: 'error', message: data.error || 'Booking failed.' });
      }
    } catch (e) {
      setNotification({ type: 'error', message: 'Booking failed.' });
    }
    setBookingLoading(false);
  };

  // Cancel handler
  const handleCancel = async (id) => {
    if (!window.confirm('Cancel this appointment?')) return;
    setNotification(null);
    try {
      const res = await fetch(`/api/appointments?id=${id}`, { method: 'DELETE' });
      const data = await res.json();
      if (res.ok) {
        setAppointments((prev) => prev.map(a => a.id === id ? { ...a, status: 'cancelled' } : a));
        setNotification({ type: 'success', message: 'Appointment cancelled.' });
        mutate('/api/dashboard/stats');
      } else {
        setNotification({ type: 'error', message: data.error || 'Cancel failed.' });
      }
    } catch {
      setNotification({ type: 'error', message: 'Cancel failed.' });
    }
  };

  // Reschedule modal open
  const openReschedule = (app) => {
    setRescheduleId(app.id);
    setRescheduleDate(new Date(app.date));
    setRescheduleTime(app.time);
  };
  // Reschedule handler
  const handleReschedule = async () => {
    setRescheduleLoading(true);
    setNotification(null);
    try {
      const res = await fetch('/api/appointments', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: rescheduleId, date: rescheduleDate.toISOString(), time: rescheduleTime }),
      });
      const data = await res.json();
      if (res.ok) {
        setAppointments((prev) => prev.map(a => a.id === rescheduleId ? data.appointment : a));
        setNotification({ type: 'success', message: 'Appointment rescheduled.' });
        setRescheduleId(null);
        mutate('/api/dashboard/stats');
      } else {
        setNotification({ type: 'error', message: data.error || 'Reschedule failed.' });
      }
    } catch {
      setNotification({ type: 'error', message: 'Reschedule failed.' });
    }
    setRescheduleLoading(false);
  };
  // Join handler
  const handleJoin = async (app) => {
    if (app.sessionType === 'chat') {
      // Create a new chat session with the appointment title
      const res = await fetch('/api/chat/session', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title: app.title }),
      });
      const data = await res.json();
      if (res.ok && data.session) {
        router.push(`/session/${data.session.id}`);
      } else {
        setNotification({ type: 'error', message: 'Could not start session.' });
      }
    } else if (app.sessionType === 'voice') {
      router.push('/voice');
    }
  };

  // Helper to check if join is allowed
  function canJoin(app) {
    if (app.status !== 'confirmed') return false;
    const now = new Date();
    const appDate = new Date(app.date);
    const [h, m] = app.time.split(':');
    appDate.setHours(Number(h), Number(m), 0, 0);
    const diff = (now - appDate) / 60000; // minutes
    return diff >= -10 && diff <= 10; // 10 min before/after
  }

  // Filter and sort upcoming appointments
  const upcomingAppointments = appointments
    .filter(app => app.status !== 'cancelled')
    .sort((a, b) => new Date(a.date + 'T' + a.time) - new Date(b.date + 'T' + b.time))
    .slice(0, 3);

  // Count upcoming chat and voice appointments
  const upcomingChat = appointments.filter(app => app.status !== 'cancelled' && app.sessionType === 'chat').length;
  const upcomingVoice = appointments.filter(app => app.status !== 'cancelled' && app.sessionType === 'voice').length;
  const bookingLimitReached = (sessionType === 'chat' && upcomingChat >= 3) || (sessionType === 'voice' && upcomingVoice >= 3);

  return (
    <div style={{ minHeight: '100vh', background: 'linear-gradient(120deg, #f6faff 0%, #f8fcff 100%)', padding: 0, fontFamily: 'system-ui, Arial, sans-serif' }}>
      {notification && (
        <Notification
          message={notification.message}
          type={notification.type}
          duration={4000}
          onClose={() => setNotification(null)}
        />
      )}
      <div style={{ maxWidth: 1200, margin: '0 auto', padding: '32px 0 0 0', display: 'flex', flexDirection: 'column', gap: 24 }}>
        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginBottom: 24 }}>
          <button onClick={() => router.push('/dashboard')} style={{ background: 'none', border: 'none', color: '#2563eb', fontWeight: 600, fontSize: 16, cursor: 'pointer', padding: 0, marginRight: 8 }}>&larr; Back to Dashboard</button>
          <span style={{ fontSize: 28, color: '#22c55e', marginRight: 8 }}> <svg width="28" height="28" fill="none" viewBox="0 0 24 24"><path d="M19 4h-1V2h-2v2H8V2H6v2H5a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2V6a2 2 0 00-2-2zm0 16H5V9h14v11zm0-13H5V6h14v1z" fill="#22c55e"/></svg></span>
          <span style={{ fontWeight: 700, fontSize: 24, color: '#181f2c' }}>Appointments</span>
        </div>
        <div style={{ display: 'flex', gap: 32, flexWrap: 'wrap', alignItems: 'flex-start' }}>
          {/* Book New Session */}
          <div style={{ flex: 2, minWidth: 340, background: 'white', borderRadius: 14, border: '1.5px solid #e5e7eb', padding: 28, marginBottom: 24 }}>
            <div style={{ fontWeight: 700, fontSize: 22, color: '#22c55e', marginBottom: 2, display: 'flex', alignItems: 'center', gap: 8 }}>
              <span style={{ fontSize: 22 }}>+</span> Book New Session
            </div>
            <div style={{ color: '#6b7280', fontSize: 15, marginBottom: 18 }}>Schedule your next therapy session with EchoNest</div>
            {/* Session Type */}
            <div style={{ display: 'flex', gap: 8, marginBottom: 18 }}>
              {SESSION_TYPES.map(type => (
                <button
                  key={type.value}
                  onClick={() => setSessionType(type.value)}
                  style={{
                    flex: 1,
                    background: sessionType === type.value ? '#181f2c' : '#f3f4f6',
                    color: sessionType === type.value ? 'white' : '#232323',
                    border: sessionType === type.value ? '1.5px solid #181f2c' : '1.5px solid #e5e7eb',
                    borderRadius: 8,
                    fontWeight: 600,
                    fontSize: 16,
                    padding: '10px 0',
                    cursor: 'pointer',
                    transition: 'background 0.2s, color 0.2s',
                  }}
                >
                  <span style={{ fontSize: 18, marginRight: 6 }}>{type.icon}</span> {type.label}
                </button>
              ))}
            </div>
            {/* Date Picker */}
            <div style={{ marginBottom: 18 }}>
              <div style={{ fontWeight: 600, color: '#181f2c', marginBottom: 8 }}>Select Date</div>
              <div style={{ background: '#f8fafc', borderRadius: 10, border: '1.5px solid #e5e7eb', padding: 18, width: 320, maxWidth: '100%' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
                  <button
                    onClick={() => !isCurrentMonth && setSelectedDate(new Date(selectedDate.getFullYear(), selectedDate.getMonth() - 1, 1))}
                    style={{ background: 'none', border: 'none', fontSize: 18, color: isCurrentMonth ? '#d1d5db' : '#2563eb', cursor: isCurrentMonth ? 'not-allowed' : 'pointer' }}
                    disabled={isCurrentMonth}
                  >&lt;</button>
                  <span style={{ fontWeight: 600, fontSize: 16 }}>{selectedDate.toLocaleString('default', { month: 'long', year: 'numeric' })}</span>
                  <button onClick={() => setSelectedDate(new Date(selectedDate.getFullYear(), selectedDate.getMonth() + 1, 1))} style={{ background: 'none', border: 'none', fontSize: 18, color: '#2563eb', cursor: 'pointer' }}>&gt;</button>
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 2, textAlign: 'center', fontWeight: 600, color: '#6b7280', fontSize: 14, marginBottom: 4 }}>
                  {['Su','Mo','Tu','We','Th','Fr','Sa'].map(d => <span key={d}>{d}</span>)}
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 2, textAlign: 'center', fontSize: 15 }}>
                  {Array(startDay).fill('').map((_, i) => <span key={'empty'+i}></span>)}
                  {monthDays.map(day => {
                    const isSelected = day.toDateString() === selectedDate.toDateString();
                    const isPast = day < today;
                    return (
                      <button
                        key={day.toISOString()}
                        onClick={() => !isPast && setSelectedDate(day)}
                        disabled={isPast}
                        style={{
                          background: isSelected ? '#181f2c' : 'white',
                          color: isPast ? '#d1d5db' : isSelected ? 'white' : '#232323',
                          border: isSelected ? '1.5px solid #181f2c' : '1.5px solid #e5e7eb',
                          borderRadius: 6,
                          fontWeight: 600,
                          padding: '4px 0',
                          cursor: isPast ? 'not-allowed' : 'pointer',
                          marginBottom: 2,
                          opacity: isPast ? 0.5 : 1,
                        }}
                      >{day.getDate()}</button>
                    );
                  })}
                </div>
              </div>
            </div>
            {/* Time Slots */}
            <div style={{ marginBottom: 18 }}>
              <div style={{ fontWeight: 600, color: '#181f2c', marginBottom: 8 }}>Available Times</div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                {TIMES.map(time => {
                  let isPastTime = false;
                  if (selectedDate.toDateString() === today.toDateString()) {
                    const [h, m] = time.split(':');
                    const slot = new Date(selectedDate);
                    slot.setHours(Number(h), Number(m), 0, 0);
                    isPastTime = slot <= new Date();
                  }
                  return (
                    <button
                      key={time}
                      onClick={() => !isPastTime && setSelectedTime(time)}
                      disabled={isPastTime}
                      style={{
                        background: selectedTime === time ? '#181f2c' : 'white',
                        color: isPastTime ? '#d1d5db' : selectedTime === time ? 'white' : '#232323',
                        border: selectedTime === time ? '1.5px solid #181f2c' : '1.5px solid #e5e7eb',
                        borderRadius: 6,
                        fontWeight: 600,
                        fontSize: 15,
                        padding: '8px 18px',
                        cursor: isPastTime ? 'not-allowed' : 'pointer',
                        marginBottom: 4,
                        transition: 'background 0.2s, color 0.2s',
                        opacity: isPastTime ? 0.5 : 1,
                      }}
                    >{time}</button>
                  );
                })}
              </div>
            </div>
            {/* Session Title Dropdown */}
            <div style={{ marginBottom: 18 }}>
              <div style={{ fontWeight: 600, color: '#181f2c', marginBottom: 8 }}>Session Title</div>
              <select value={sessionTitle} onChange={e => setSessionTitle(e.target.value)} style={{ width: '100%', fontSize: 16, padding: 10, borderRadius: 8, border: '1.5px solid #e5e7eb', background: 'white', color: '#232323', fontWeight: 500 }}>
                {SESSION_TITLES.map(title => <option key={title} value={title}>{title}</option>)}
              </select>
            </div>
            <button
              onClick={handleBook}
              disabled={!selectedDate || !selectedTime || bookingLoading || bookingLimitReached}
              style={{
                width: '100%',
                background: bookingLimitReached ? '#e5e7eb' : '#181f2c',
                color: bookingLimitReached ? '#a1a1aa' : 'white',
                borderRadius: 8,
                fontWeight: 600,
                fontSize: 17,
                padding: '12px 0',
                border: 'none',
                marginTop: 8,
                cursor: (!selectedDate || !selectedTime || bookingLoading || bookingLimitReached) ? 'not-allowed' : 'pointer',
                opacity: (!selectedDate || !selectedTime || bookingLoading || bookingLimitReached) ? 0.7 : 1,
                transition: 'background 0.2s',
                position: 'relative',
              }}
              title={bookingLimitReached ? `You can only have 3 upcoming ${sessionType === 'chat' ? 'chat' : 'voice'} appointments.` : ''}
            >
              {bookingLoading ? 'Booking...' : 'Book Appointment'}
            </button>
            <div style={{ color: '#22c55e', fontSize: 14, fontWeight: 500, marginTop: 8, textAlign: 'center' }}>
              You can book a maximum of 3 chat and 3 voice appointments at a time.
            </div>
          </div>
          {/* Upcoming Appointments */}
          <div style={{ flex: 1, minWidth: 320, background: 'white', borderRadius: 14, border: '1.5px solid #e5e7eb', padding: 28, marginBottom: 24, maxHeight: 420, overflowY: 'auto' }}>
            <div style={{ fontWeight: 700, fontSize: 20, color: '#181f2c', marginBottom: 8 }}>Upcoming Appointments</div>
            <div style={{ color: '#6b7280', fontSize: 15, marginBottom: 18 }}>Your scheduled sessions with EchoNest</div>
            {upcomingAppointments.length === 0 && (
              <div style={{ color: '#a1a1aa', fontSize: 15, textAlign: 'center', marginTop: 32 }}>No upcoming appointments</div>
            )}
            {upcomingAppointments.map(app => (
              <div key={app.id} style={{ border: '1.5px solid #e5e7eb', borderRadius: 10, padding: 16, marginBottom: 14, background: '#fcfcfd' }}>
                <div style={{ fontWeight: 600, fontSize: 16, color: '#181f2c', marginBottom: 2 }}>{app.sessionType === 'chat' ? 'Chat Session' : 'Voice Session'}</div>
                {app.title && (
                  <div style={{ color: '#2563eb', fontWeight: 500, fontSize: 15, marginBottom: 2 }}>{app.title}</div>
                )}
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, color: '#6b7280', fontSize: 14, marginBottom: 6 }}>
                  <span>📅 {new Date(app.date).toLocaleDateString()}</span>
                  <span>⏰ {app.time}</span>
                  <span>{app.sessionType === 'voice' ? '🎤 voice session' : '💬 chat session'}</span>
                  <span style={{ marginLeft: 'auto', background: app.status === 'confirmed' ? '#181f2c' : '#eab308', color: 'white', borderRadius: 8, fontWeight: 600, fontSize: 13, padding: '2px 10px' }}>{app.status}</span>
                </div>
                <div style={{ display: 'flex', gap: 8 }}>
                  <button style={{ background: 'white', color: '#181f2c', border: '1.5px solid #e5e7eb', borderRadius: 8, fontWeight: 600, fontSize: 15, padding: '8px 14px', cursor: 'pointer' }} onClick={() => openReschedule(app)}>Reschedule</button>
                  <button style={{ background: 'white', color: '#ef4444', border: '1.5px solid #e5e7eb', borderRadius: 8, fontWeight: 600, fontSize: 15, padding: '8px 14px', cursor: 'pointer' }} onClick={() => handleCancel(app.id)}>Cancel</button>
                  {app.status === 'confirmed' && (
                    <button
                      style={{
                        background: canJoin(app) ? '#181f2c' : '#e5e7eb',
                        color: canJoin(app) ? 'white' : '#a1a1aa',
                        border: 'none',
                        borderRadius: 8,
                        fontWeight: 600,
                        fontSize: 15,
                        padding: '8px 14px',
                        cursor: canJoin(app) ? 'pointer' : 'not-allowed',
                        marginLeft: 8,
                        opacity: canJoin(app) ? 1 : 0.7,
                        transition: 'background 0.2s, color 0.2s',
                        position: 'relative',
                      }}
                      onClick={() => canJoin(app) && handleJoin(app)}
                      disabled={!canJoin(app)}
                      title={canJoin(app) ? '' : 'You can only join at the scheduled time'}
                    >
                      Join Session
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
        {/* Quick Start Buttons */}
        <div style={{ display: 'flex', gap: 16, marginTop: 8 }}>
          <button style={{ background: 'white', color: '#181f2c', border: '1.5px solid #e5e7eb', borderRadius: 8, fontWeight: 600, fontSize: 16, padding: '12px 18px', cursor: 'pointer' }}>Start Chat Now</button>
          <button style={{ background: 'white', color: '#181f2c', border: '1.5px solid #e5e7eb', borderRadius: 8, fontWeight: 600, fontSize: 16, padding: '12px 18px', cursor: 'pointer' }}>Start Voice Session</button>
        </div>
        {rescheduleId && (
          <div style={{ position: 'fixed', top: 0, left: 0, width: '100vw', height: '100vh', background: 'rgba(0,0,0,0.18)', zIndex: 300, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <div style={{ background: 'white', borderRadius: 18, border: '1.5px solid #e5e7eb', padding: '32px 32px 24px 32px', minWidth: 350, maxWidth: 420, width: '100%', position: 'relative' }}>
              <div style={{ fontWeight: 700, fontSize: 20, color: '#181f2c', marginBottom: 18 }}>Reschedule Appointment</div>
              <div style={{ fontWeight: 600, color: '#181f2c', marginBottom: 8 }}>Select New Date</div>
              <input type="date" value={rescheduleDate.toISOString().slice(0,10)} onChange={e => setRescheduleDate(new Date(e.target.value))} style={{ fontSize: 16, padding: 8, borderRadius: 6, border: '1.5px solid #e5e7eb', marginBottom: 16, width: '100%' }} />
              <div style={{ fontWeight: 600, color: '#181f2c', marginBottom: 8 }}>Select New Time</div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginBottom: 18 }}>
                {TIMES.map(time => (
                  <button key={time} onClick={() => setRescheduleTime(time)} style={{ background: rescheduleTime === time ? '#181f2c' : 'white', color: rescheduleTime === time ? 'white' : '#232323', border: rescheduleTime === time ? '1.5px solid #181f2c' : '1.5px solid #e5e7eb', borderRadius: 6, fontWeight: 600, fontSize: 15, padding: '8px 18px', cursor: 'pointer', marginBottom: 4, transition: 'background 0.2s, color 0.2s' }}>{time}</button>
                ))}
              </div>
              <div style={{ display: 'flex', gap: 10, marginTop: 8 }}>
                <button style={{ flex: 1, background: 'white', color: '#181f2c', borderRadius: 8, fontWeight: 600, fontSize: 17, padding: '12px 0', border: '1.5px solid #e5e7eb', cursor: 'pointer', transition: 'background 0.2s' }} onClick={() => setRescheduleId(null)}>Cancel</button>
                <button style={{ flex: 1, background: '#181f2c', color: 'white', borderRadius: 8, fontWeight: 600, fontSize: 17, padding: '12px 0', border: 'none', cursor: 'pointer', transition: 'background 0.2s' }} onClick={handleReschedule} disabled={rescheduleLoading}>{rescheduleLoading ? 'Rescheduling...' : 'Reschedule'}</button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}