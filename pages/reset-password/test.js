export default function TestResetPassword() {
  return (
    <div style={{ 
      minHeight: '100vh', 
      display: 'flex', 
      alignItems: 'center', 
      justifyContent: 'center',
      background: '#f7faff',
      fontFamily: 'system-ui, Arial, sans-serif'
    }}>
      <div style={{
        background: 'white',
        padding: '40px',
        borderRadius: '12px',
        boxShadow: '0 4px 20px rgba(0,0,0,0.1)',
        textAlign: 'center'
      }}>
        <h1 style={{ color: '#10b981', marginBottom: '16px' }}>✅ Reset Password Route Working!</h1>
        <p style={{ color: '#6b7280', marginBottom: '24px' }}>
          If you can see this page, the reset-password routing is working correctly.
        </p>
        <p style={{ color: '#374151', fontSize: '14px' }}>
          Test URL: <code>/reset-password/test</code>
        </p>
      </div>
    </div>
  );
}
