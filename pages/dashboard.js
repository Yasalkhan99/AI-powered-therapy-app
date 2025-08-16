import { useSession } from "next-auth/react";
import { useRouter } from "next/router";
import { useEffect, useState } from "react";
import { BellIcon } from "@heroicons/react/24/outline";
import {
  MicrophoneIcon,
  CalendarDaysIcon,
  ChatBubbleLeftRightIcon,
  CheckCircleIcon,
} from "@heroicons/react/24/solid";
import useBreakpoint from "../utils/useBreakpoint";
import useSWR from "swr";
import Notification from "../components/Notification";
import { signOut } from "next-auth/react";
import { Circles } from "react-loader-spinner";
import EditProfileModal from "../components/EditProfileModal";
import ProfileSetupForm from "../components/ProfileSetupForm";
//import { color } from 'html2canvas/dist/types/css/types/color';

const fetcher = (url) => fetch(url).then((res) => res.json());

function getStartOfWeek(date) {
  const d = new Date(date);
  const day = d.getDay();
  const diff = d.getDate() - day + (day === 0 ? -6 : 1); // Monday as first day
  return new Date(d.setDate(diff));
}

function isSameDay(d1, d2) {
  return (
    d1.getFullYear() === d2.getFullYear() &&
    d1.getMonth() === d2.getMonth() &&
    d1.getDate() === d2.getDate()
  );
}

// Utility to format hours and minutes
function formatHoursMinutes(hours) {
  const totalMinutes = Math.round(hours * 60);
  const h = Math.floor(totalMinutes / 60);
  const m = totalMinutes % 60;
  return `${h}h ${m}m`;
}

const MOODS = [
  { label: "Great", icon: "😊", color: "#22c55e" },
  { label: "Good", icon: "🙂", color: "#2563eb" },
  { label: "Okay", icon: "😐", color: "#eab308" },
  { label: "Low", icon: "🙁", color: "#f97316" },
  { label: "Difficult", icon: "😞", color: "#ef4444" },
];
const ACTIVITIES = [
  "Exercise",
  "Meditation",
  "Reading",
  "Socializing",
  "Work",
  "Sleep",
  "Eating well",
  "Creative activities",
];

export async function getServerSideProps(context) {
  // Only check auth, let SWR handle data fetching
  const { getSession } = await import("next-auth/react");
  const session = await getSession(context);
  if (!session)
    return { redirect: { destination: "/login", permanent: false } };
  if (!session.user.setupCompleted)
    return { redirect: { destination: "/profile-setup", permanent: false } };
  return { props: {} };
}

