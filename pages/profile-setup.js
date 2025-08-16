import { getSession } from "next-auth/react";
import { useState, useEffect } from "react";
import useBreakpoint from "../utils/useBreakpoint";
import ProfileSetupForm from "../components/ProfileSetupForm";

export async function getServerSideProps(context) {
  const session = await getSession(context);
  if (!session)
    return { redirect: { destination: "/login", permanent: false } };
  if (session.user.setupCompleted)
    return { redirect: { destination: "/dashboard", permanent: false } };
  return { props: {} };
}

export default function ProfileSetup() {
  const [isMobile, setIsMobile] = useState(false);
  const { isXs, isSm, width } = useBreakpoint();



  useEffect(() => {
    const checkMobile = () => setIsMobile(window.innerWidth < 900);
    checkMobile();
    window.addEventListener("resize", checkMobile);
    return () => window.removeEventListener("resize", checkMobile);
  }, []);

  useEffect(() => {
    const link = document.createElement("link");
    link.href =
      "https://fonts.googleapis.com/css2?family=Inter:wght@400;600;700&display=swap";
    link.rel = "stylesheet";
    document.head.appendChild(link);
    return () => {
      document.head.removeChild(link);
    };
  }, []);

  const gradientTextStyle = {
    background: "linear-gradient(90deg, #2575fc 0%, #6a11cb 100%)",
    WebkitBackgroundClip: "text",
    WebkitTextFillColor: "transparent",
    backgroundClip: "text",
    fontWeight: 800,
    letterSpacing: -0.5,
    display: "inline-block",
  };
  const iconStyle = {
    position: "absolute",
    left: 14,
    top: 37,
    color: "#6a11cb",
    fontSize: 20,
  };
  // Responsive layout logic
  const isStacked = isXs || isMobile || width < 700;
  const leftPanelPadding = isXs
    ? "24px 16px 0 16px"
    : isMobile
    ? "32px 12px 0 12px"
    : "0 0 0 7vw";
  const headingFontSize = isXs ? 22 : isMobile ? 28 : isSm ? 32 : 48;
  const cardPadding = isXs
    ? "20px 16px"
    : isMobile
    ? "32px 12px"
    : isSm
    ? "32px 16px"
    : "40px 36px";
  const cardMargin = isXs ? "0 16px" : isMobile ? "0 16px" : 0;
  const featureCardPadding = isXs
    ? "14px 10px"
    : isMobile
    ? "18px 18px"
    : "22px 32px";
  const featureCardMinWidth = isXs ? 120 : isMobile ? 140 : 180;
  const featureCardFontSize = isXs ? 13 : isMobile ? 14 : 15;
  const featureCardTitleSize = isXs ? 15 : isMobile ? 16 : 18;

  return (
    <>
      <div
        className="echonest-profile-setup-root"
        style={{
          minHeight: "100vh",
          background: "linear-gradient(120deg, #f6faff 0%, #f8fcff 100%)",
          display: "flex",
          flexDirection: "row",
          fontFamily: "system-ui, Arial, sans-serif",
          transition: "all 0.3s",
        }}
      >
        {/* Left Panel */}
        <div
          className="echonest-auth-left"
          style={{
            flex: 1,
            minWidth: 0,
            display: "flex",
            flexDirection: "column",
            justifyContent: "center",
            alignItems: "flex-start",
            padding: "0 0 0 7vw",
            textAlign: "left",
          }}
        >
          {/* Welcome Heading */}
          <h1
            className="echonest-auth-heading center-mobile"
            style={{
              fontSize: headingFontSize,
              fontWeight: 800,
              margin: 0,
              color: "#232323",
              letterSpacing: -1,
              lineHeight: 1.1,
            }}
          >
            Welcome to <span style={gradientTextStyle}>EchoNest</span>
          </h1>
          <p
            className="echonest-auth-description center-mobile"
            style={{
              fontSize: featureCardFontSize + 5,
              color: "#4b5563",
              margin: "24px 0 36px 0",
              maxWidth: 540,
              fontWeight: 400,
            }}
          >
            Your AI-powered therapy companion. Find support, guidance, and
            healing through personalized conversations designed to help you
            thrive.
          </p>
          {/* Feature Cards */}
          <div
            className="echonest-auth-feature-cards"
            style={{
              display: "flex",
              gap: isXs ? 10 : 24,
              flexDirection: isStacked ? "column" : "row",
              width: isStacked ? "100%" : "auto",
              maxWidth: 600,
            }}
          >
            <div
              className="echonest-auth-feature-card"
              style={{
                background: "#fff",
                borderRadius: 14,
                boxShadow: "0 2px 12px rgba(106,17,203,0.06)",
                padding: 18,
                minWidth: featureCardMinWidth,
              }}
            >
              <div
                style={{
                  fontWeight: 700,
                  fontSize: featureCardTitleSize,
                  color: "#232323",
                  marginBottom: 6,
                }}
              >
                24/7 Support
              </div>
              <div style={{ fontSize: featureCardFontSize, color: "#6b7a90" }}>
                Always here when you need us
              </div>
            </div>
            <div
              className="echonest-auth-feature-card"
              style={{
                background: "#fff",
                borderRadius: 14,
                boxShadow: "0 2px 12px rgba(106,17,203,0.06)",
                padding: 18,
                minWidth: featureCardMinWidth,
              }}
            >
              <div
                style={{
                  fontWeight: 700,
                  fontSize: featureCardTitleSize,
                  color: "#232323",
                  marginBottom: 6,
                }}
              >
                Private & Secure
              </div>
              <div style={{ fontSize: featureCardFontSize, color: "#6b7a90" }}>
                Your conversations stay confidential
              </div>
            </div>
          </div>
        </div>
        {/* Right Panel: Profile Setup Card */}
        <div
          className="echonest-profile-card-container"
          style={{
            flex: 1,
            minWidth: 0,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            background: "linear-gradient(120deg, #f8fcff 0%, #f6faff 100%)",
            padding: 0,
          }}
        >
          <div
            className="echonest-profile-card"
            style={{
              width: "100%",
              maxWidth: 400,
              background: "#fff",
              borderRadius: 18,
              boxShadow: "0 8px 32px rgba(106,17,203,0.10)",
              padding: "32px",
              margin: 0,
              display: "flex",
              flexDirection: "column",
              gap: 0,
              maxHeight: 600,
              overflowY: "auto",
            }}
          >
            <div
              style={{
                fontWeight: 700,
                fontSize: 26,
                marginBottom: 4,
                textAlign: "center",
                letterSpacing: -0.5,
              }}
            >
              <span style={gradientTextStyle}>Set up your profile</span>
            </div>
            <div
              style={{
                fontSize: 15,
                color: "#6b7a90",
                marginBottom: 28,
                textAlign: "center",
              }}
            >
              Tell us a bit about yourself to personalize your journey.
            </div>
            <ProfileSetupForm />
          </div>
        </div>
      </div>
    </>
  );
}
