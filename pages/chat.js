import React, { useState, useCallback, useRef, useEffect } from "react";
import { useSession, signOut } from "next-auth/react";
import { useRouter } from "next/router";
import ChatFunctionality from "./ChatFunctionality"; // Assuming this component handles input
import ReactMarkdown from "react-markdown";
// Chart.js imports are not used in the provided JSX for ChatPage,
// but are kept as they might be used elsewhere or in a future iteration.
import { Line } from "react-chartjs-2";
import useBreakpoint from "../utils/useBreakpoint"; // Assuming this hook is defined
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
} from "chart.js";
import jsPDF from "jspdf"; // Not used in provided JSX
import html2canvas from "html2canvas"; // Not used in provided JSX
import TypingImpulse from "../components/TypingImpulse"; // Component for typing animation
import { getSession } from "next-auth/react";
import { Circles } from "react-loader-spinner"; // Loading spinner component
import useSWR from "swr"; // For data fetching and revalidation

// Register Chart.js components (if charts are to be used)
ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend
);

// Server-side props to protect the route and ensure profile setup
export async function getServerSideProps(context) {
  const session = await getSession(context);
  if (!session)
    return { redirect: { destination: "/login", permanent: false } };
  if (!session.user.setupCompleted)
    return { redirect: { destination: "/profile-setup", permanent: false } };
  return { props: {} };
}

// Helper function to format time for message timestamps
function formatTime(isoString) {
  const date = new Date(isoString);
  return date.toLocaleTimeString([], {
    hour: "2-digit",
    minute: "2-digit",
    hour12: true,
  });
}

// Helper function to extract a key point from messages (simple heuristic)
function extractKeyPoint(messages) {
  const userMessages = messages.filter(
    (m) => m.role === "user" && typeof m.content === "string"
  );
  if (userMessages.length <= 3) return ""; // Ignore very short sessions
  const main = userMessages
    .slice(3)
    .reduce((a, b) => (b.content.length > a.content.length ? b : a), {
      content: "",
    });
  return main.content;
}

// Helper function to get session statistics
function getSessionStats(messages, startTime) {
  const userMessages = messages.filter((m) => m.role === "user");
  const totalMessages = messages.length;
  const yourMessages = userMessages.length;
  let minutes = 0;
  if (messages.length > 1) {
    const first = new Date(messages[0].timestamp);
    const last = new Date(messages[messages.length - 1].timestamp);
    minutes = Math.max(1, Math.round((last - first) / 60000));
  }
  return { totalMessages, minutes, yourMessages };
}

// Predefined suggestions for user input
const SUGGESTIONS = [
  "I'm feeling anxious today",
  "Can you help me with stress management?",
  "I need coping strategies",
  "Let's talk about mindfulness",
];

// Loading component displayed while session or profile data is loading
function LoadingComponent() {
  return (
    <div
      style={{
        minHeight: "100vh",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        background: "#fff",
      }}
    >
      <Circles color="#7c3aed" height={80} width={80} />
    </div>
  );
}

const AUTO_SAVE_USER_MESSAGES = 10; // Threshold for auto-saving sessions

function formatMarkdown(md) {
  if (!md) return "";

  let result = md
    .replace(/\r\n/g, "\n") // Normalize Windows line endings
    .replace(/\r/g, "\n"); // Normalize old Mac line endings

  // Fix multiple asterisks in one line (e.g. "* First * Second")
  result = result.replace(/\* (.+?)\* /g, "* $1\n\n* ");

  // Add spacing before bullets stuck to sentences
  result = result.replace(/([^\n])(\* )/g, "$1\n\n$2");
  result = result.replace(/([^:\n])(\n\* )/g, "$1\n\n* ");

  // Add spacing before numbered lists
  result = result.replace(/([^\n])\s*([0-9]+\.\s)/g, "$1\n\n$2");
  result = result.replace(/(^.+?:)(\s*[\*\-0-9])/gm, "$1\n\n$2");

  // Normalize bullets to asterisks
  result = result.replace(/^- (.+)$/gm, "* $1");

  // Clean inline bullets inside text
  result = result.replace(/([^\n])\s\* ([^\n]+)/g, "$1\n\n* $2");

  // ✅ Split "* Label: description" into indented form
  result = result.replace(/^\* ([^:\n]+): (.+)/gm, "* $1:\n  $2");

  // Remove empty bullet points
  result = result.replace(/^\s*\*\s*$/gm, "");

  // Add newline after each bullet/numbered block
  result = result.replace(/([0-9]+\.\s.+?)(?=\n[0-9]+\.\s|$)/g, "$1\n");
  result = result.replace(/([\*\-]\s.+?)(?=\n[\*\-]\s|$)/g, "$1\n");

  // Unindent text not meant as list subtext
  result = result.replace(
    /(\n)([^\n\*\-\d][^\n]*)(?=\n[\*\-]\s|\n[0-9]+\.\s|$)/g,
    "$1$2"
  );

  // Limit line breaks to max two
  result = result.replace(/\n{3,}/g, "\n\n");
  result = result.replace(/\n{2,}/g, "\n\n");

  // Space between bolded list titles and their text
  result = result.replace(/(\* \*\*[^*]+\*\*:?)(\n?)([^\n\*])/g, "$1\n  $3");

  return result.trim();
}

