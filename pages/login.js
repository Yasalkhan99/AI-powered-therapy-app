import { useState, useEffect } from 'react';
import { signIn } from 'next-auth/react';
import { useRouter } from 'next/router';
import { MdEmail, MdLock, MdVisibility, MdVisibilityOff } from 'react-icons/md';
import { FiArrowRight } from 'react-icons/fi';
import useBreakpoint from '../utils/useBreakpoint';
import Notification from '../components/Notification';

function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [remember, setRemember] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);
  const [loading, setLoading] = useState(false);
  const router = useRouter();
  const { breakpoint, isXs, isMobile, isSm, isMd, isLg, isXl, is2xl, width } = useBreakpoint();

  useEffect(() => {
    const link = document.createElement('link');
    link.href = 'https://fonts.googleapis.com/css2?family=Inter:wght@400;600;700&display=swap';
    link.rel = 'stylesheet';
    document.head.appendChild(link);
    return () => { document.head.removeChild(link); };
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    const result = await signIn('credentials', {
      redirect: false,
      email,
      password,
    });
    setLoading(false);
    if (result.error) {
      alert(result.error);
    } else {
      setShowSuccess(true);
      setTimeout(() => router.push('/'), 1200);
    }
  };

  // Gradient text style for brand
  const gradientTextStyle = {
    background: 'linear-gradient(90deg, #2575fc 0%, #6a11cb 100%)',
    WebkitBackgroundClip: 'text',
    WebkitTextFillColor: 'transparent',
    backgroundClip: 'text',
    fontWeight: 800,
    letterSpacing: -0.5,
    display: 'inline-block',
  };

  // Responsive layout logic
  const isStacked = isXs || isMobile || width < 700;
  const leftPanelPadding = isXs ? '24px 16px 0 16px' : isMobile ? '32px 12px 0 12px' : '0 0 0 7vw';
  const headingFontSize = isXs ? 22 : isMobile ? 28 : isSm ? 32 : 48;
  const cardPadding = isXs ? '20px 16px' : isMobile ? '32px 16px' : isSm ? '32px 16px' : '40px 36px';
  const cardMargin = isXs ? '0 16px' : isMobile ? '0 16px' : 0;
  const featureCardPadding = isXs ? '14px 10px' : isMobile ? '18px 18px' : '22px 32px';
  const featureCardMinWidth = isXs ? 120 : isMobile ? 140 : 180;
  const featureCardFontSize = isXs ? 13 : isMobile ? 14 : 15;
  const featureCardTitleSize = isXs ? 15 : isMobile ? 16 : 18;

  return (
    <>
      {showSuccess && (
        <Notification message="Login successful! Welcome back." type="success" duration={1200} onClose={() => setShowSuccess(false)} />
      )}
      <div className="echonest-auth-root" style={{ minHeight: '100vh', background: 'linear-gradient(120deg, #f6faff 0%, #f8fcff 100%)', display: 'flex', flexDirection: 'row', fontFamily: 'system-ui, Arial, sans-serif', transition: 'all 0.3s' }}>
        {/* Left Panel */}
        <div className="echonest-auth-left" style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'flex-start', padding: '0 0 0 7vw', textAlign: 'left' }}>
          {/* Welcome Heading */}
          <h1 className="echonest-auth-heading center-mobile" style={{ fontSize: headingFontSize, fontWeight: 800, margin: 0, color: '#232323', letterSpacing: -1, lineHeight: 1.1 }}>
            Welcome to <span style={gradientTextStyle}>EchoNest</span>
          </h1>
          <p className="echonest-auth-description center-mobile" style={{ fontSize: featureCardFontSize + 5, color: '#4b5563', margin: '24px 0 36px 0', maxWidth: 540, fontWeight: 400 }}>
            Your AI-powered therapy companion. Find support, guidance, and healing through personalized conversations designed to help you thrive.
          </p>
          {/* Feature Cards */}
          <div className="echonest-auth-feature-cards" style={{ display: 'flex', gap: isXs ? 10 : 24, flexDirection: isStacked ? 'column' : 'row', width: isStacked ? '100%' : 'auto', maxWidth: 600 }}>
            <div className="echonest-auth-feature-card" style={{ background: '#fff', borderRadius: 14, boxShadow: '0 2px 12px rgba(106,17,203,0.06)', padding: 18, minWidth: featureCardMinWidth, }}>
              <div style={{ fontWeight: 700, fontSize: featureCardTitleSize, color: '#232323', marginBottom: 6 }}>24/7 Support</div>
              <div style={{ fontSize: featureCardFontSize, color: '#6b7a90' }}>Always here when you need us</div>
            </div>
            <div className="echonest-auth-feature-card" style={{ background: '#fff', borderRadius: 14, boxShadow: '0 2px 12px rgba(106,17,203,0.06)', padding: 18, minWidth: featureCardMinWidth, }}>
              <div style={{ fontWeight: 700, fontSize: featureCardTitleSize, color: '#232323', marginBottom: 6 }}>Private & Secure</div>
              <div style={{ fontSize: featureCardFontSize, color: '#6b7a90' }}>Your conversations stay confidential</div>
            </div>
          </div>
        </div>
        {/* Right Panel: Login Card */}
        <div className="echonest-auth-card-container" style={{ flex: 1, minWidth: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 0 }}>
          <div className="echonest-auth-card" style={{ width: '100%', maxWidth: 400, background: '#fff', borderRadius: 18, boxShadow: '0 8px 32px rgba(106,17,203,0.10)', padding: '32px', margin: 0, display: 'flex', flexDirection: 'column', gap: 0, maxHeight: 600, overflowY: 'auto' }}>
            <div style={{ fontWeight: 700, fontSize: isXs ? 20 : isMobile ? 22 : 26, marginBottom: 4, textAlign: 'center', letterSpacing: -0.5 }}>
              <span style={gradientTextStyle}>Join EchoNest</span>
            </div>
            <div style={{ fontSize: featureCardFontSize, color: '#6b7a90', marginBottom: 28, textAlign: 'center' }}>Start your journey to better mental health</div>
            <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: isXs ? 10 : 18 }}>
              {/* Email */}
              <div style={{ position: 'relative' }}>
                <label htmlFor="email" style={{ display: 'block', fontSize: 14, fontWeight: 600, color: '#232323', marginBottom: 6 }}>Email</label>
                <span style={{ position: 'absolute', left: 14, top: 36, color: '#232323', fontSize: 20 }}><MdEmail /></span>
                <input
                  id="email"
                  name="email"
                  type="email"
                  autoComplete="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  style={{
                    width: '100%',
                    padding: isXs ? '10px 10px 10px 38px' : '13px 14px 13px 44px',
                    borderRadius: 10,
                    border: '1.5px solid #e3e6ea',
                    fontSize: 14,
                    background: '#f8f9fc',
                    outline: 'none',
                    transition: 'border 0.2s',
                    boxSizing: 'border-box',
                  }}
                  onFocus={e => e.target.style.border = '1.5px solid #6a11cb'}
                  onBlur={e => e.target.style.border = '1.5px solid #e3e6ea'}
                  placeholder="Enter your email"
                />
              </div>
              {/* Password */}
              <div style={{ position: 'relative' }}>
                <label htmlFor="password" style={{ display: 'block', fontSize: 14, fontWeight: 600, color: '#232323', marginBottom: 6 }}>Password</label>
                <span style={{ position: 'absolute', left: 14, top: 36, color: '#232323', fontSize: 20 }}><MdLock /></span>
                <input
                  id="password"
                  name="password"
                  type={showPassword ? 'text' : 'password'}
                  autoComplete="current-password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  style={{
                    width: '100%',
                    padding: isXs ? '10px 10px 10px 38px' : '13px 14px 13px 44px',
                    borderRadius: 10,
                    border: '1.5px solid #e3e6ea',
                    fontSize: 14,
                    background: '#f8f9fc',
                    outline: 'none',
                    transition: 'border 0.2s',
                    boxSizing: 'border-box',
                  }}
                  onFocus={e => e.target.style.border = '1.5px solid #6a11cb'}
                  onBlur={e => e.target.style.border = '1.5px solid #e3e6ea'}
                  placeholder="Enter your password"
                />
                {/* Eye icon for show/hide */}
                <span
                  onClick={() => setShowPassword((v) => !v)}
                  style={{ position: 'absolute', right: 14, top: 36, color: '#232323', fontSize: 22, cursor: 'pointer', userSelect: 'none' }}
                  tabIndex={0}
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                >
                  {showPassword ? <MdVisibilityOff /> : <MdVisibility />}
                </span>
              </div>
              {/* Remember Me & Forgot Password */}
              <div style={{ display: 'flex', flexDirection: isXs ? 'column' : 'row', alignItems: isXs ? 'flex-start' : 'center', justifyContent: 'space-between', marginTop: -4, marginBottom: 2, gap: isXs ? 6 : 0 }}>
                <label style={{ display: 'flex', alignItems: 'center', fontSize: 14, color: '#232323', cursor: 'pointer', userSelect: 'none' }}>
                  <input
                    type="checkbox"
                    checked={remember}
                    onChange={() => setRemember(!remember)}
                    style={{ marginRight: 7, accentColor: '#6a11cb' }}
                  />
                  Remember me
                </label>
                <a href="/forgot-password" style={{ color: '#2575fc', textDecoration: 'underline', fontWeight: 500, fontSize: featureCardFontSize - 1, transition: 'color 0.2s', cursor: 'pointer', marginTop: isXs ? 6 : 0 }}>Forgot password?</a>
              </div>
              {/* Sign In Button */}
              <button
                type="submit"
                style={{
                  width: '100%',
                  padding: isXs ? '10px 0' : '14px 0',
                  border: 'none',
                  borderRadius: 10,
                  background: 'linear-gradient(90deg, #2575fc 0%, #6a11cb 100%)',
                  color: '#fff',
                  fontSize: isXs ? 15 : 18,
                  fontWeight: 700,
                  marginTop: 8,
                  boxShadow: '0 2px 8px rgba(106,17,203,0.08)',
                  cursor: 'pointer',
                  transition: 'background 0.2s',
                }}
                disabled={loading}
              >
                {loading ? 'Signing in...' : (<><span>Sign In</span> <FiArrowRight style={{ marginLeft: 8, verticalAlign: 'middle' }} /></>)}
              </button>
            </form>
            <div style={{ textAlign: 'center', fontSize: 14, marginTop: 18 }}>
              <a
                href="/register"
                style={{
                  color: '#6a11cb',
                  textDecoration: 'none',
                  fontWeight: 600,
                  transition: 'color 0.2s',
                  borderBottom: '0px solid',
                  borderImage: 'linear-gradient(90deg, #2575fc 0%, #6a11cb 100%) 1',
                  paddingBottom: 1,
                  background: 'none',
                  cursor: 'pointer',
                }}
                onMouseOver={e => e.currentTarget.style.color = '#2575fc'}
                onMouseOut={e => e.currentTarget.style.color = '#6a11cb'}
              >
                Don&apos;t have an account? Sign Up
              </a>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}

export default LoginPage; 
