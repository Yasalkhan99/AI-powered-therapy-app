import { useState } from 'react';

export default function ForgotPassword() {
  const [email, setEmail] = useState('');
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    const res = await fetch('/api/auth/forgot-password', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email }),
    });
    if (res.ok) {
      setSubmitted(true);
    } else {
      setError('Could not send reset email.');
    }
  };

  return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#f7faff' }}>
      <div style={{ background: 'white', borderRadius: 16, boxShadow: '0 2px 8px rgba(0,0,0,0.06)', padding: 32, minWidth: 340 }}>
        <h2 style={{ fontSize: 28, fontWeight: 700, marginBottom: 16, color: '#181f2c', textAlign: 'center' }}>Forgot Password</h2>
        {submitted ? (
          <div style={{ color: '#059669', fontWeight: 500, textAlign: 'center' }}>If an account exists for this email, a reset link has been sent.</div>
        ) : (
          <form onSubmit={handleSubmit}>
            <div style={{ marginBottom: 16 }}>
              <label htmlFor="email" style={{ display: 'block', marginBottom: 6, color: '#374151', fontWeight: 500 }}>Email</label>
              <input
                id="email"
                type="email"
                value={email}
                onChange={e => setEmail(e.target.value)}
                required
                style={{ width: '100%', padding: 10, borderRadius: 8, border: '1px solid #d1d5db', fontSize: 16 }}
              />
            </div>
            {error && <div style={{ color: '#dc2626', marginBottom: 12 }}>{error}</div>}
            <button type="submit" style={{ width: '100%', background: '#2563eb', color: 'white', padding: '10px 0', borderRadius: 8, fontWeight: 600, fontSize: 18, border: 'none', cursor: 'pointer' }}>Send Reset Link</button>
          </form>
        )}
      </div>
    </div>
  );
} 