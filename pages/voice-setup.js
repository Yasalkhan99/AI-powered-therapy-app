import React, { useState, useEffect } from "react";
import { useRouter } from "next/router";
import {
  getVoiceForLanguage,
  getVoicesForLanguage,
} from "../utils/voiceConfig";

// Hardcoded data for therapists, languages, and support types
const THERAPISTS = [
  {
    id: "sarah",
    name: "Dr. Sarah Chen",
    rating: 4.9,
    region: "Asia Pacific",
    background: "Chinese-Canadian",
    languages: ["English", "Mandarin", "Cantonese"],
    specialties: ["Anxiety", "Depression", "+1"],
    description:
      "Specializes in cross-cultural therapy and mindfulness practices",
    avatar: "👩🏻‍⚕️",
  },
  {
    id: "ahmed",
    name: "Dr. Ahmed Hassan",
    rating: 4.8,
    region: "Middle East & Africa",
    background: "Egyptian-American",
    languages: ["English", "Arabic", "French"],
    specialties: ["Trauma", "Family Therapy", "+1"],
    description: "Expert in faith-based counseling and family dynamics",
    avatar: "👨🏽‍⚕️",
  },
  {
    id: "maria",
    name: "Dr. Maria Rodriguez",
    rating: 4.9,
    region: "Latin America",
    background: "Colombian-Spanish",
    languages: ["Spanish", "English", "Portuguese"],
    specialties: ["Relationships", "PTSD", "+1"],
    description: "Focuses on Latino mental health and relationship counseling",
    avatar: "👩🏽‍⚕️",
  },
  {
    id: "raj",
    name: "Dr. Raj Patel",
    rating: 4.7,
    region: "South Asia",
    background: "Indian-British",
    languages: ["English", "Hindi", "Gujarati"],
    specialties: ["Stress Management", "Career Counseling", "+1"],
    description:
      "Integrates traditional wellness practices with modern therapy",
    avatar: "👨🏽‍⚕️",
  },
  {
    id: "emily",
    name: "Dr. Emily Johnson",
    rating: 4.8,
    region: "North America",
    background: "African-American",
    languages: ["English"],
    specialties: ["Identity Issues", "Self-Esteem", "+1"],
    description: "Experienced in community-based therapy and empowerment",
    avatar: "👩🏾‍⚕️",
  },
  {
    id: "lars",
    name: "Dr. Lars Andersson",
    rating: 4.6,
    region: "Europe",
    background: "Swedish-Norwegian",
    languages: ["English", "Swedish", "Norwegian", "German"],
    specialties: ["Work-Life Balance", "Seasonal Disorders", "+1"],
    description:
      "Specializes in Nordic therapeutic approaches and seasonal wellness",
    avatar: "👨🏼‍⚕️",
  },
  {
    id: "yuki",
    name: "Dr. Yuki Tanaka",
    rating: 4.8,
    region: "East Asia",
    background: "Japanese-American",
    languages: ["English", "Japanese", "Korean"],
    specialties: ["Cultural Identity", "Academic Stress", "+1"],
    description:
      "Expert in East Asian cultural perspectives and academic pressure management",
    avatar: "👩🏻‍⚕️",
  },
  {
    id: "sophie",
    name: "Dr. Sophie Dubois",
    rating: 4.7,
    region: "Europe",
    background: "French-Belgian",
    languages: ["French", "English", "Dutch"],
    specialties: ["Relationship Therapy", "Life Transitions", "+1"],
    description:
      "Specializes in European therapeutic approaches and relationship dynamics",
    avatar: "👩🏼‍⚕️",
  },
  {
    id: "carlos",
    name: "Dr. Carlos Silva",
    rating: 4.6,
    region: "Latin America",
    background: "Brazilian-Portuguese",
    languages: ["Portuguese", "Spanish", "English"],
    specialties: ["Family Dynamics", "Cultural Integration", "+1"],
    description: "Focuses on Brazilian cultural context and family therapy",
    avatar: "👨🏽‍⚕️",
  },
  {
    id: "anna",
    name: "Dr. Anna Kowalski",
    rating: 4.7,
    region: "Central Europe",
    background: "Polish-German",
    languages: ["Polish", "German", "English"],
    specialties: ["Trauma Recovery", "Immigration Issues", "+1"],
    description: "Expert in Central European perspectives and trauma therapy",
    avatar: "👩🏼‍⚕️",
  },
  {
    id: "mikhail",
    name: "Dr. Mikhail Petrov",
    rating: 4.5,
    region: "Eastern Europe",
    background: "Russian-Ukrainian",
    languages: ["Russian", "Ukrainian", "English"],
    specialties: ["Post-Traumatic Stress", "Cultural Adaptation", "+1"],
    description:
      "Specializes in Eastern European cultural therapy and trauma recovery",
    avatar: "👨🏼‍⚕️",
  },
  {
    id: "fatima",
    name: "Dr. Fatima Al-Zahra",
    rating: 4.8,
    region: "Middle East",
    background: "Lebanese-Egyptian",
    languages: ["Arabic", "French", "English"],
    specialties: ["Women's Mental Health", "Cultural Identity", "+1"],
    description:
      "Expert in Middle Eastern women's mental health and cultural therapy",
    avatar: "👩🏽‍⚕️",
  },
  {
    id: "james",
    name: "Dr. James O'Connor",
    rating: 4.6,
    region: "North America",
    background: "Irish-American",
    languages: ["English", "Irish Gaelic"],
    specialties: ["Addiction Recovery", "Family Systems", "+1"],
    description:
      "Specializes in addiction therapy and family system approaches",
    avatar: "👨🏼‍⚕️",
  },
  {
    id: "priya",
    name: "Dr. Priya Sharma",
    rating: 4.7,
    region: "South Asia",
    background: "Indian-Canadian",
    languages: ["English", "Hindi", "Punjabi"],
    specialties: ["Intergenerational Trauma", "Cultural Integration", "+1"],
    description:
      "Expert in South Asian diaspora mental health and cultural therapy",
    avatar: "👩🏽‍⚕️",
  },
  {
    id: "hans",
    name: "Dr. Hans Mueller",
    rating: 4.5,
    region: "Central Europe",
    background: "German-Swiss",
    languages: ["German", "Swiss German", "English"],
    specialties: ["Work Stress", "Life Balance", "+1"],
    description:
      "Specializes in German-speaking therapeutic approaches and work-life balance",
    avatar: "👨🏼‍⚕️",
  },
];

