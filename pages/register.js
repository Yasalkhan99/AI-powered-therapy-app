import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import { signIn, getSession } from 'next-auth/react';
import { MdEmail, MdLock, MdPerson, MdWc, MdPublic, MdFlag, MdFavorite, MdInfo, MdVisibility, MdVisibilityOff } from 'react-icons/md';
import { FiArrowRight } from 'react-icons/fi';
import useBreakpoint from '../utils/useBreakpoint';
import Notification from '../components/Notification';

// Password validation regexes
const passwordChecks = [
  {
    label: 'At least 8 characters',
    test: (pw) => pw.length >= 8,
  },
  {
    label: 'At least one uppercase letter',
    test: (pw) => /[A-Z]/.test(pw),
  },
  {
    label: 'At least one lowercase letter',
    test: (pw) => /[a-z]/.test(pw),
  },
  {
    label: 'At least one number',
    test: (pw) => /[0-9]/.test(pw),
  },
  {
    label: 'At least one special character',
    test: (pw) => /[!@#$%^&*()_+\-=[\]{};':"\\|,.<>/?]/.test(pw),
  },
];

export default function RegisterPage() {
  const router = useRouter();
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [registerError, setRegisterError] = useState('');
  const [profileError, setProfileError] = useState('');
  const [registerForm, setRegisterForm] = useState({ email: '', password: '', confirmPassword: '' });
  const [profileForm, setProfileForm] = useState({
    fullName: '',
    age: '',
    gender: '',
    country: '',
    therapyFocus: '',
    therapyType: '',
    religion: '',
    description: '',
  });
  const [passwordTouched, setPasswordTouched] = useState(false);
  const [confirmTouched, setConfirmTouched] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [passwordFocus, setPasswordFocus] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);
  const { breakpoint, isXs, isMobile, isSm, isMd, isLg, isXl, is2xl, width } = useBreakpoint();

  const GENDERS = ['Male', 'Female', 'Non-binary', 'Other', 'Prefer not to say'];
  const FOCUS_AREAS = ['Depression', 'Anxiety', 'Stress', 'Relationships', 'Trauma', 'Grief', 'Self-esteem', 'Other'];
  const THERAPY_TYPES = ['Cognitive Behavioral Therapy (CBT)', 'Psychodynamic Therapy', 'Humanistic Therapy', 'Mindfulness-based', 'Family Therapy', 'Other'];
  const COUNTRIES = ["Afghanistan","Albania","Algeria","Andorra","Angola","Anguilla","Antigua & Barbuda","Argentina","Armenia","Aruba","Australia","Austria","Azerbaijan","Bahamas","Bahrain","Bangladesh","Barbados","Belarus","Belgium","Belize","Benin","Bermuda","Bhutan","Bolivia","Bosnia & Herzegovina","Botswana","Brazil","British Virgin Islands","Brunei","Bulgaria","Burkina Faso","Burundi","Cambodia","Cameroon","Cape Verde","Cayman Islands","Chad","Chile","China","Colombia","Congo","Cook Islands","Costa Rica","Cote D Ivoire","Croatia","Cruise Ship","Cuba","Cyprus","Czech Republic","Denmark","Djibouti","Dominica","Dominican Republic","Ecuador","Egypt","El Salvador","Equatorial Guinea","Estonia","Ethiopia","Falkland Islands","Faroe Islands","Fiji","Finland","France","French Polynesia","French West Indies","Gabon","Gambia","Georgia","Germany","Ghana","Gibraltar","Greece","Greenland","Grenada","Guam","Guatemala","Guernsey","Guinea","Guinea Bissau","Guyana","Haiti","Honduras","Hong Kong","Hungary","Iceland","India","Indonesia","Iran","Iraq","Ireland","Isle of Man","Israel","Italy","Jamaica","Japan","Jersey","Jordan","Kazakhstan","Kenya","Kuwait","Kyrgyz Republic","Laos","Latvia","Lebanon","Lesotho","Liberia","Libya","Liechtenstein","Lithuania","Luxembourg","Macau","Macedonia","Madagascar","Malawi","Malaysia","Maldives","Mali","Malta","Mauritania","Mauritius","Mexico","Moldova","Monaco","Mongolia","Montenegro","Montserrat","Morocco","Mozambique","Namibia","Nepal","Netherlands","Netherlands Antilles","New Caledonia","New Zealand","Nicaragua","Niger","Nigeria","Norway","Oman","Pakistan","Palestine","Panama","Papua New Guinea","Paraguay","Peru","Philippines","Poland","Portugal","Puerto Rico","Qatar","Reunion","Romania","Russia","Rwanda","Saint Pierre & Miquelon","Samoa","San Marino","Satellite","Saudi Arabia","Senegal","Serbia","Seychelles","Sierra Leone","Singapore","Slovakia","Slovenia","South Africa","South Korea","Spain","Sri Lanka","St Kitts & Nevis","St Lucia","St Vincent","St. Lucia","Sudan","Suriname","Swaziland","Sweden","Switzerland","Syria","Taiwan","Tajikistan","Tanzania","Thailand","Timor L'Este","Togo","Tonga","Trinidad & Tobago","Tunisia","Turkey","Turkmenistan","Turks & Caicos","Uganda","Ukraine","United Arab Emirates","United Kingdom","Uruguay","Uzbekistan","Venezuela","Vietnam","Virgin Islands (US)","Yemen","Zambia","Zimbabwe"];

  useEffect(() => {
    const link = document.createElement('link');
    link.href = 'https://fonts.googleapis.com/css2?family=Inter:wght@400;600;700&display=swap';
    link.rel = 'stylesheet';
    document.head.appendChild(link);
    return () => { document.head.removeChild(link); };
  }, []);

  // Password validation logic
  const password = registerForm.password;
  const confirmPassword = registerForm.confirmPassword;
  const passwordResults = passwordChecks.map((check) => check.test(password));
  const allValid = passwordResults.every(Boolean);
  const passwordsMatch = password && confirmPassword && password === confirmPassword;
  const progress = passwordResults.filter(Boolean).length / passwordChecks.length;

  function validatePassword(password) {
    return passwordChecks.every((check) => check.test(password));
  }

  const handleRegister = async (e) => {
    e.preventDefault();
    setRegisterError('');
    if (!registerForm.email || !registerForm.password || !registerForm.confirmPassword) {
      setRegisterError('All fields are required.');
      return;
    }
    if (!validatePassword(registerForm.password)) {
      setRegisterError('Password does not meet all requirements.');
      return;
    }
    if (registerForm.password !== registerForm.confirmPassword) {
      setRegisterError('Passwords do not match.');
      return;
    }
    setLoading(true);
    try {
      const res = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: registerForm.email, password: registerForm.password }),
      });
      const data = await res.json();
      if (!res.ok) {
        setRegisterError(data.message || 'Registration failed.');
      } else {
        setShowSuccess(true);
        setTimeout(async () => {
          const signInResult = await signIn('credentials', {
            redirect: false,
            email: registerForm.email,
            password: registerForm.password,
          });
          if (signInResult.error) {
            setRegisterError('Registration successful, but failed to log you in. Please try logging in from the login page.');
          } else {
            router.push('/');
          }
        }, 1200);
      }
    } catch (error) {
      setRegisterError('An unexpected error occurred. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleProfile = async (e) => {
    e.preventDefault();
    setProfileError('');

    const age = Number(profileForm.age);
    if (isNaN(age) || age < 13 || age > 120) {
      setProfileError('Please enter a valid age between 13 and 120.');
      return;
    }

    if (!profileForm.fullName || !profileForm.age || !profileForm.gender || !profileForm.country || !profileForm.therapyFocus || !profileForm.therapyType) {
      setProfileError('Please fill in all required fields.');
      return;
    }
    setLoading(true);
    try {
      const res = await fetch('/api/user/setup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(profileForm),
      });
      const data = await res.json();
      if (!res.ok) {
        if (data.missingFields) {
          setProfileError(`Missing required fields: ${data.missingFields.join(', ')}`);
        } else if (data.message === 'Unauthorized - No session found') {
          router.push('/login');
        } else {
          setProfileError(data.message || 'Profile setup failed.');
        }
      } else {
        // Refresh the session to update the token with setupCompleted
        const session = await getSession();
        if (session) {
        router.push('/dashboard');
        } else {
          setProfileError('Session expired. Please login again.');
          router.push('/login');
        }
      }
    } catch (error) {
      setProfileError('An unexpected error occurred during profile setup. Please try again.');
    } finally {
      setLoading(false);
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

  // Common select style with dropdown arrow
  const selectStyle = {
    width: '100%',
    padding: '13px 2.5rem 13px 14px',
    borderRadius: 10,
    border: '1.5px solid #e3e6ea',
    fontSize: 16,
    background: `#f8f9fc url('data:image/svg+xml;utf8,<svg fill="%23232323" height="24" viewBox="0 0 24 24" width="24" xmlns="http://www.w3.org/2000/svg"><path d="M7 10l5 5 5-5z"/><path d="M0 0h24v24H0z" fill="none"/></svg>') no-repeat right 0.5rem center`,
    outline: 'none',
    transition: 'border 0.2s',
    boxSizing: 'border-box',
    appearance: 'none',
  };

  // Responsive layout logic
  const isStacked = isXs || isMobile || width < 700;
  const leftPanelPadding = isXs ? '24px 16px 0 16px' : isMobile ? '32px 12px 0 12px' : '0 0 0 7vw';
  const headingFontSize = isXs ? 22 : isMobile ? 28 : isSm ? 32 : 48;
  const cardPadding = isXs ? '20px 16px' : isMobile ? '32px 12px' : isSm ? '32px 16px' : '40px 36px';
  const cardMargin = isXs ? '0 16px' : isMobile ? '0 16px' : 0;
  const featureCardPadding = isXs ? '14px 10px' : isMobile ? '18px 18px' : '22px 32px';
  const featureCardMinWidth = isXs ? 120 : isMobile ? 140 : 180;
  const featureCardFontSize = isXs ? 13 : isMobile ? 14 : 15;
  const featureCardTitleSize = isXs ? 15 : isMobile ? 16 : 18;

  return (
    <>
      {showSuccess && (
        <Notification message="Registration successful! Welcome to EchoNest." type="success" duration={1200} onClose={() => setShowSuccess(false)} />
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
            <div className="echonest-auth-feature-card" style={{ background: '#fff', borderRadius: 14, boxShadow: '0 2px 12px rgba(106,17,203,0.06)', padding: 18, minWidth: featureCardMinWidth,}}>
              <div style={{ fontWeight: 700, fontSize: featureCardTitleSize, color: '#232323', marginBottom: 6 }}>24/7 Support</div>
              <div style={{ fontSize: featureCardFontSize, color: '#6b7a90' }}>Always here when you need us</div>
            </div>
            <div className="echonest-auth-feature-card" style={{ background: '#fff', borderRadius: 14, boxShadow: '0 2px 12px rgba(106,17,203,0.06)', padding: 18, minWidth: featureCardMinWidth, }}>
              <div style={{ fontWeight: 700, fontSize: featureCardTitleSize, color: '#232323', marginBottom: 6 }}>Private & Secure</div>
              <div style={{ fontSize: featureCardFontSize, color: '#6b7a90' }}>Your conversations stay confidential</div>
            </div>
          </div>
        </div>
        {/* Right Panel: Register/Profile Card */}
        <div className="echonest-auth-card-container" style={{ flex: 1, minWidth: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'linear-gradient(120deg, #f8fcff 0%, #f6faff 100%)', padding: 0 }}>
          <div className="echonest-auth-card" style={{ width: '100%', maxWidth: 400, background: '#fff', borderRadius: 18, boxShadow: '0 8px 32px rgba(106,17,203,0.10)', padding: '32px', margin: 0, display: 'flex', flexDirection: 'column', gap: 0, maxHeight: 600, overflowY: 'auto' }}>
            <div style={{ fontWeight: 700, fontSize: 26, marginBottom: 4, textAlign: 'center', letterSpacing: -0.5 }}>
              <span style={gradientTextStyle}>Create your account</span>
            </div>
            <div style={{ fontSize: 15, color: '#6b7a90', marginBottom: 28, textAlign: 'center' }}>
              Sign up to get started
            </div>
            <form onSubmit={handleRegister} style={{ display: 'flex', flexDirection: 'column', gap: 18, overflow: 'hidden',}} autoComplete="off">
              {/* Email */}
              <div style={{ position: 'relative' }}>
                <label htmlFor="email" style={{ display: 'block', fontSize: 15, fontWeight: 600, color: '#232323', marginBottom: 6 }}>Email *</label>
                <div style={{border: '1.5px solid #e3e6ea', background: '#f8f9fc', borderRadius: 10,}}>
                <span style={{ position: 'absolute', left: 14, top: 37, fontSize: 20, color: '#232323' }}><MdEmail /></span>
                <input
                  className="input-field-email"
                  id="email"
                  name="email"
                  type="email"
                  autoComplete="email"
                  required
                  value={registerForm.email}
                  onChange={e => setRegisterForm(f => ({ ...f, email: e.target.value }))}
                  style={{
                    width: '100%',
                    maxWidth: '341px',
                    padding: '13px 14px 13px 44px',
                    borderRadius: 10,
                    border: '0px solid #e3e6ea',
                    fontSize: 14,
                    background: '#f8f9fc',
                    outline: 'none',
                  }}
                  
                  placeholder="Enter your email"
                />
                </div>
              </div>
              {/* Password */}
              <div style={{ position: 'relative' }}>
                <label htmlFor="password" style={{ display: 'block', fontSize: 14, fontWeight: 600, color: '#232323', marginBottom: 6 }}>Password *</label>
                <div style={{border: '1.5px solid #e3e6ea', background: '#f8f9fc', borderRadius: 10,}}>
                <span style={{ position: 'absolute', left: 14, top: 37, fontSize: 20, color: '#232323' }}><MdLock /></span>
                <input
                  className="input-field-password"
                  id="password"
                  name="password"
                  type={showPassword ? 'text' : 'password'}
                  autoComplete="new-password"
                  required
                  value={registerForm.password}
                  onChange={e => { setRegisterForm(f => ({ ...f, password: e.target.value })); setPasswordTouched(true); }}
                  onFocus={() => setPasswordFocus(true)}
                  onBlur={() => setPasswordFocus(false)}
                  style={{
                    width: '100%',
                    maxWidth: '311px',
                    padding: '13px 44px 13px 44px',
                    borderRadius: 10,
                    border: '0px solid #e3e6ea',
                    fontSize: 14,
                    background: '#f8f9fc',
                    outline: 'none',
                  }}
                  placeholder="Enter your password"
                />
                </div>
                {/* Eye icon for show/hide */}
                <span
                  onClick={() => setShowPassword((v) => !v)}
                  style={{ position: 'absolute', right: 14, top: 37, color: '#232323', fontSize: 22, cursor: 'pointer', userSelect: 'none' }}
                  tabIndex={0}
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                >
                  {showPassword ? <MdVisibilityOff /> : <MdVisibility />}
                </span>
                {/* Password requirements card with fade animation */}
                <div
                  style={{
                    opacity: passwordFocus || passwordTouched ? 1 : 0,
                    maxHeight: passwordFocus || passwordTouched ? 500 : 0,
                    transition: 'opacity 0.3s, max-height 0.3s',
                    pointerEvents: passwordFocus || passwordTouched ? 'auto' : 'none',
                  }}
                >
                  <div style={{
                    background: '#f8f9fc',
                    borderRadius: 12,
                    padding: '12px',
                    marginTop: 8,
                    boxShadow: '0 1px 6px rgba(106,17,203,0.06)',
                    border: '1px solid #e3e6ea',
                  }}>
                    <ul style={{ listStyle: 'none', padding: 0, margin: 0, fontSize: 12 }}>
                      {passwordChecks.map((check, idx) => {
                        const passed = check.test(password);
                        return (
                          <li
                            key={check.label}
                            style={{
                              color: passed ? '#22c55e' : '#ef4444',
                              display: 'flex',
                              alignItems: 'center',
                              gap: 8,
                              fontWeight: passed ? 600 : 400,
                              transition: 'color 0.2s',
                            }}
                          >
                            <span style={{ fontSize: 12, transition: 'color 0.2s' }}>{passed ? '✅' : '❌'}</span> {check.label}
                          </li>
                        );
                      })}
                    </ul>
                    {/* Progress bar */}
                    <div style={{
                      height: 6,
                      background: '#e5e7eb',
                      borderRadius: 4,
                      marginTop: 14,
                      marginBottom: 2,
                      overflow: 'hidden',
                    }}>
                      <div
                        style={{
                          width: `${progress * 100}%`,
                          height: '100%',
                          background: 'linear-gradient(90deg, #22c55e 0%, #6a11cb 100%)',
                          borderRadius: 4,
                          transition: 'width 0.3s',
                        }}
                  />
                </div>
                  </div>
                  </div>
                </div>
              
              {/* Confirm Password */}
              <div style={{ position: 'relative' }}>
                <label htmlFor="confirmPassword" style={{ display: 'block', fontSize: 14, fontWeight: 600, color: '#232323', marginBottom: 6 }}>Confirm Password</label>
                <div style={{border: !confirmPassword || passwordsMatch ? '1.5px solid #e3e6ea' : '1.5px solid #ef4444', background: '#f8f9fc', borderRadius: 10,}}>
                <span style={{ position: 'absolute', left: 14, top: 37, fontSize: 20, color: '#232323' }}><MdLock /></span>
                <input
                className="input-field-password"
                  id="confirmPassword"
                  name="confirmPassword"
                  type={showConfirm ? 'text' : 'password'}
                  autoComplete="new-password"
                  required
                  value={registerForm.confirmPassword}
                  onChange={e => { setRegisterForm(f => ({ ...f, confirmPassword: e.target.value })); setConfirmTouched(true); }}
                  style={{
                    width: '100%',
                    //maxWidth: '311px',
                    padding: '13px 44px 13px 44px',
                    borderRadius: 10,
                    border: '0px solid #e3e6ea',
                    fontSize: 14,
                    background: '#f8f9fc',
                    outline: 'none',
                  }}
                  placeholder="Confirm your password"
                />
                </div>
                {/* Eye icon for show/hide */}
                <span
                  onClick={() => setShowConfirm((v) => !v)}
                  style={{ position: 'absolute', right: 14, top: 37, color: '#232323', fontSize: 22, cursor: 'pointer', userSelect: 'none' }}
                  tabIndex={0}
                  aria-label={showConfirm ? 'Hide password' : 'Show password'}
                >
                  {showConfirm ? <MdVisibilityOff /> : <MdVisibility />}
                </span>
                {/* Inline feedback for confirm password */}
                {confirmTouched && confirmPassword && !passwordsMatch && (
                  <div style={{ color: '#ef4444', fontSize: 13, marginTop: 6, display: 'flex', alignItems: 'center', gap: 6 }}>
                    <span style={{ fontSize: 16 }}>❌</span> Passwords do not match
              </div>
                )}
                {confirmTouched && confirmPassword && passwordsMatch && (
                  <div style={{ color: '#22c55e', fontSize: 13, marginTop: 6, display: 'flex', alignItems: 'center', gap: 6 }}>
                    <span style={{ fontSize: 16 }}>✅</span> Passwords match
              </div>
                )}
              </div>
              {registerError && <div style={{ color: '#dc2626', fontSize: 14, marginTop: 8 }}>{registerError}</div>}
                <button
                  type="submit"
                style={{
                  width: '100%',
                  padding: '14px 0',
                  border: 'none',
                  borderRadius: 10,
                  background: allValid && passwordsMatch ? 'linear-gradient(90deg, #2575fc 0%, #6a11cb 100%)' : '#e5e7eb',
                  color: allValid && passwordsMatch ? '#fff' : '#a1a1aa',
                  fontSize: 18,
                  fontWeight: 700,
                  cursor: allValid && passwordsMatch && !loading ? 'pointer' : 'not-allowed',
                  marginTop: 8,
                  transition: 'background 0.2s, box-shadow 0.2s',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: 8,
                }}
                disabled={!allValid || !passwordsMatch || loading}
              >
                {loading ? 'Registering...' : (<><span>Sign Up</span> <FiArrowRight style={{ fontSize: 22, marginLeft: 2 }} /></>)}
                </button>
              <div style={{ textAlign: 'center', fontSize: 14, marginTop: 16 }}>
                <a
                  href="/login"
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
                  Already have an account? Sign in
                </a>
              </div>
            </form>
          </div>
        </div>
      </div>
    </>
  );
}