export default function Dashboard() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [checkinLoading, setCheckinLoading] = useState(false);
  const [checkinError, setCheckinError] = useState("");
  const [checkinMood, setCheckinMood] = useState(7);
  const [checkinEnergy, setCheckinEnergy] = useState("Medium");
  const [notification, setNotification] = useState(null);
  const {
    breakpoint,
    isXs,
    isMobile,
    isSm,
    isMd,
    isLg,
    isXl,
    is2xl,
    width,
    isStacked,
  } = useBreakpoint();
  const refreshKey =
    typeof window !== "undefined" && window.location.search.includes("refresh=")
      ? "/api/dashboard/stats" + window.location.search
      : "/api/dashboard/stats";
  const { data, mutate } = useSWR(refreshKey, fetcher, {
    refreshInterval: 10000, // auto-refresh every 10 seconds
    revalidateOnFocus: true, // revalidate when window is focused
  });
  const [askOpen, setAskOpen] = useState(false);
  const [checkinModalOpen, setCheckinModalOpen] = useState(false);
  const [checkinStep, setCheckinStep] = useState(0);
  const [selectedMood, setSelectedMood] = useState(null);
  const [selectedActivities, setSelectedActivities] = useState([]);
  const [checkinNotes, setCheckinNotes] = useState("");
  const [editProfileOpen, setEditProfileOpen] = useState(false);

  if (!data)
    return (
      <div
        style={{
          minHeight: "100vh",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: "#fff",
          zIndex: 9999,
          position: "fixed",
          top: 0,
          left: 0,
          width: "100vw",
          height: "100vh",
        }}
      >
        <Circles color="#7c3aed" height={80} width={80} />
      </div>
    );
  const { sessions = [], checkins = [], voiceSetups = [], stats = {}, weekly = [] } = data;
  const profile = session?.user || {};

  // Responsive layout logic
  const headerPadding = isXs
    ? "10px 8px"
    : isMobile
      ? "12px 12px"
      : isSm
        ? "16px 18px"
        : "16px 32px";
  const headerFontSize = isXs ? 18 : isMobile ? 20 : 24;
  const cardPadding = isXs
    ? "12px 8px"
    : isMobile
      ? "18px 12px"
      : isSm
        ? "24px 18px"
        : "32px 24px";
  const statsGridCols = isXs ? 1 : isMobile ? 2 : isSm ? 2 : isMd ? 3 : 4;
  const statsCardFontSize = isXs ? 13 : isMobile ? 14 : 15;
  const statsCardTitleSize = isXs ? 14 : isMobile ? 15 : 16;
  const statsCardValueSize = isXs ? 18 : isMobile ? 20 : 24;
  const mainPadding = isXs
    ? "10px 2px"
    : isMobile
      ? "16px 8px"
      : isSm
        ? "24px 16px"
        : "32px 32px";
  const mainContainerPadding = isXs
    ? "12px 2px"
    : isMobile
      ? "18px 8px"
      : "32px 0";

  // Gradient text style for brand
  const gradientTextStyle = {
    background: "linear-gradient(90deg, #2575fc 0%, #6a11cb 100%)",
    WebkitBackgroundClip: "text",
    WebkitTextFillColor: "transparent",
    backgroundClip: "text",
    fontWeight: 800,
    letterSpacing: -0.5,
    display: "inline-block",
  };

  // Helper for maxWidth logic
  const sectionMaxWidth = 1360;
  const sectionWidth = 1360;

  // Handle daily check-in submit
  const handleCheckin = async (e) => {
    e.preventDefault();
    setCheckinLoading(true);
    setCheckinError("");
    try {
      const res = await fetch("/api/user/checkin", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ mood: checkinMood, energy: checkinEnergy }),
      });
      if (!res.ok) {
        const data = await res.json();
        if (res.status === 429) {
          // 24-hour restriction error
          setNotification({
            message: data.error,
            type: "warning",
            duration: 4000,
          });
        } else {
          setCheckinError(data.error || "Check-in failed");
        }
      } else {
        setCheckinMood(7);
        setCheckinEnergy("Medium");
        setNotification({
          message: "Check-in submitted successfully!",
          type: "success",
          duration: 4000,
        });
        mutate(); // Refresh dashboard data
      }
    } catch (err) {
      setCheckinError("Check-in failed");
    } finally {
      setCheckinLoading(false);
    }
  };

  // Helper for time ago
  function timeAgo(dateString) {
    const now = new Date();
    const date = new Date(dateString);
    const diff = Math.floor((now - date) / 1000);
    if (diff < 60) return `${diff}s ago`;
    if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
    if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
    if (diff < 172800) return "Yesterday";
    return date.toLocaleDateString();
  }

  // Stats cards with safe defaults
  const statsCards = [
    {
      label: "Sessions This Week",
      value: stats.sessionsThisWeek || 0,
      change: "+20% from last week",
      color: "#2563eb",
      icon: (
        <img
          src="https://cdn.prod.website-files.com/6846fdc25de73b0e19544b07/6856d8b613760a2f76b1b8a9_message.svg"
          alt="Sessions This Week"
          width={20}
          height={20}
        />
      ),
    },
    {
      label: "Average Mood",
      value:
        stats.averageMood && stats.averageMood !== "0.0"
          ? stats.averageMood + "/10"
          : "5/10",
      change: "+0.5 improvement",
      color: "#dc2626",
      icon: (
        <img
          src="https://cdn.prod.website-files.com/6846fdc25de73b0e19544b07/6883c479fc54da546b6a2716_heart.svg"
          alt="Average Mood"
          width={20}
          height={20}
        />
      ),
    },
    {
      label: "Streak",
      value: (stats.streak || 0) + ((stats.streak || 0) === 1 ? " day" : " days"),
      change: (stats.streak || 0) > 0 ? "Personal best!" : "",
      color: "#7c3aed",
      icon: (
        <img
          src="https://cdn.prod.website-files.com/6846fdc25de73b0e19544b07/6883c707c26c743da9bc9fac_generated-svg-image%20(1)%2013.svg"
          alt="Streak"
          width={20}
          height={20}
        />
      ),
    },
    {
      label: "Total Hours",
      value: formatHoursMinutes(Number(stats.totalHours || 0)),
      change: "This month",
      color: "#f59e42",
      icon: (
        <img
          src="https://cdn.prod.website-files.com/6846fdc25de73b0e19544b07/6883c479f53d33ceae334735_clock.svg"
          alt="Total Hours"
          width={20}
          height={20}
        />
      ),
    },
  ];

  // --- UI ---
  // Header height for fixed header
  const HEADER_HEIGHT = 42;
  // Helper for consistent font sizes
  const fontSizes = {
    sectionTitle: 22,
    cardTitle: 18,
    cardValue: 24,
    statLabel: 15,
    statValue: 18,
    small: 14,
    xsmall: 12,
  };

  // Handler for Daily Check-in button in Ask EchoNest popup
  const openCheckinModal = () => {
    setAskOpen(false);
    setCheckinModalOpen(true);
    setCheckinStep(0);
    setSelectedMood(null);
    setSelectedActivities([]);
    setCheckinNotes("");
  };

  // Handler for completing check-in (submit to API, etc.)
  const handleCompleteCheckin = () => {
    // TODO: Submit check-in data to API
    setCheckinModalOpen(false);
    // Optionally show a notification
    setNotification({
      message: "Check-in completed!",
      type: "success",
      duration: 4000,
    });
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
      // Check if user has voice setup
      try {
        console.log('Checking voice setup for appointment...');
        const setupRes = await fetch('/api/voice/session-setup?last=1');
        console.log('Appointment setup response status:', setupRes.status);
        
        if (setupRes.ok) {
          const setupData = await setupRes.json();
          console.log('Appointment setup data:', setupData);
          
          if (setupData.setup) {
            console.log('User has setup, redirecting to voice page');
            // User has setup, go directly to voice page
            router.push('/voice');
          } else {
            console.log('No setup found, redirecting to voice setup');
            // User needs setup, go to voice setup
            router.push('/voice-setup');
          }
        } else {
          console.log('Error response from setup API for appointment');
          // Error checking setup, go to voice setup
          router.push('/voice-setup');
        }
      } catch (err) {
        console.error('Error checking voice setup:', err);
        router.push('/voice-setup');
      }
    }
  };

  return (
    <div
      className="echonest-dashboard"
      style={{
        minHeight: "100vh",
        background: "#f7faff",
        position: "relative",
        display: "flex",
        flexDirection: "column",
        fontFamily: "system-ui, Arial, sans-serif",
      }}
    >
      {/* Notification */}
      {notification && (
        <Notification
          message={notification.message}
          type={notification.type}
          duration={notification.duration}
          onClose={() => setNotification(null)}
        />
      )}

      {/* Fixed Header */}
      <header
        className="echonest-dashboard-header"
        style={{
          position: "fixed",
          top: 0,
          left: 0,
          width: "100%",
          height: HEADER_HEIGHT,
          background: "white",
          boxShadow: "0 2px 8px rgba(0,0,0,0.04)",
          zIndex: 100,
          display: "flex",
          flexDirection: isXs ? "column" : "row",
          alignItems: "center",
          justifyContent: "space-between",
          gap: isXs ? 8 : 0,
          padding: "12px 0px",
        }}
      >
        <div
          className="headercontent"
          style={{
            display: "flex",
            justifyContent: "space-between",
            width: "100%",
            margin: "auto",
            maxWidth: "1360px",
          }}
        >
          <a
            href="https://www.echonest.co.uk"
            target="_blank"
            rel="noopener noreferrer"
            style={{ color: "#000000", textDecoration: "none" }}
          >
            <div
              className="echonest-dashboard-header-logo"
              style={{ display: "flex", alignItems: "center", gap: 8 }}
            >
              <span style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <img
                  src="https://cdn.prod.website-files.com/6846fdc25de73b0e19544b07/6857c535164b231f0aed6629_265x256.png"
                  alt="EchoNest Logo"
                  style={{
                    height: 38,
                    width: 38,
                    objectFit: "contain",
                    borderRadius: 8,
                  }}
                />
                <span
                  style={{
                    fontSize: fontSizes.sectionTitle,
                    fontWeight: "bold",
                    //background: 'linear-gradient(90deg, 4754EB 0%, 8E35EA 100%)',
                    WebkitBackgroundClip: "text",
                    backgroundClip: "text",
                  }}
                >
                  EchoNest
                </span>
              </span>
            </div>
          </a>
          <button
            onClick={() => signOut()}
            style={{
              background: "#2563eb",
              color: "white",
              border: "none",
              borderRadius: 8,
              padding: "8px 20px",
              fontWeight: 400,
              fontSize: 15,
              cursor: "pointer",
              transition: "background 0.2s",
            }}
          >
            Logout
          </button>
        </div>
      </header>

      {/* Welcome & Therapy Profile */}
      <div
        className="echonest-dashboard-section"
        style={{ maxWidth: 1360, width: "100%", margin: "96px auto 0" }}
      >
        <div
          className="echonest-dashboard-title"
          style={{
            fontSize: 32,
            fontWeight: 700,
            color: "#111827",
            marginBottom: 4,
          }}
        >
          Welcome back, {profile.fullName?.split(" ")[0] || "User"}!
        </div>
        <div
          className="echonest-dashboard-subtitle"
          style={{ color: "#6b7280", fontSize: 18, marginBottom: 24 }}
        >
          Here's your mental health journey overview for today.
        </div>
        {/* Therapy Profile Card */}
        <div
          className="echonest-dashboard-profile-card"
          style={{
            background: "white",
            borderRadius: 8,
            border: "1.5px solid #e5e7eb",
            padding: 24,
            marginBottom: 32,
          }}
        >
          <div
            className="echonest-dashboard-profile-title"
            style={{
              display: "flex",
              alignItems: "center",
              fontWeight: 600,
              fontSize: 24,
              marginBottom: 24,
              justifyContent: "space-between",
            }}
          >
            <span
              style={{
                color: "#2563eb",
                marginRight: 10,
                marginTop: 6,
                fontSize: 28,
              }}
            >
              <img
                src="https://cdn.prod.website-files.com/6846fdc25de73b0e19544b07/6883c85bd35c55ccf6eca520_person.svg"
                alt="Profile"
                width={28}
                height={28}
              />
            </span>
            Your Therapy Profile
            <button
              className="echonest-dashboard-profile-title-button"
              onClick={() => setEditProfileOpen(true)}
              style={{
                fontFamily: "system-ui, Arial, sans-serif",
                marginLeft: "auto",
                display: "flex",
                alignItems: "center",
                gap: "8px",
                padding: "8px 16px",
                backgroundColor: "#ffffff",
                border: "1px solid #e5e7eb",
                borderRadius: "8px",
                fontWeight: "500",
                fontSize: "14px",
                color: "#374151",
                cursor: "pointer",
                transition: "all 0.2s ease",
                outline: "none",
              }}
              onMouseOver={(e) => {
                e.target.style.backgroundColor = "#f9fafb";
              }}
              onMouseOut={(e) => {
                e.target.style.backgroundColor = "#ffffff";
              }}
            >
              <svg
                width="16"
                height="16"
                fill="none"
                viewBox="0 0 24 24"
                style={{ flexShrink: 0 }}
              >
                <path
                  d="M3 17.25V21h3.75l11.06-11.06-3.75-3.75L3 17.25zM20.71 7.04a1.003 1.003 0 0 0 0-1.42l-2.34-2.34a1.003 1.003 0 0 0-1.42 0l-1.83 1.83 3.75 3.75 1.84-1.82z"
                  fill="#6b7280"
                />
              </svg>
              Edit Profile
            </button>
          </div>
          <div
            className="echonest-dashboard-profile-fields"
            style={{
              display: "grid !important",
              gap: 16,
              fontSize: 17,
              fontWeight: 500,
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <img
                src="https://cdn.prod.website-files.com/6846fdc25de73b0e19544b07/6883c479dc98814bb5ac5f7e_brain.svg"
                alt="Focus Area"
                width={20}
                height={20}
              />
              <div>
                <div style={{ color: "#6b7280", fontSize: 15 }}>Focus Area</div>
                <div style={{ color: "#7c3aed", fontWeight: 600 }}>
                  {profile.therapyFocus || "N/A"}
                </div>
              </div>
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <img
                src="https://cdn.prod.website-files.com/6846fdc25de73b0e19544b07/6883c479fc54da546b6a2716_heart.svg"
                alt="Therapy Type"
                width={20}
                height={20}
              />
              <div>
                <div style={{ color: "#6b7280", fontSize: 15 }}>
                  Therapy Type
                </div>
                <div style={{ color: "#dc2626", fontWeight: 600 }}>
                  {profile.therapyType || "N/A"}
                </div>
              </div>
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <img
                src="https://cdn.prod.website-files.com/6846fdc25de73b0e19544b07/6883c47978c0642e26d42a25_world.svg"
                alt="Location"
                width={20}
                height={20}
              />
              <div>
                <div style={{ color: "#6b7280", fontSize: 15 }}>Location</div>
                <div style={{ color: "#059669", fontWeight: 600 }}>
                  {profile.country || "N/A"}
                </div>
              </div>
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <img
                src="https://cdn.prod.website-files.com/6846fdc25de73b0e19544b07/6883c85bd35c55ccf6eca520_person.svg"
                alt="Profile"
                width={20}
                height={20}
              />
              <div>
                <div style={{ color: "#6b7280", fontSize: 15 }}>Profile</div>
                <div style={{ color: "#2563eb", fontWeight: 600 }}>
                  {profile.age ? profile.age + " • " : ""}
                  {profile.gender || ""}
                </div>
              </div>
            </div>
          </div>
        </div>
        {/* Main Actions */}
        <div
          className="echonest-dashboard-actions"
          style={{
            display: "flex",
            flexWrap: "nowrap",
            gap: 24,
            justifyContent: "center",
            marginBottom: 32,
          }}
        >
          <div
            style={{
              background: "#fff",
              width: "100%",
              borderRadius: 8,
              border: "1.5px solid #e5e7eb",
              padding: 24,
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              cursor: "pointer",
              transition: "border 0.2s",
              minWidth: 260,
              margin: isXs || isMobile ? "8px" : 0,
            }}
            onClick={() => router.push("/chat")}
            tabIndex={0}
            onKeyPress={(e) => {
              if (e.key === "Enter") router.push("/chat");
            }}
            role="button"
            aria-label="Start Chat Session"
          >
            <span style={{ marginBottom: 10 }}>
              <img
                src="https://cdn.prod.website-files.com/6846fdc25de73b0e19544b07/6856d8b613760a2f76b1b8a9_message.svg"
                alt="EchoNest Logo"
                style={{
                  height: 44,
                  width: 44,
                  objectFit: "contain",
                  borderRadius: 8,
                }}
              />
            </span>
            <div style={{ fontSize: 20, fontWeight: 600, marginBottom: 4 }}>
              Start Chat Session
            </div>
            <div style={{ color: "#6b7280", fontSize: 14 }}>
              Begin a text-based therapy session
            </div>
          </div>
          <div
            // className="disabled-card"
            style={{
              background: "#fff",
              width: "100%",
              borderRadius: 8,
              border: "1.5px solid #e5e7eb",
              padding: 24,
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              cursor: "pointer",
              transition: "border 0.2s",
              minWidth: 260,
            }}
            onClick={async () => {
              // Check if user has voice setup
              try {
                console.log('Checking voice setup...');
                const setupRes = await fetch('/api/voice/session-setup?last=1');
                console.log('Setup response status:', setupRes.status);
                
                if (setupRes.ok) {
                  const setupData = await setupRes.json();
                  console.log('Setup data:', setupData);
                  
                  if (setupData.setup) {
                    console.log('User has setup, redirecting to voice page');
                    // User has setup, go directly to voice page
                    router.push('/voice');
                  } else {
                    console.log('No setup found, redirecting to voice setup');
                    // User needs setup, go to voice setup
                    router.push('/voice-setup');
                  }
                } else {
                  console.log('Error response from setup API');
                  // Error checking setup, go to voice setup
                  router.push('/voice-setup');
                }
              } catch (err) {
                console.error('Error checking voice setup:', err);
                router.push('/voice-setup');
              }
            }}
            tabIndex={0}
            onKeyPress={(e) => {
              if (e.key === "Enter") router.push("/voice-setup");
            }}
            role="button"
            aria-label="Start Voice Session"
          >
            <span style={{ marginBottom: 10 }}>
              <img
                src="https://cdn.prod.website-files.com/6846fdc25de73b0e19544b07/6856d8b60a71770c9f797801_mic.svg"
                alt="EchoNest Logo"
                style={{
                  height: 44,
                  width: 44,
                  objectFit: "contain",
                  borderRadius: 8,
                }}
              />
            </span>
            <div style={{ fontSize: 20, fontWeight: 600, marginBottom: 4 }}>
              Voice Session
            </div>
            <div style={{ color: "#6b7280", fontSize: 14 }}>
              Talk naturally with EchoNest
            </div>
          </div>
          <div
            style={{
              background: "white",
              width: "100%",
              borderRadius: 8,
              border: "1.5px solid #e5e7eb",
              padding: 32,
              display: "none",
              flexDirection: "column",
              alignItems: "center",
              cursor: "pointer",
              transition: "border 0.2s",
              minWidth: 260,
            }}
            onClick={() => router.push("/appointments")}
            tabIndex={0}
            onKeyPress={(e) => {
              if (e.key === "Enter") router.push("/appointments");
            }}
            role="button"
            aria-label="Book Appointment"
          >
            <span
              style={{
                display: "inline-block",
                width: 40,
                height: 40,
                color: "#22c55e",
                marginBottom: 8,
              }}
            >
              <CalendarDaysIcon className="h-10 w-10" />
            </span>
            <div style={{ fontSize: 20, fontWeight: 600, marginBottom: 4 }}>
              Book Appointment
            </div>
            <div style={{ color: "#6b7280", fontSize: 14 }}>
              Schedule your next session
            </div>
          </div>
        </div>
      </div>

      {/* Stats Cards */}
      <div
        className="echonest-dashboard-stats"
        style={{
          maxWidth: 1360,
          width: "100%",
          margin: "0px auto 0",
          display: "flex",
          flexWrap: "wrap",
          gap: isXs ? 8 : isMobile ? 12 : 24,
          marginBottom: isXs ? 12 : 0,
          justifyContent: "center",
        }}
      >
        {statsCards.map((stat, idx) => (
          <div
            key={idx}
            style={{
              background: "white",
              borderRadius: 8,
              border: "1.5px solid #e5e7eb",
              padding: 24,
              display: "flex",
              flexDirection: "column",
              justifyContent: "space-between",
              minWidth: isXs ? 180 : isMobile ? 200 : 220,
              flex: "1 1 180px",
              position: "relative",
            }}
          >
            {/* Icon positioned in top right corner */}
            <div style={{ position: "absolute", top: 16, right: 16 }}>
              {stat.icon}
            </div>
            {/* Title */}
            <div
              style={{
                fontSize: fontSizes.statLabel,
                color: "#6b7280",
                fontWeight: 500,
                marginBottom: 8,
              }}
            >
              {stat.label}
            </div>
            {/* Value */}
            <div
              style={{
                fontSize: fontSizes.cardValue,
                fontWeight: "bold",
                color: stat.color,
              }}
            >
              {stat.value}
            </div>
            {/* <div style={{ fontSize: fontSizes.xsmall, color: '#9ca3af', marginTop: 4 }}>{stat.change}</div> */}
          </div>
        ))}
      </div>

      {/* Weekly Progress Overview */}
      <div
        className="echonest-dashboard-weekly"
        style={{
          maxWidth: 1300,
          width: "100%",
          margin: "32px auto 0",
          background: "white",
          borderRadius: 8,
          border: "1.5px solid #e5e7eb",
          padding: isXs ? 12 : 24,
          marginBottom: 32,
        }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 8,
            marginBottom: 8,
          }}
        >
          <img
            src="https://cdn.prod.website-files.com/6846fdc25de73b0e19544b07/6871feb1018f012fc2dab892_Vectors.svg"
            alt="EchoNest Logo"
            style={{
              height: 24,
              width: 24,
              objectFit: "contain",
              borderRadius: 8,
            }}
          />

          <span
            style={{
              fontWeight: 700,
              fontSize: fontSizes.sectionTitle,
              color: "#111827",
            }}
          >
            Weekly Progress Overview
          </span>
        </div>
        <div
          style={{
            color: "#6b7280",
            fontSize: fontSizes.small,
            marginBottom: 24,
          }}
        >
          Your mood and session activity this week
        </div>
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            gap: 12,
            flexWrap: "wrap",
          }}
        >
          {weekly.map((day, idx) => {
            // Determine if this is the current day
            const today = new Date();
            const weekDay = today.toLocaleString("en-US", { weekday: "short" });
            const isToday = day.day === weekDay;
            const moodValue =
              Number(day.mood) && Number(day.mood) > 0
                ? Number(day.mood)
                : isToday
                  ? 5
                  : 0;
            return (
              <div
                key={day.day}
                style={{
                  flex: "1 1 0",
                  minWidth: 120,
                  textAlign: "center",
                  margin: "0 4px",
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "center",
                  justifyContent: "flex-end",
                }}
              >
                <div
                  style={{
                    fontWeight: 600,
                    color: "#374151",
                    marginBottom: 10,
                    fontSize: fontSizes.statLabel,
                  }}
                >
                  {day.day}
                </div>
                <div
                  style={{
                    minWidth: 70,
                    minHeight: 100,
                    width: "100%",
                    background: "#9DCAFD",
                    borderRadius: 8,
                    display: "flex",
                    alignItems: "end",
                    justifyContent: "center",
                  }}
                >
                  {/* Bar */}
                  <div
                    style={{
                      width: "94%",
                      height: `${10 + (moodValue / 10) * 80}px`, // 20px min, 100px max, default mood 5 for today only
                      background: "#2563EB",
                      borderRadius: 4,
                      marginBottom: 5,
                      boxShadow: "0 2px 8px rgba(37,99,235,0.08)",
                      transition: "height 0.3s",
                    }}
                  />
                </div>

                <div
                  style={{
                    color: "#2563eb",
                    fontWeight: 600,
                    fontSize: 12,
                    margin: "4px 0",
                  }}
                >
                  {moodValue}/10
                </div>
                <div
                  style={{
                    color: "#000000",
                    fontSize: 12,
                    marginTop: 2,
                    fontWeight: 500,
                    background: "#f3f4f6",
                    borderRadius: 50,
                    padding: "2px 10px",
                    display: "inline-block",
                  }}
                >
                  {day.sessions} session{day.sessions === 1 ? "" : "s"}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Recent Activities & Daily Check-in (side by side on desktop, stacked on mobile) */}
      <div
        className="echonest-dashboard-activities"
        style={{
          maxWidth: 1360,
          width: "100%",
          margin: "32px auto 32px",
          display: "flex",
          flexDirection: width >= 900 ? "row" : "column",
          gap: 24,
        }}
      >
        {/* Recent Activities */}
        <div
          style={{
            flex: 1,
            background: "white",
            borderRadius: 8,
            border: "1.5px solid #e5e7eb",
            padding: 24,
            marginBottom: width < 900 ? 24 : 0,
            minWidth: 0,
          }}
        >
          <div
            style={{
              fontSize: fontSizes.cardTitle,
              fontWeight: 600,
              color: "#111827",
              marginBottom: 8,
            }}
          >
            Recent Activities
          </div>
          <div
            style={{
              color: "#6b7280",
              fontSize: fontSizes.small,
              marginBottom: 16,
            }}
          >
            Your latest therapy sessions and milestones
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
            {/* Always show a card for chat and voice, even if no activity */}
            {(() => {
                const latestChat = sessions.find((s) => s.type !== "voice");
  const latestVoice = voiceSetups && voiceSetups.length > 0 ? voiceSetups.find(vs => vs.sessionEndedAt) : sessions.find((s) => s.type === "voice");
              return (
                <>
                  <div
                    key={latestChat ? latestChat.id : "no-chat"}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      borderRadius: 8,
                      padding: 16,
                      background: "#eff6ff",
                      marginBottom: 0,
                    }}
                  >
                    <img
                      src="https://cdn.prod.website-files.com/6846fdc25de73b0e19544b07/6856d8b613760a2f76b1b8a9_message.svg"
                      alt="EchoNest Logo"
                      style={{
                        height: 24,
                        width: 24,
                        objectFit: "contain",
                        borderRadius: 8,
                      }}
                    />
                    <div style={{ marginLeft: 16 }}>
                      <div
                        style={{
                          fontWeight: 600,
                          color: "#1f2937",
                          fontSize: fontSizes.statLabel,
                        }}
                      >
                        Chat Session
                      </div>
                      <div
                        style={{ color: "#374151", fontSize: fontSizes.small }}
                      >
                        {latestChat
                          ? `${latestChat.title ||
                          latestChat.summary ||
                          "Therapy session"
                          } - ${timeAgo(latestChat.createdAt)}`
                          : "No recent activity yet."}
                      </div>
                    </div>
                  </div>
                  <div
                    key={latestVoice ? latestVoice.id : "no-voice"}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      borderRadius: 8,
                      padding: 16,
                      background: "#f5f3ff",
                      marginBottom: 0,
                    }}
                  >
                    <img
                      src="https://cdn.prod.website-files.com/6846fdc25de73b0e19544b07/6856d8b60a71770c9f797801_mic.svg"
                      alt="EchoNest Logo"
                      style={{
                        height: 24,
                        width: 24,
                        objectFit: "contain",
                        borderRadius: 8,
                      }}
                    />
                    <div style={{ marginLeft: 16 }}>
                      <div
                        style={{
                          fontWeight: 600,
                          color: "#1f2937",
                          fontSize: fontSizes.statLabel,
                        }}
                      >
                        Voice Session
                      </div>
                      <div
                        style={{ color: "#374151", fontSize: fontSizes.small }}
                      >
                        {latestVoice
                          ? `${latestVoice.therapistName || "Voice session"} - ${latestVoice.supportType || "Therapy"} - ${timeAgo(latestVoice.sessionEndedAt || latestVoice.createdAt)}`
                          : "No recent activity yet."}
                      </div>
                    </div>
                  </div>
                </>
              );
            })()}
            {/* Milestone Achieved (dynamic streak) */}
            <div
              style={{
                display: "flex",
                alignItems: "center",
                borderRadius: 8,
                padding: 16,
                background: "#ecfdf5",
                marginBottom: 0,
              }}
            >
              <img
                src="https://cdn.prod.website-files.com/6846fdc25de73b0e19544b07/6871fb99630a6b5552251f7d_generated-svg-image%20(1)%2014.svg"
                alt="EchoNest Logo"
                style={{
                  height: 24,
                  width: 24,
                  objectFit: "contain",
                  borderRadius: 8,
                }}
              />

              <div style={{ marginLeft: 16 }}>
                <div
                  style={{
                    fontWeight: 600,
                    color: "#1f2937",
                    fontSize: fontSizes.statLabel,
                  }}
                >
                  Milestone Achieved
                </div>
                <div style={{ color: "#374151", fontSize: fontSizes.small }}>
                  Completed {stats.streak || 0} {(stats.streak || 0) === 1 ? "day" : "days"}{" "}
                  streak - {(stats.streak || 0) > 0 ? "Today" : "No streak yet"}
                </div>
              </div>
            </div>
          </div>
        </div>
        {/* Daily Check-in */}
        <div
          style={{
            flex: 1,
            background: "white",
            borderRadius: 8,
            border: "1.5px solid #e5e7eb",
            padding: 24,
            minWidth: 0,
          }}
        >
          <div
            style={{
              fontSize: fontSizes.cardTitle,
              fontWeight: 600,
              color: "#111827",
              marginBottom: 8,
              display: "flex",
              alignItems: "center",
              gap: 8,
            }}
          >
            <svg
              width="20"
              height="20"
              fill="none"
              viewBox="0 0 24 24"
              stroke="#b91c1c"
              strokeWidth="2"
            >
              <path d="M19 14c1.49-1.46 3-3.21 3-5.5A5.5 5.5 0 0 0 16.5 3c-1.76 0-3 .5-4.5 2-1.5-1.5-2.74-2-4.5-2A5.5 5.5 0 0 0 2 8.5c0 2.3 1.5 4.05 3 5.5l7 7Z"></path>
            </svg>
            Daily Check-in
          </div>
          <div
            style={{
              color: "#6b7280",
              fontSize: fontSizes.small,
              marginBottom: 16,
            }}
          >
            How are you feeling today?
          </div>
          <form onSubmit={handleCheckin}>
            <div style={{ marginBottom: 16 }}>
              <div
                style={{
                  fontWeight: 500,
                  color: "#374151",
                  marginBottom: 10,
                  fontSize: fontSizes.statLabel,
                }}
              >
                Current Mood (1-10)
              </div>
              <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((n) => (
                  <button
                    type="button"
                    key={n}
                    onClick={() => setCheckinMood(n)}
                    style={{
                      width: 32,
                      height: 32,
                      borderRadius: "50%",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      fontWeight: 600,
                      border: "0px solid #d1d5db",
                      background: n === checkinMood ? "#2563eb" : "#f3f4f6",
                      color: n === checkinMood ? "white" : "#000000",
                      outline: "none",
                      fontSize: 14,
                      transition: "background 0.2s, color 0.2s, border 0.2s",
                    }}
                  >
                    {n}
                  </button>
                ))}
              </div>
            </div>
            <div style={{ marginBottom: 16 }}>
              <div
                style={{
                  fontWeight: 500,
                  color: "#374151",
                  marginBottom: 10,
                  fontSize: fontSizes.statLabel,
                }}
              >
                Energy Level
              </div>
              <div style={{ display: "flex", gap: 8 }}>
                {["Low", "Medium", "High"].map((level) => (
                  <button
                    type="button"
                    key={level}
                    onClick={() => setCheckinEnergy(level)}
                    style={{
                      padding: "4px 12px",
                      borderRadius: 999,
                      border: "0px solid #d1d5db",
                      color: checkinEnergy === level ? "#15803d" : "#6b7280",
                      background:
                        checkinEnergy === level ? "#dcfce7" : "#f9fafb",
                      fontWeight: checkinEnergy === level ? 600 : 400,
                      fontSize: fontSizes.small,
                    }}
                  >
                    {level}
                  </button>
                ))}
              </div>
            </div>
            {checkinError && (
              <div style={{ color: "red", marginBottom: 8 }}>
                {checkinError}
              </div>
            )}
            <button
              type="submit"
              disabled={checkinLoading}
              style={{
                width: "100%",
                background: "#181f2c",
                color: "white",
                padding: "10px 0",
                borderRadius: 8,
                fontWeight: 400,
                fontSize: 16,
                marginTop: 8,
                border: "none",
                cursor: "pointer",
                opacity: checkinLoading ? 0.7 : 1,
                transition: "background 0.2s",
              }}
            >
              Complete Check-in
            </button>
          </form>
        </div>
      </div>

      <style jsx global>{`
        @media (min-width: 768px) {
          button:hover {
            filter: brightness(1.08);
            box-shadow: 0 2px 12px rgba(37, 99, 235, 0.1);
            transition: box-shadow 0.18s, filter 0.18s;
          }
        }
      `}</style>

      {/* Edit Profile Modal */}
      <EditProfileModal
        isOpen={editProfileOpen}
        onClose={() => setEditProfileOpen(false)}
      >
        <ProfileSetupForm
          initialValues={profile}
          editMode={true}
          onSuccess={() => {
            setEditProfileOpen(false);
            mutate(); // Refresh dashboard data
            setNotification({
              message: "Profile updated successfully!",
              type: "success",
              duration: 4000,
            });
          }}
        />
      </EditProfileModal>

      {/* Notification */}
      {notification && (
        <Notification
          message={notification.message}
          type={notification.type}
          duration={notification.duration}
          onClose={() => setNotification(null)}
        />
      )}
    </div>
  );
}