const ALL_LANGUAGES = [
  "English",
  "Spanish",
  "Mandarin",
  "Hindi",
  "French",
  "Portuguese",
  "German",
  "Italian",
  "Japanese",
  "Korean",
  "Russian",
];

const SUPPORT_TYPES = [
  {
    id: "general",
    label: "General Support",
    desc: "Open conversation and emotional support",
  },
  {
    id: "anxiety",
    label: "Anxiety Management",
    desc: "Techniques for managing anxiety and stress",
  },
  {
    id: "depression",
    label: "Depression Support",
    desc: "Guidance through difficult emotional periods",
  },
  {
    id: "relationships",
    label: "Relationship Issues",
    desc: "Communication and relationship challenges",
  },
  {
    id: "career",
    label: "Career Guidance",
    desc: "Professional development and work stress",
  },
  {
    id: "trauma",
    label: "Trauma Processing",
    desc: "Safe space to process traumatic experiences",
  },
];

const PRIVACY = ["Standard", "Enhanced"];

export default function VoiceSessionSetup() {
  const router = useRouter();
  const [step, setStep] = useState(1);
  const [selectedTherapist, setSelectedTherapist] = useState(null);
  const [selectedLanguages, setSelectedLanguages] = useState([]);
  const [selectedSupport, setSelectedSupport] = useState(null);
  const [selectedVoice, setSelectedVoice] = useState(null);
  const [voiceGender, setVoiceGender] = useState("female");
  const [lastSetup, setLastSetup] = useState(null);
  const [loadingLast, setLoadingLast] = useState(true);
  const [showEdit, setShowEdit] = useState(false);
  const [confirmation, setConfirmation] = useState("");
  const [currentSlide, setCurrentSlide] = useState(0);
  const [isDragging, setIsDragging] = useState(false);
  const [startX, setStartX] = useState(0);
  const [currentX, setCurrentX] = useState(0);
  const [dragOffset, setDragOffset] = useState(0);

  // Calculate how many slides we need (responsive cards per slide)
  const [cardsPerSlide, setCardsPerSlide] = useState(3);
  const totalSlides = Math.ceil(THERAPISTS.length / cardsPerSlide);

  // Update cards per slide based on screen size
  useEffect(() => {
    const updateCardsPerSlide = () => {
      if (window.innerWidth <= 480) {
        setCardsPerSlide(1); // Mobile: 1 card per slide
      } else if (window.innerWidth <= 768) {
        setCardsPerSlide(2); // Tablet: 2 cards per slide
      } else {
        setCardsPerSlide(3); // Desktop: 3 cards per slide
      }
    };

    updateCardsPerSlide();
    window.addEventListener("resize", updateCardsPerSlide);
    return () => window.removeEventListener("resize", updateCardsPerSlide);
  }, []);

  // Load last setup on component mount
  useEffect(() => {
    fetchLastSetup();
  }, []);

  // Update voice options when language changes
  useEffect(() => {
    if (selectedLanguages.length > 0) {
      const language = selectedLanguages[0];
      const voices = getVoicesForLanguage(language);
      const defaultVoice = getVoiceForLanguage(language, voiceGender);
      setSelectedVoice(defaultVoice);
    }
  }, [selectedLanguages, voiceGender]);

  // Navigation functions for slider
  const nextSlide = () => {
    setCurrentSlide((prev) => (prev + 1) % totalSlides);
  };

  const prevSlide = () => {
    setCurrentSlide((prev) => (prev - 1 + totalSlides) % totalSlides);
  };

  const goToSlide = (slideIndex) => {
    setCurrentSlide(slideIndex);
  };

  // Get current cards to display
  const getCurrentCards = () => {
    const startIndex = currentSlide * cardsPerSlide;
    const endIndex = startIndex + cardsPerSlide;
    return THERAPISTS.slice(startIndex, endIndex);
  };

  // Drag event handlers
  const handleDragStart = (e) => {
    setIsDragging(true);
    const clientX = e.type === "mousedown" ? e.clientX : e.touches[0].clientX;
    setStartX(clientX);
    setCurrentX(clientX);
    setDragOffset(0);
  };

  const handleDragMove = (e) => {
    if (!isDragging) return;
    e.preventDefault();
    const clientX = e.type === "mousemove" ? e.clientX : e.touches[0].clientX;
    setCurrentX(clientX);
    setDragOffset(clientX - startX);
  };

  const handleDragEnd = () => {
    if (!isDragging) return;
    setIsDragging(false);

    const threshold = 50; // Minimum drag distance to trigger slide change

    if (Math.abs(dragOffset) > threshold) {
      if (dragOffset > 0 && currentSlide > 0) {
        // Swipe right - go to previous slide
        setCurrentSlide(currentSlide - 1);
      } else if (dragOffset < 0 && currentSlide < totalSlides - 1) {
        // Swipe left - go to next slide
        setCurrentSlide(currentSlide + 1);
      }
    }

    setDragOffset(0);
  };

  async function fetchLastSetup() {
    try {
      const res = await fetch("/api/voice/session-setup?last=1");
      if (res.ok) {
        const data = await res.json();
        if (data.setup) {
          setLastSetup(data.setup);
          // Pre-fill form with last setup
          setSelectedTherapist(data.setup.therapistId);
          setSelectedLanguages([data.setup.language]);
          // Find the support type ID from the label
          const supportType = SUPPORT_TYPES.find(
            (s) => s.label === data.setup.supportType
          );
          setSelectedSupport(supportType ? supportType.id : null);
          setSelectedVoice({
            id: data.setup.voiceId,
            name: data.setup.voiceName,
            gender: data.setup.voiceGender,
          });
          setVoiceGender(data.setup.voiceGender || "female");
        }
      }
    } catch (err) {
      console.error("Error fetching last setup:", err);
    } finally {
      setLoadingLast(false);
    }
  }

  // Step 1: Therapist and language selection
  const renderStep1 = () => (
    <div>
      <h2 className="setup-title">Choose Your Therapist & Language</h2>
      <p className="setup-desc">
        Select a therapist and your preferred language for the session
      </p>

      {/* Therapist Slider */}
      <div
        className="therapist-slider-container"
        onMouseDown={handleDragStart}
        onMouseMove={handleDragMove}
        onMouseUp={handleDragEnd}
        onMouseLeave={handleDragEnd}
        onTouchStart={handleDragStart}
        onTouchMove={handleDragMove}
        onTouchEnd={handleDragEnd}
        style={{
          cursor: isDragging ? "grabbing" : "grab",
          userSelect: "none",
        }}
      >
        {/* Navigation Arrow - Previous */}
        {totalSlides > 1 && (
          <button
            className="slider-arrow slider-arrow-prev"
            onClick={prevSlide}
            aria-label="Previous therapists"
          >
            ‹
          </button>
        )}

        {/* Therapist Cards */}
        <div
          className="therapist-grid"
          style={{
            transform: isDragging
              ? `translateX(${dragOffset}px)`
              : "translateX(0)",
            transition: isDragging ? "none" : "transform 0.3s ease",
          }}
        >
          {getCurrentCards().map((t) => (
            <div
              key={t.id}
              className={`therapist-card${
                selectedTherapist === t.id ? " selected" : ""
              }`}
              onClick={() => setSelectedTherapist(t.id)}
            >
              <div className="therapist-avatar-text">{t.avatar}</div>
              <div className="therapist-name">{t.name}</div>
              <div className="therapist-rating">
                ⭐ {t.rating} · {t.region}
              </div>
              <div className="block-box">
                <div className="therapist-bg-title">Background</div>
                <div className="therapist-bg">{t.background}</div>
              </div>
              <div className="block-box">
                <div className="therapist-langs-title">Available Languages</div>
                <div className="therapist-langs">
                  {t.languages.map((l) => (
                    <button
                      key={l}
                      className={`lang-badge-btn${
                        selectedTherapist === t.id &&
                        selectedLanguages.includes(l)
                          ? " selected"
                          : ""
                      }`}
                      onClick={(e) => {
                        e.stopPropagation(); // Prevent card selection
                        if (selectedTherapist === t.id) {
                          setSelectedLanguages([l]);
                        }
                      }}
                    >
                      {l}
                    </button>
                  ))}
                </div>
              </div>

              <div className="therapist-desc">{t.description}</div>
              {selectedTherapist === t.id && (
                <div className="therapist-check">✔</div>
              )}
            </div>
          ))}
        </div>

        {/* Navigation Arrow - Next */}
        {totalSlides > 1 && (
          <button
            className="slider-arrow slider-arrow-next"
            onClick={nextSlide}
            aria-label="Next therapists"
          >
            ›
          </button>
        )}
      </div>

      {/* Slider Dots */}
      {totalSlides > 1 && (
        <div className="slider-dots">
          {Array.from({ length: totalSlides }, (_, index) => (
            <button
              key={index}
              className={`slider-dot${currentSlide === index ? " active" : ""}`}
              onClick={() => goToSlide(index)}
              aria-label={`Go to slide ${index + 1}`}
            />
          ))}
        </div>
      )}

      <div className="setup-nav">
        <button
          className="next-btn"
          disabled={!selectedTherapist || selectedLanguages.length === 0}
          onClick={() => setStep(2)}
          style={{ marginLeft: "auto" }}
        >
          Next
        </button>
      </div>
    </div>
  );

  // Step 2: Support type (previously step 3)
  const renderStep2 = () => (
    <div>
      <h2 className="setup-title">What brings you here today?</h2>
      <p className="setup-desc">
        Choose the type of support you're looking for in this session.
      </p>

      <div className="support-grid">
        {SUPPORT_TYPES.map((s) => (
          <div
            key={s.id}
            className={`support-card${
              selectedSupport === s.id ? " selected" : ""
            }`}
            onClick={() => setSelectedSupport(s.id)}
          >
            <div className="support-label">{s.label}</div>
            <div className="support-desc">{s.desc}</div>
            {selectedSupport === s.id && <div className="support-check">✔</div>}
          </div>
        ))}
      </div>

      <div className="setup-nav">
        <button
          className="prev-btn"
          onClick={() => setStep(step - 1)}
          disabled={step === 1}
        >
          Previous
        </button>
        <button
          className="next-btn"
          disabled={!selectedSupport}
          onClick={() => setStep(3)}
          style={{ marginLeft: "auto" }}
        >
          Next
        </button>
      </div>
    </div>
  );

  // Step 3: Session Summary
  const renderStep3 = () => {
    const therapist = THERAPISTS.find((t) => t.id === selectedTherapist);
    return (
      <div className="prefs-container">
        <h2 className="setup-title">Session Summary</h2>
        <p className="setup-desc">
          Review your session settings before starting.
        </p>

        <div className="summary-section">
          <div className="summary-title">Your Session Details</div>
          <div className="summary-row">
            <span>Therapist:</span>
            <span>{therapist.name}</span>
          </div>
          <div className="summary-row">
            <span>Language:</span>
            <span>{selectedLanguages[0]}</span>
          </div>
          <div className="summary-row">
            <span>Session Type:</span>
            <span>
              {SUPPORT_TYPES.find((s) => s.id === selectedSupport)?.label}
            </span>
          </div>
        </div>

        <div className="setup-nav">
          <button
            className="prev-btn"
            onClick={() => setStep(step - 1)}
            disabled={step === 1}
          >
            Previous
          </button>
          <button
            className="next-btn"
            onClick={handleSubmit}
            style={{ marginLeft: "auto" }}
          >
            Start Session
          </button>
        </div>
      </div>
    );
  };

  async function handleSubmit() {
    // Ensure we're on the final step
    if (step !== 3) {
      console.error("handleSubmit called on step", step);
      return;
    }

    const therapist = THERAPISTS.find((t) => t.id === selectedTherapist);
    const supportType = SUPPORT_TYPES.find((s) => s.id === selectedSupport);

    // Validate required data before sending
    if (!therapist) {
      alert("Please select a therapist");
      return;
    }

    if (!selectedLanguages[0]) {
      alert("Please select a language");
      return;
    }

    if (!supportType) {
      alert("Please select a support type");
      return;
    }

    // Debug: Log the data being sent
    const requestData = {
      therapistId: therapist.id,
      therapistName: therapist.name,
      language: selectedLanguages[0],
      supportType: supportType.label,
      voiceId: selectedVoice?.id,
      voiceName: selectedVoice?.name,
      voiceGender: voiceGender,
    };

    console.log("Sending session setup data:", requestData);

    try {
      const res = await fetch("/api/voice/session-setup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(requestData),
      });

      console.log("Response status:", res.status);

      if (!res.ok) {
        const err = await res.json();
        console.error("API Error:", err);
        alert("Failed to save session setup: " + (err.error || res.statusText));
        return;
      }

      const data = await res.json();
      console.log("Success response:", data);
      setConfirmation("Session setup saved! Redirecting...");
      setTimeout(() => {
        router.push({
          pathname: "/voice",
          query: {
            setupId: data.setup.id,
          },
        });
      }, 1200);
    } catch (e) {
      console.error("Network error:", e);
      alert("Failed to save session setup: " + e.message);
    }
  }

  return (
    <div className="voice-setup-root">
      {/* Header */}
      {/* <div className="voice-setup-header">
        <div className="header-left">
          <div className="button-wrapper">
            <button
              className="back-button"
              onClick={() => router.push("/dashboard")}
              style={{
                background: "#f1f5f9",
                border: "none",
                borderRadius: 8,
                padding: "8px 12px",
                cursor: "pointer",
                display: "flex",
                alignItems: "center",
                gap: 6,
                color: "#475569",
                fontSize: 14,
                fontWeight: 500,
                transition: "background-color 0.2s",
              }}
              onMouseEnter={(e) => (e.target.style.backgroundColor = "#e2e8f0")}
              onMouseLeave={(e) => (e.target.style.backgroundColor = "#f1f5f9")}
            >
              ← Back
            </button>
          </div>
        </div>
        <div className="header-center">
          <span className="header-icon">
            <svg
              width="36"
              height="36"
              viewBox="0 0 36 36"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
            >
              <circle cx="18" cy="18" r="18" fill="url(#paint0_linear)" />
              <path
                d="M18 26s-7-4.35-7-9.5A4.5 4.5 0 0 1 18 12a4.5 4.5 0 0 1 7 4.5C25 21.65 18 26 18 26z"
                fill="#fff"
              />
              <defs>
                <linearGradient
                  id="paint0_linear"
                  x1="0"
                  y1="0"
                  x2="36"
                  y2="36"
                  gradientUnits="userSpaceOnUse"
                >
                  <stop stopColor="#a21caf" />
                  <stop offset="1" stopColor="#6366f1" />
                </linearGradient>
              </defs>
            </svg>
          </span>
          <div className="header-title-group">
            <div className="header-title">Voice Session Setup</div>
            <div className="header-step">Step {step} of 3</div>
          </div>
        </div>
        <div className="header-right">
          <div className="header-progress-dots">
            <span className={step === 1 ? "dot active" : "dot"}></span>
            <span className={step === 2 ? "dot active" : "dot"}></span>
            <span className={step === 3 ? "dot active" : "dot"}></span>
          </div>
        </div>
      </div> */}
      <header
        className="echonest-dashboard-header"
        style={{
          position: "fixed",
          top: 0,
          left: 0,
          width: "100%",
          height: 42,
          background: "white",
          boxShadow: "0 2px 8px rgba(0,0,0,0.04)",
          zIndex: 100,
          display: "flex",
          flexDirection: "row",
          alignItems: "center",
          justifyContent: "space-between",
          gap: 8,
          padding: "12px 0px",
        }}
      >
        <div
          className="headercontent"
          style={{
            display: "flex",
            justifyContent: "space-between",
            width: "100%",
            maxWidth: "1280px",
            margin: "auto",
          }}
        >
          <div className="backDiv" style={{ display: "flex", gap: "16px" }}>
            <div className="button-wrapper">
              <button className="back-button" onClick={() => router.back()}>
                <img
                  src="https://cdn.prod.website-files.com/687509712d908be6b60fe7b6/68847b044933c2b4d5d8e3fd_back-arrow.svg"
                  className="back-arrow"
                  alt="Back"
                />
                Back
              </button>
            </div>

            <div
              // href="https://www.echonest.co.uk"
              // target="_blank"
              // rel="noopener noreferrer"
              style={{ color: "#000000", textDecoration: "none" }}
            >
              <div
                className="flex items-center gap-3 header-title-group"
                style={{ columnGap: 12 }}
              >
                <div
                  style={{
                    width: 40,
                    height: 40,
                    background:
                      "linear-gradient(135deg, #9E31D8 0%, #C92A94 100%)",
                    borderRadius: "50%",
                    display: "flex",
                    alignItems: "center",

                    justifyContent: "center",
                  }}
                >
                  <img
                    src="https://cdn.prod.website-files.com/6846fdc25de73b0e19544b07/6888669df674cf2ba748b76a_mic.svg"
                    alt="Voice Session"
                    style={{ width: 22, height: 22 }}
                  />
                </div>
                <div
                  style={{
                    display: "flex",
                    flexDirection: "column",
                    justifyContent: "center",
                    gap: 4,
                  }}
                >
                  <span
                    style={{
                      fontWeight: 500,
                      fontSize: 16,
                      color: "#181f2c",
                      lineHeight: 1,
                    }}
                  >
                    Voice Session Setup
                  </span>
                  <span
                    className="echonest-dashboard-status"
                    style={{
                      fontWeight: 400,
                      fontSize: 14,
                      color: "rgb(22, 163, 74)",
                      lineHeight: 1.2,
                    }}
                  >
                    Step {step} of 3
                  </span>
                </div>
              </div>
            </div>
          </div>
          <div className="header-progress-dots">
            <span className={step === 1 ? "dot active" : "dot"}></span>
            <span className={step === 2 ? "dot active" : "dot"}></span>
            <span className={step === 3 ? "dot active" : "dot"}></span>
          </div>
        </div>
      </header>
      {/* Remove the setup-progress bar below the header */}
      <div className="voice-setup-container mt-50">
        {confirmation && (
          <div className="confirmation-banner">{confirmation}</div>
        )}
        {loadingLast ? (
          <div>Loading...</div>
        ) : (
          <>
            {step === 1 && renderStep1()}
            {step === 2 && renderStep2()}
            {step === 3 && renderStep3()}
          </>
        )}
      </div>
    </div>
  );
}