export default function ChatPage() {
  const { data: session, status } = useSession(); // Next-Auth session management
  const router = useRouter(); // Next.js router
  const [profile, setProfile] = useState(null); // User profile data
  const [loadingProfile, setLoadingProfile] = useState(true); // Loading state for profile
  const [messages, setMessages] = useState([]); // Array to store chat messages
  const [isBotTyping, setIsBotTyping] = useState(false); // State for bot typing indicator
  const chatEndRef = useRef(null); // Ref for scrolling to the end of chat
  const chatContainerRef = useRef(null); // Ref for the chat messages container
  const { mutate: mutateDashboard } = useSWR("/api/dashboard/stats", (url) =>
    fetch(url).then((res) => res.json())
  ); // SWR hook for dashboard stats revalidation

  // Mood modal state
  const [showMoodModal, setShowMoodModal] = useState(false);
  const [selectedMood, setSelectedMood] = useState(7); // Default mood rating
  const [pendingSessionEnd, setPendingSessionEnd] = useState(false); // Not directly used in provided JSX but kept
  const [isStacked, setIsStacked] = useState(false); // Not directly used in provided JSX but kept
  const [sessionSaved, setSessionSaved] = useState(false); // Flag to track if session has been saved
  const [sessionStartTime, setSessionStartTime] = useState(null); // Timestamp for session start
  const [notification, setNotification] = useState(null); // State for displaying notifications
  const [endingSession, setEndingSession] = useState(false);

  // Ref to keep a mutable reference to the messages array for API calls
  const messagesRef = useRef(messages);
  useEffect(() => {
    messagesRef.current = messages;
  }, [messages]);

  // Fetch user profile and initialize chat messages when session is authenticated
  useEffect(() => {
    if (status === "authenticated") {
      const fetchProfile = async () => {
        setLoadingProfile(true);
        const res = await fetch("/api/user/profile");
        if (res.ok) {
          const data = await res.json();
          setProfile(data);
          // Compose initial system prompt from profile data
          const safeData = data || {};
          const systemPrompt = `User profile:\n- Name: ${
            safeData.fullName || "N/A"
          }\n- Age: ${safeData.age || "N/A"}\n- Gender: ${
            safeData.gender || "N/A"
          }\n- Country: ${safeData.country || "N/A"}\n- Therapy Focus: ${
            safeData.therapyFocus || "N/A"
          }\n- Therapy Type: ${safeData.therapyType || "N/A"}${
            safeData.religion ? `\n- Religion: ${safeData.religion}` : ""
          }${safeData.description ? `\n- About: ${safeData.description}` : ""}`;
          setMessages([
            { role: "system", content: systemPrompt },
            {
              role: "assistant",
              content: `Hello${
                safeData.fullName ? ` ${safeData.fullName}` : ""
              }! I'm EchoNest, your AI therapy companion.\n\nI'm here to listen and support you. How are you feeling today? I'd love to understand what's on your mind.`,
              timestamp: new Date().toISOString(),
            },
          ]);
        }
        setLoadingProfile(false);
        // Ensure page stays at top after profile loads
        if (typeof window !== "undefined") {
          window.scrollTo(0, 0);
        }
      };
      fetchProfile();
    }
  }, [status]);

  // Scroll to top when page loads and ensure chat container starts at top
  useEffect(() => {
    if (typeof window !== "undefined") {
      window.scrollTo(0, 0);
    }
    // Ensure chat container starts at the top with a small delay to ensure it's rendered
    setTimeout(() => {
      if (chatContainerRef.current) {
        chatContainerRef.current.scrollTop = 0;
      }
    }, 100);
  }, []);

  // Scroll to the bottom of the chat only when new messages are added (not on initial load)
  const [isInitialLoad, setIsInitialLoad] = useState(true);

  useEffect(() => {
    // Skip scrolling on initial load
    if (isInitialLoad && messages.length <= 2) {
      setIsInitialLoad(false);
      return;
    }

    // Only scroll when there are new messages and scroll within the chat container
    if (messages.length > 0 && chatContainerRef.current) {
      chatContainerRef.current.scrollTop =
        chatContainerRef.current.scrollHeight;
    }
  }, [messages, isInitialLoad]);

  // Custom Markdown components for consistent styling
  const markdownComponents = {
    h1: ({ node, ...props }) => (
      <h1
        style={{
          fontSize: 26,
          fontWeight: 700,
          margin: "28px 0 20px 0",
          color: "#111827",
          lineHeight: 1.3,
          borderBottom: "2px solid #e5e7eb",
          paddingBottom: "8px",
        }}
        {...props}
      />
    ),
    h2: ({ node, ...props }) => (
      <h2
        style={{
          fontSize: 22,
          fontWeight: 600,
          margin: "24px 0 16px 0",
          color: "#1f2937",
          lineHeight: 1.4,
        }}
        {...props}
      />
    ),
    h3: ({ node, ...props }) => (
      <h3
        style={{
          fontSize: 19,
          fontWeight: 600,
          margin: "20px 0 12px 0",
          color: "#374151",
          lineHeight: 1.4,
        }}
        {...props}
      />
    ),
    h4: ({ node, ...props }) => (
      <h4
        style={{
          fontSize: 17,
          fontWeight: 600,
          margin: "18px 0 10px 0",
          color: "#374151",
          lineHeight: 1.4,
        }}
        {...props}
      />
    ),
    ul: ({ node, ...props }) => (
      <ul
        style={{
          margin: "12px 0",
          paddingLeft: 0,
          listStyle: "disc",
          listStylePosition: "outside",
          display: "block",
        }}
        {...props}
      />
    ),

    ol: ({ node, ...props }) => (
      <ol
        style={{
          margin: "12px 0",
          paddingLeft: 20,
          listStyle: "decimal",
          listStylePosition: "outside",
          display: "block",
        }}
        {...props}
      />
    ),

    li: ({ node, ...props }) => (
      <li
        style={{
          marginBottom: 4, // ✅ Tight spacing between list items
          fontSize: 15,
          lineHeight: 1.6,
          color: "#374151",
          paddingLeft: 2,
          display: "list-item",
        }}
        {...props}
      />
    ),
    p: ({ node, ...props }) => (
      <p
        style={{
          margin: "0 0 8px 0",
          fontSize: 15,
          lineHeight: 1.7,
          whiteSpace: "pre-wrap",
          color: "#374151",
          textAlign: "left",
        }}
        {...props}
      />
    ),
    strong: ({ node, ...props }) => (
      <strong style={{ fontWeight: 600, color: "#1f2937" }} {...props} />
    ),
    em: ({ node, ...props }) => (
      <em style={{ fontStyle: "italic", color: "#6b7280" }} {...props} />
    ),
    code: ({ node, ...props }) => (
      <code
        style={{
          background: "#f1f5f9",
          padding: "3px 8px",
          borderRadius: 6,
          fontSize: 14,
          color: "#dc2626",
          border: "1px solid #e2e8f0",
          fontFamily:
            'ui-monospace, SFMono-Regular, "SF Mono", Consolas, "Liberation Mono", Menlo, monospace',
        }}
        {...props}
      />
    ),
    blockquote: ({ node, ...props }) => (
      <blockquote
        style={{
          borderLeft: "4px solid #3b82f6",
          paddingLeft: "20px",
          margin: "20px 0",
          fontStyle: "italic",
          color: "#4b5563",
          backgroundColor: "#f8fafc",
          padding: "16px 20px",
          borderRadius: 8,
          boxShadow: "0 1px 3px rgba(0,0,0,0.1)",
        }}
        {...props}
      />
    ),
    pre: ({ node, ...props }) => (
      <pre
        style={{
          backgroundColor: "#f8fafc",
          padding: "20px",
          borderRadius: 10,
          overflow: "auto",
          fontSize: 14,
          lineHeight: 1.6,
          border: "1px solid #e2e8f0",
          margin: "20px 0",
          boxShadow: "0 1px 3px rgba(0,0,0,0.1)",
        }}
        {...props}
      />
    ),
  };

  // Custom Markdown components for user messages (zero margin)
  const userMarkdownComponents = {
    ...markdownComponents,
    p: ({ node, ...props }) => (
      <p
        style={{
          margin: 0,
          fontSize: 15,
          lineHeight: 1.7,
          whiteSpace: "pre-wrap",
          color: "white",
        }}
        {...props}
      />
    ),
    li: ({ node, ...props }) => (
      <li
        style={{
          marginBottom: 4,
          fontSize: 15,
          lineHeight: 1.6,
          color: "white",
          paddingLeft: 2,
          display: "list-item",
        }}
        {...props}
      />
    ),
    strong: ({ node, ...props }) => (
      <strong style={{ fontWeight: 600, color: "white" }} {...props} />
    ),
    em: ({ node, ...props }) => (
      <em
        style={{ fontStyle: "italic", color: "rgba(255,255,255,0.9)" }}
        {...props}
      />
    ),
  };

  // Callback for handling new messages from the user and streaming bot responses
  const handleNewMessage = useCallback(
    async (msg) => {
      // Set session start time if it's the first user message
      if (!sessionStartTime && msg.role === "user")
        setSessionStartTime(new Date());

      // Add user message to state
      setMessages((prev) => [
        ...prev,
        { ...msg, timestamp: new Date().toISOString() },
      ]);

      // Activate bot typing indicator
      setIsBotTyping(true);

      // Add a placeholder assistant message to the state for the ripple effect
      let assistantMsg = {
        role: "assistant",
        content: "",
        timestamp: new Date().toISOString(),
        streaming: true,
      };
      setMessages((prev) => [...prev, assistantMsg]);

      try {
        // Make the API call to your streaming endpoint
        const validMessages = [...messagesRef.current, msg].filter(
          (m) =>
            m.role && typeof m.content === "string" && m.content.trim() !== ""
        );
        const response = await fetch("/api/chat/stream", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            messages: validMessages,
            userInfo: {
              includeProfile: true, // Flag to indicate we want profile data included
            },
          }),
        });
        if (!response.body)
          throw new Error("No response body from stream endpoint");
        const reader = response.body.getReader();
        const decoder = new TextDecoder();
        let done = false;
        let fullContent = "";
        let rateLimitErrorShown = false;
        while (!done) {
          const { value, done: doneReading } = await reader.read();
          done = doneReading;
          if (value) {
            const chunk = decoder.decode(value, { stream: true });
            // The backend sends lines like: data: ...\n\n or event: error\ndata: ...\n\n
            // Check for rate limit error event
            if (
              chunk.includes("event: error") &&
              chunk.includes("We are receiving many requests at once")
            ) {
              if (!rateLimitErrorShown) {
                setNotification({
                  type: "error",
                  text: "We are receiving many requests at once. Please wait a moment and try again.",
                });
                rateLimitErrorShown = true;
              }
              done = true;
              break;
            }
            // The backend sends lines like: data: ...\n\n
            const matches = chunk.match(/data: (.*)/g);
            if (matches) {
              for (const match of matches) {
                const content = match.replace("data: ", "");
                if (content === "[DONE]") {
                  done = true;
                  break;
                }

                // Preserve newlines and spaces from chunks
                fullContent += content;

                // Update the assistant's message in state as it streams
                setMessages((prev) => {
                  const updated = [...prev];
                  for (let i = updated.length - 1; i >= 0; i--) {
                    if (
                      updated[i].role === "assistant" &&
                      updated[i].streaming
                    ) {
                      // Apply markdown formatting to the streaming content only if it's substantial
                      let formattedContent = fullContent;
                      if (fullContent.length > 20) {
                        formattedContent = formatMarkdown(fullContent);
                      }
                      updated[i] = {
                        ...updated[i],
                        content: formattedContent,
                        streaming: true,
                      };
                      break;
                    }
                  }
                  return updated;
                });
                await new Promise((r) => setTimeout(r, 0)); // Yield to event loop for UI update
              }
            }
          }
        }
        // Mark streaming as finished
        setMessages((prev) => {
          const updated = [...prev];
          for (let i = updated.length - 1; i >= 0; i--) {
            if (updated[i].role === "assistant" && updated[i].streaming) {
              // Apply final markdown formatting
              let formattedContent = fullContent;
              if (fullContent.length > 20) {
                formattedContent = formatMarkdown(fullContent);
              }
              updated[i] = {
                ...updated[i],
                content: formattedContent,
                streaming: false,
                timestamp: new Date().toISOString(),
              };
              break;
            }
          }
          return updated;
        });
        if (mutateDashboard) mutateDashboard();
        setIsBotTyping(false);
      } catch (error) {
        // Show notification for rate limit error if not already shown
        if (
          error.message &&
          error.message.includes("We are receiving many requests at once")
        ) {
          setNotification({
            type: "error",
            text: "We are receiving many requests at once. Please wait a moment and try again.",
          });
        } else {
          setMessages((prev) => [
            ...prev,
            {
              role: "assistant",
              content:
                "Sorry, something went wrong while getting the response.",
              timestamp: new Date().toISOString(),
            },
          ]);
        }
        setIsBotTyping(false);
      }
    },
    [messages, mutateDashboard, sessionStartTime]
  ); // Dependencies for useCallback

  // Helper to extract session metrics (used for saving sessions)
  function extractSessionMetrics(messages, moodScoreOverride = null) {
    const userMessages = messages.filter((m) => m.role === "user");
    const start =
      sessionStartTime ||
      (messages[0]?.timestamp ? new Date(messages[0].timestamp) : null);
    const end = messages[messages.length - 1]?.timestamp
      ? new Date(messages[messages.length - 1].timestamp)
      : null;
    const duration =
      start && end ? Math.max(1, Math.round((end - start) / 60000)) : 1;

    let moodScore = null;
    for (let i = messages.length - 1; i >= 0; i--) {
      if (messages[i].role === "user" && typeof messages[i].mood === "number") {
        moodScore = messages[i].mood;
        break;
      }
    }
    if (moodScoreOverride !== null) moodScore = moodScoreOverride; // Override if provided

    const summary =
      userMessages.length > 0
        ? userMessages.reduce((a, b) =>
            b.content.length > a.content.length ? b : a
          ).content
        : "";
    return { duration, moodScore, summary };
  }

  // Function to handle ending and saving the session
  async function handleSessionEnd() {
    let moodScore = null;
    // Try to find a mood score from previous user messages
    for (let i = messages.length - 1; i >= 0; i--) {
      if (messages[i].role === "user" && typeof messages[i].mood === "number") {
        moodScore = messages[i].mood;
        break;
      }
    }
    // If no mood score found, estimate from sentiment
    if (moodScore === null) {
      // Simple sentiment analysis: count positive/negative words
      const Sentiment = (await import("sentiment")).default;
      const sentiment = new Sentiment();
      const userTexts = messages
        .filter((m) => m.role === "user" && m.content)
        .map((m) => m.content)
        .join(" ");
      const result = sentiment.analyze(userTexts);
      if (result.score > 2) moodScore = 8;
      else if (result.score < -2) moodScore = 4;
      else moodScore = 7;
      // Add a synthetic mood message for saving purposes
      messages.push({
        role: "user",
        content: `Mood rating: ${moodScore} (estimated)`,
        mood: moodScore,
        timestamp: new Date().toISOString(),
      });
    }
    // Extract final metrics for saving
    const {
      duration,
      moodScore: finalMood,
      summary,
    } = extractSessionMetrics(messages, moodScore);
    // Send session data to the API to be saved
    await fetch("/api/chat/session", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        duration,
        moodScore: finalMood,
        summary,
        messages,
      }),
    });
    if (mutateDashboard) mutateDashboard(); // Revalidate dashboard data
    setSessionSaved(true); // Mark session as saved
    setSessionStartTime(null); // Reset session start time
  }

  // Mood Modal JSX for rating the session
  const moodModal = showMoodModal && (
    <div
      style={{
        position: "fixed",
        top: 0,
        left: 0,
        width: "100vw",
        height: "100vh",
        background: "rgba(0,0,0,0.35)",
        zIndex: 1000,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
      }}
      onClick={(e) => {
        // Only close if clicking the backdrop, not the modal itself
        if (e.target === e.currentTarget) {
          setShowMoodModal(false);
          setPendingSessionEnd(false);
        }
      }}
    >
      <div
        style={{
          background: "white",
          borderRadius: 16,
          padding: 32,
          minWidth: 320,
          boxShadow: "0 4px 32px rgba(0,0,0,0.15)",
          textAlign: "center",
          position: "relative",
        }}
      >
        <h2 style={{ fontSize: 20, fontWeight: 700, marginBottom: 16 }}>
          How would you rate your mood for this session? (1-10)
        </h2>
        <div
          style={{
            display: "flex",
            gap: 8,
            justifyContent: "center",
            margin: "16px 0",
          }}
        >
          {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((n) => (
            <button
              key={n}
              style={{
                width: 32,
                height: 32,
                borderRadius: "50%",
                background: selectedMood === n ? "#3b82f6" : "#f3f4f6",
                color: selectedMood === n ? "white" : "#9ca3af",
                border: "1px solid #3b82f6",
                fontWeight: 600,
              }}
              onClick={() => setSelectedMood(n)}
            >
              {n}
            </button>
          ))}
        </div>
        <div style={{ display: "flex", justifyContent: "center", gap: 16 }}>
          <button
            onClick={async () => {
              // Add mood message to messages array before saving
              messages.push({
                role: "user",
                content: `Mood rating: ${selectedMood}`,
                mood: selectedMood,
                timestamp: new Date().toISOString(),
              });
              setShowMoodModal(false);
              setPendingSessionEnd(false);
              // Save session with the selected mood
              const {
                duration,
                moodScore: finalMood,
                summary,
              } = extractSessionMetrics(messages, selectedMood);
              await fetch("/api/chat/session", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                  duration,
                  moodScore: finalMood,
                  summary,
                  messages,
                }),
              });
              if (mutateDashboard) mutateDashboard();
              setSessionSaved(true);
            }}
            style={{
              background: "#3b82f6",
              color: "white",
              borderRadius: 8,
              padding: "8px 24px",
              fontWeight: 600,
              border: "none",
              fontSize: 16,
            }}
          >
            Submit
          </button>
          <button
            onClick={() => {
              setShowMoodModal(false);
              setPendingSessionEnd(false);
            }}
            style={{
              background: "#f3f4f6",
              color: "#374151",
              borderRadius: 8,
              padding: "8px 24px",
              fontWeight: 600,
              border: "none",
              fontSize: 16,
            }}
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  );

  // Show loading component while session or profile is being loaded
  if (status === "loading" || loadingProfile) {
    return <LoadingComponent />;
  }

  // Define font sizes for consistent styling
  const fontSizes = {
    sectionTitle: 22,
    cardTitle: 18,
    cardValue: 24,
    statLabel: 15,
    statValue: 18,
    small: 14,
    xsmall: 12,
  };

  // Main chat page rendering
  if (status === "authenticated" && profile) {
    return (
      <div
        className="echonest-chat-root"
        style={{
          minHeight: "100vh",
          background: "linear-gradient(135deg, #f6faff 60%, #f7f7fa 100%)",
          display: "flex",
          justifyContent: "center",
          flexDirection: "row",
          fontFamily: "system-ui, Arial, sans-serif",
        }}
      >
        {moodModal} {/* Render the mood modal */}
        {/* Fixed Header */}
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
                        "linear-gradient(135deg, #a259ff 0%, #6a11cb 100%)",
                      borderRadius: "50%",
                      display: "flex",
                      alignItems: "center",

                      justifyContent: "center",
                    }}
                  >
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      width="24"
                      height="24"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="white"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      style={{ width: 22, height: 22 }}
                    >
                      <path d="M19 14c1.49-1.46 3-3.21 3-5.5A5.5 5.5 0 0 0 16.5 3c-1.76 0-3 .5-4.5 2-1.5-1.5-2.74-2-4.5-2A5.5 5.5 0 0 0 2 8.5c0 2.3 1.5 4.05 3 5.5l7 7Z"></path>
                    </svg>
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
                      EchoNest
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
                      Ready to Talk
                    </span>
                  </div>
                </div>
              </div>
            </div>
            <button
              className="logout-btn"
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
        {/* Chat Card Container */}
        <div
          className="echonest-chat-container"
          style={{
            display: "flex",
            flexDirection: "column",
            justifyContent: "center",
            maxWidth: 862,
            minHeight: "70vh",
            marginBlock: 32,
          }}
        >
          {/* Welcome Card */}
          <div
            className="echonest-welcome-card"
            style={{
              background: "#fff",
              borderRadius: 12,
              border: "1px solid #e3e3e3",
              width: "100%",
              maxWidth: 862,
              marginBottom: 20,
              boxShadow: "0 2px 12px rgba(37,99,235,0.04)",
              paddingBottom: "24px",
              paddingTop: "10px",
              textAlign: "center",
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
            }}
          >
            <h2
              className="echonest-welcome-title"
              style={{
                color: "#5b4fff",
                fontWeight: 700,
                fontSize: 24,
                marginBottom: 18,
                letterSpacing: 0.2,
              }}
            >
              Welcome to Your Safe Space
            </h2>
            <div
              className="echonest-welcome-desc"
              style={{
                color: "#374151",
                fontSize: 16,
                fontWeight: 400,
                marginBottom: 24,
                maxWidth: 700,
                lineHeight: 1.6,
              }}
            >
              I'm here to listen, support, and help you navigate your thoughts
              and feelings. You can choose to chat with me using text or speak
              with me using voice - whatever feels most comfortable for you.
            </div>
            <div
              className="echonest-welcome-features"
              style={{
                display: "flex",
                justifyContent: "center",
                gap: 32,
                marginTop: 8,
                marginBottom: 4,
                flexWrap: "wrap",
              }}
            >
              <div
                className="echonest-welcome-feature"
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 6,
                  fontSize: 16,
                  color: "#b91c1c",
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
                <span
                  className="echonest-welcome-feature-label"
                  style={{ color: "#374151", fontSize: 14 }}
                >
                  Confidential & Secure
                </span>
              </div>
              <div
                className="echonest-welcome-feature"
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 6,
                  fontSize: 16,
                  color: "#2563eb",
                }}
              >
                <img
                  src="https://cdn.prod.website-files.com/6846fdc25de73b0e19544b07/6856d8b613760a2f76b1b8a9_message.svg"
                  alt="EchoNest Logo"
                  style={{
                    height: 20,
                    width: 20,
                    objectFit: "contain",
                    borderRadius: 8,
                  }}
                />
                <span
                  className="echonest-welcome-feature-label"
                  style={{ color: "#374151", fontSize: 14 }}
                >
                  24/7 Available
                </span>
              </div>
              <div
                className="echonest-welcome-feature"
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 6,
                  fontSize: 16,
                  color: "#7c3aed",
                }}
              >
                <img
                  src="https://cdn.prod.website-files.com/6846fdc25de73b0e19544b07/6856d8b60a71770c9f797801_mic.svg"
                  alt="EchoNest Logo"
                  style={{
                    height: 20,
                    width: 20,
                    objectFit: "contain",
                    borderRadius: 8,
                  }}
                />
                <span
                  className="echonest-welcome-feature-label"
                  style={{ color: "#374151", fontSize: 14 }}
                >
                  Natural Conversation
                </span>
              </div>
            </div>
          </div>
          <div
            className="echonest-chat-card"
            style={{
              background: "#fff",
              borderRadius: 8,
              border: "1px solid #e3e3e3",
              width: "100%",
              minHeight: 400,
              display: "flex",
              flexDirection: "column",
              padding: 0,
            }}
          >
            {/* Chat messages display area */}
            <div
              ref={chatContainerRef}
              className="echonest-chat-messages"
              style={{
                flex: 1,
                padding: "24px 24px 0 24px",
                overflowY: "auto",
                maxHeight: 431,
                minHeight: 431,
              }}
            >
              {messages
                .filter(
                  (msg) => msg.role === "assistant" || msg.role === "user"
                ) // Only display user and assistant messages
                .map((msg, idx) => {
                  const isUser = msg.role === "user";
                  const isStreaming = msg.role === "assistant" && msg.streaming;
                  return (
                    <div
                      key={idx}
                      className={`echonest-chat-bubble ${
                        isUser
                          ? "echonest-chat-bubble-user"
                          : "echonest-chat-bubble-bot"
                      } flex flex-col ${isUser ? "items-end" : "items-start"}`}
                      style={{ marginBottom: 28 }}
                    >
                      <div
                        className={
                          `rounded-[14px] px-6 py-4 break-words shadow max-w-[540px] ` +
                          (isUser
                            ? "bg-[#7E3AED] text-white"
                            : "bg-[#F3F4F6] text-gray-900 border border-[#e0e7ef]")
                        }
                        style={{
                          padding: "16px 20px",
                          borderRadius: 12,
                          fontSize: 15,
                          lineHeight: 1.7,
                          fontWeight: 400,
                          ...(isUser ? { color: "white" } : {}),
                          marginBottom: 2,
                          boxShadow: isUser
                            ? "0 4px 12px rgba(126,58,237,0.15)"
                            : "0 2px 8px rgba(0,0,0,0.08)",
                          wordBreak: "break-word",
                          textAlign: "left",
                          border: isUser ? "none" : "1px solid #e5e7eb",
                        }}
                      >
                        {/* Render TypingImpulse if bot is typing and showTypingOnly is true or content is empty */}
                        {isStreaming && !msg.content ? (
                          <TypingImpulse />
                        ) : (
                          <>
                            {isUser && msg.image && (
                              <img
                                src={msg.image}
                                alt="User upload"
                                style={{
                                  width: 80,
                                  height: 80,
                                  objectFit: "cover",
                                  borderRadius: 8,
                                  marginBottom: msg.content ? 8 : 0,
                                }}
                              />
                            )}
                            <ReactMarkdown
                              components={
                                isUser
                                  ? userMarkdownComponents
                                  : markdownComponents
                              }
                            >
                              {isUser ? msg.content : msg.content}
                            </ReactMarkdown>
                          </>
                        )}
                      </div>
                      {/* Message timestamp */}
                      <div
                        className={`echonest-chat-bubble-time text-gray-400 mt-1 ${
                          isUser ? "mr-2" : "ml-2"
                        }`}
                        style={{
                          padding: "4px 8px",
                          fontSize: 12,
                          color: "#9ca3af",
                          marginTop: 4,
                          fontWeight: 400,
                        }}
                      >
                        {formatTime(msg.timestamp)}
                      </div>
                    </div>
                  );
                })}
              {/* Show TypingImpulse animation if bot is typing and no streaming message yet */}
              {isBotTyping &&
                !messages.some(
                  (m) => m.role === "assistant" && m.streaming
                ) && (
                  <div
                    className="echonest-chat-bubble echonest-chat-bubble-bot flex flex-col items-start"
                    style={{ marginBottom: 28 }}
                  >
                    <div
                      className="rounded-[14px] px-6 py-4 break-words shadow max-w-[540px] bg-[#F3F4F6] text-gray-900 border border-[#e0e7ef]"
                      style={{
                        padding: "16px 20px",
                        borderRadius: 12,
                        fontSize: 15,
                        lineHeight: 1.7,
                        fontWeight: 400,
                        marginBottom: 2,
                        boxShadow: "0 2px 8px rgba(0,0,0,0.08)",
                        wordBreak: "break-word",
                        textAlign: "left",
                        border: "1px solid #e5e7eb",
                      }}
                    >
                      <TypingImpulse />
                    </div>
                  </div>
                )}
              <div ref={chatEndRef} /> {/* Ref for auto-scrolling */}
            </div>

            {/* Input bar and suggestions */}
            <div
              className="echonest-chat-inputbar"
              style={{
                padding: "0 24px 24px 24px",
                background: "#fff",
                borderBottomLeftRadius: 8,
                borderBottomRightRadius: 8,
              }}
            >
              <ChatFunctionality
                onNewMessage={handleNewMessage}
                messages={messages}
                theme={"light"}
              />

              {/* Privacy statement */}
              <div
                className="privacy"
                style={{
                  fontSize: 13,
                  color: "#888",
                  marginTop: 10,
                  textAlign: "center",
                }}
              >
                EchoNest is here to listen and support you. This conversation is
                private and secure.
              </div>

              {/* End Session button */}
              <button
                onClick={async () => {
                  if (endingSession) return;
                  const userMessages = messages.filter(
                    (m) => m.role === "user"
                  );
                  if (userMessages.length === 0) {
                    setNotification({
                      type: "error",
                      text: "Please send at least one message before ending the session.",
                    });
                    return;
                  }
                  setEndingSession(true);
                  await handleSessionEnd(); // Save session
                  setEndingSession(false);
                  router.push("/dashboard"); // Redirect to dashboard
                }}
                disabled={
                  messages.filter((m) => m.role === "user").length === 0 ||
                  endingSession
                }
                style={{
                  margin: "24px auto 0 auto",
                  display: "block",
                  background:
                    "linear-gradient(90deg, #2575fc 0%, #6a11cb 100%)",
                  color: "#fff",
                  border: "none",
                  borderRadius: 10,
                  padding: "12px 32px",
                  fontSize: 18,
                  fontWeight: 700,
                  cursor:
                    messages.filter((m) => m.role === "user").length === 0 ||
                    endingSession
                      ? "not-allowed"
                      : "pointer",
                  boxShadow: "0 2px 8px rgba(106,17,203,0.08)",
                  marginTop: 24,
                  opacity:
                    messages.filter((m) => m.role === "user").length === 0 ||
                    endingSession
                      ? 0.6
                      : 1,
                }}
              >
                {endingSession ? "Saving..." : "End Session"}
              </button>

              {/* Notification display */}
              {notification && (
                <div
                  style={{
                    background:
                      notification.type === "success" ? "#dcfce7" : "#fee2e2",
                    color:
                      notification.type === "success" ? "#166534" : "#b91c1c",
                    border: `1.5px solid ${
                      notification.type === "success" ? "#bbf7d0" : "#fecaca"
                    }`,
                    borderRadius: 8,
                    padding: "10px 18px",
                    marginTop: 18,
                    fontWeight: 500,
                    textAlign: "center",
                  }}
                >
                  {notification.text}
                </div>
              )}
            </div>
          </div>
          {/* Tips and Crisis Support Section */}
          <div
            className="echonest-session-tips-container"
            style={{
              width: "100%",
              maxWidth: 862,
              margin: "20px auto 0 auto",
              display: "flex",
              flexDirection: "column",
              gap: 0,
            }}
          >
            <div
              className="echonest-session-tips-card"
              style={{
                background: "#fff",
                borderRadius: 10,
                alignItems: "end",
                border: "1px solid #e3e3e3",
                padding: "24px",
                display: "flex",
                flexDirection: "row",
                justifyContent: "space-between",
                gap: 32,
                flexWrap: "wrap",
              }}
            >
              <div style={{ flex: 1, minWidth: 220 }}>
                <div
                  style={{
                    fontWeight: 700,
                    fontSize: 16,
                    color: "#232323",
                    marginBottom: 10,
                  }}
                >
                  Tips for Your Session
                </div>
                <div
                  style={{
                    fontWeight: 600,
                    fontSize: 14,
                    color: "#232323",
                    marginBottom: 6,
                  }}
                >
                  Getting Started:
                </div>
                <ul
                  className="unorder-list"
                  style={{
                    color: "#2563eb",
                    fontSize: 14,
                    margin: 0,
                    paddingLeft: 20,
                    lineHeight: 1.7,
                  }}
                >
                  <li style={{ color: "#374151" }}>
                    Share whatever feels comfortable
                  </li>
                  <li style={{ color: "#374151" }}>
                    There's no right or wrong way to talk
                  </li>
                  <li style={{ color: "#374151" }}>
                    Take your time to express yourself
                  </li>
                </ul>
              </div>
              <div style={{ flex: 1, minWidth: 220 }}>
                <div
                  style={{
                    fontWeight: 600,
                    fontSize: 14,
                    color: "#232323",
                    marginBottom: 6,
                  }}
                >
                  Remember:
                </div>
                <ul
                  style={{
                    color: "#2563eb",
                    fontSize: 14,
                    margin: 0,
                    paddingLeft: 20,
                    lineHeight: 1.7,
                  }}
                >
                  <li style={{ color: "#374151" }}>This is your safe space</li>
                  <li style={{ color: "#374151" }}>
                    Your privacy is protected
                  </li>
                  <li style={{ color: "#374151" }}>
                    You can pause or stop anytime
                  </li>
                </ul>
              </div>
            </div>
            <div
              className="echonest-crisis-support"
              style={{
                background: "#fff0f0",
                border: "1.5px solid #fca5a5",
                borderRadius: 10,
                color: "#b91c1c",
                fontWeight: 400,
                fontSize: 14,
                padding: "18px 22px",
                marginTop: 12,
                textAlign: "left",
                boxShadow: "0 2px 8px rgba(239,68,68,0.04)",
              }}
            >
              <span style={{ fontWeight: 600, color: "#b91c1c" }}>
                Crisis Support:{" "}
              </span>
              If you're experiencing a mental health crisis, please contact your
              local emergency services or call a crisis helpline immediately.
              This AI assistant is not a replacement for professional medical
              care.
            </div>
          </div>
        </div>
        {/* Global CSS styles for responsiveness and animations */}
        <style jsx global>{`
          @keyframes voicePulse {
            0% {
              transform: scale(1);
              opacity: 0.7;
            }
            70% {
              transform: scale(1.25);
              opacity: 0.15;
            }
            100% {
              transform: scale(1.4);
              opacity: 0;
            }
          }
          .voice-pulse-ring.listening {
            background: rgba(59, 130, 246, 0.18);
          }
          .voice-pulse-ring.speaking {
            background: rgba(167, 139, 250, 0.18);
          }
          @media (max-width: 600px) {
            .voice-pulse-ring,
            .voice-pulse-ring.listening,
            .voice-pulse-ring.speaking {
              width: 80px !important;
              height: 80px !important;
            }
            .voice-pulse-ring + div {
              width: 80px !important;
              height: 80px !important;
            }
            .echonest-chat-bubble {
              max-width: 90vw !important;
              font-size: 15px !important;
            }
            .echonest-chat-messages {
              min-height: 220px !important;
            }
          }
          @media (min-width: 768px) {
            button:hover {
              filter: brightness(1.08);
              box-shadow: 0 2px 12px rgba(37, 99, 235, 0.1);
              transition: box-shadow 0.18s, filter 0.18s;
            }
          }
          .echonest-chat-bubble p {
            margin-bottom: 0px;
          }
          .echonest-chat-bubble code {
            background: #f3f4f6;
            color: #7e3aed;
            padding: 2px 6px;
            border-radius: 4px;
            font-size: 12px;
          }
          .echonest-chat-bubble li {
            margin-left: 22px;
            margin-bottom: 6px;
          }
        `}</style>
      </div>
    );
  }

  return null; // Should not be reached if authentication status is handled
}
