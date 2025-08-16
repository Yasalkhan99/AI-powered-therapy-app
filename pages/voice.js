import React, { useState, useRef, useEffect } from "react";
import Head from "next/head";
import { useRouter } from "next/router";

export default function VoiceAssistant() {
  const router = useRouter();
  const [status, setStatus] = useState("ready"); // ready, listening, processing, speaking, error
  const [error, setError] = useState(null);
  const [conversationHistory, setConversationHistory] = useState([]);
  const [currentVolume, setCurrentVolume] = useState(0);
  const [conversationStarted, setConversationStarted] = useState(false);
  const [voiceSetup, setVoiceSetup] = useState(null);
  const [showSetupModal, setShowSetupModal] = useState(false);
  const [setupId, setSetupId] = useState(null);
  const [autoMode, setAutoMode] = useState(true); // Toggle between auto and manual mode
  const [sessionStartTime, setSessionStartTime] = useState(null);
  const [sessionEndTime, setSessionEndTime] = useState(null);

  // Constants from improved working script
  const SILENCE_TIMEOUT_MS = 2000; // How long to wait before stopping after silence
  const MIN_RECORD_DURATION_MS = 4000; // Minimum recording time

  const mediaRecorderRef = useRef(null);
  const audioContextRef = useRef(null);
  const analyserNodeRef = useRef(null);
  const animationFrameIdRef = useRef(null);
  const responseAudioRef = useRef(null);
  const streamRef = useRef(null);
  const audioChunksRef = useRef([]);
  const canvasRef = useRef(null);

  // Function to draw gradient background on canvas
  const drawGradientBackground = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d");
    const centerX = canvas.width / 2;
    const centerY = canvas.height / 2;

    // Clear canvas
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    if (
      status === "listening" ||
      status === "processing" ||
      status === "speaking"
    ) {
      // Draw gradient background for active states
      const gradient = ctx.createRadialGradient(
        centerX,
        centerY,
        0,
        centerX,
        centerY,
        90
      );
      gradient.addColorStop(0, "rgba(255, 255, 255, 0.9)");
      gradient.addColorStop(0.7, "rgba(147, 51, 234, 0.8)");
      gradient.addColorStop(1, "rgba(99, 102, 241, 0.9)");

      ctx.fillStyle = gradient;
      ctx.beginPath();
      ctx.arc(centerX, centerY, 90, 0, 2 * Math.PI);
      ctx.fill();

      // Add glow effect
      ctx.shadowColor = "rgba(99, 102, 241, 0.5)";
      ctx.shadowBlur = 20;
      ctx.beginPath();
      ctx.arc(centerX, centerY, 90, 0, 2 * Math.PI);
      ctx.stroke();
      ctx.shadowBlur = 0;
    } else {
      // Draw simple background for ready state
      ctx.fillStyle = "rgba(255, 255, 255, 0.8)";
      ctx.beginPath();
      ctx.arc(centerX, centerY, 90, 0, 2 * Math.PI);
      ctx.fill();
    }
  };

  // Function to convert AudioBuffer to WAV format

  // Check if user has voice setup
  useEffect(() => {
    const checkVoiceSetup = async () => {
      try {
        const res = await fetch("/api/voice/session-setup?last=1");

        if (res.ok) {
          const data = await res.json();

          if (data.setup) {
            setVoiceSetup(data.setup);
            setSetupId(data.setup.id);

            setTimeout(() => {
              const startTime = new Date();
              setConversationStarted(true);
              setSessionStartTime(startTime); // Set session start time when conversation begins
              console.log('🎯 Session started at:', startTime.toISOString());
            }, 2000);
          } else {
            setShowSetupModal(true);
          }
        }
      } catch (err) {
        console.error("Error checking voice setup:", err);
      }
    };

    checkVoiceSetup();
  }, []);

  // --- EFFECT: INITIALIZE & MANAGE AUDIO ---
  useEffect(() => {
    responseAudioRef.current = new Audio();
    responseAudioRef.current.onended = () => {
      if (autoMode) {
        setStatus("ready");
      }
    };
    responseAudioRef.current.onerror = () => {
      setError("An unexpected audio playback error occurred.");
      setStatus("error");
      setTimeout(() => setStatus("ready"), 2000);
    };

    return () => {
      // Cleanup on unmount
      if (responseAudioRef.current) responseAudioRef.current.src = "";
      if (
        audioContextRef.current &&
        audioContextRef.current.state !== "closed"
      ) {
        audioContextRef.current.close();
      }
      cancelAnimationFrame(animationFrameIdRef.current);
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((track) => track.stop());
      }
    };
  }, [autoMode]);

  // --- EFFECT: MANAGE CONVERSATION LOOP ---
  useEffect(() => {
    console.log(
      "🔄 Conversation loop effect - status:",
      status,
      "conversationStarted:",
      conversationStarted,
      "autoMode:",
      autoMode
    );
    if (status === "ready" && conversationStarted && autoMode) {
      console.log("🔄 Starting listening from conversation loop...");
      startListening();
    }
  }, [status, conversationStarted, autoMode]);

  // --- EFFECT: DRAW GRADIENT BACKGROUND ON CANVAS ---
  useEffect(() => {
    drawGradientBackground();
  }, [status]);

  // --- AUDIO RECORDING FUNCTIONS ---
  const startListening = async () => {
    console.log("🎤 startListening called, current status:", status);
    if (status !== "ready") {
      console.log("❌ Cannot start listening, status is not ready:", status);
      return;
    }

    setStatus("listening");
    setError(null);
    audioChunksRef.current = [];

    try {
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        throw new Error("getUserMedia is not supported in this browser");
      }

      const permissionStatus = await navigator.permissions.query({
        name: "microphone",
      });
      if (permissionStatus.state === "denied") {
        throw new Error(
          "Microphone permission is denied. Please enable it in browser settings."
        );
      }

      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          sampleRate: 16000,
          channelCount: 1,
          echoCancellation: false,
          noiseSuppression: false,
          autoGainControl: false,
        },
      });
      console.log("✅ Microphone access granted");
      streamRef.current = stream;

      // Try to force WAV format
      let mimeType = "";
      if (MediaRecorder.isTypeSupported("audio/wav")) {
        mimeType = "audio/wav";
      } else if (MediaRecorder.isTypeSupported("audio/mp3")) {
        mimeType = "audio/mp3";
      }

      mediaRecorderRef.current = new MediaRecorder(
        stream,
        mimeType ? { mimeType } : undefined
      );
      console.log("🎵 Using MIME type:", mimeType || "browser default");

      mediaRecorderRef.current.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };

      // ✅ CORRECTED: All state changes and cleanup are now in onstop
      mediaRecorderRef.current.onstop = async () => {
        console.log("⏹️ MediaRecorder stopped. Processing audio...");

        // 1. Set status to processing NOW that recording has actually stopped.
        setStatus("processing");

        // 2. Perform all cleanup here.
        cancelAnimationFrame(animationFrameIdRef.current);
        if (
          audioContextRef.current &&
          audioContextRef.current.state !== "closed"
        ) {
          audioContextRef.current.close();
        }
        if (streamRef.current) {
          streamRef.current.getTracks().forEach((track) => track.stop());
        }

        // 3. Reset tracking variables
        window.silenceStart = null;
        window.calibratedThreshold = null;
        window.recordingStartTime = null;

        // 4. Finally, process the audio data.
        await processAudio();
      };

      mediaRecorderRef.current.start(1000);
      console.log("🎙️ Started recording");

      // Fallback timeout
      setTimeout(() => {
        if (
          mediaRecorderRef.current &&
          mediaRecorderRef.current.state === "recording"
        ) {
          console.log("⏰ Fallback timeout reached, stopping recording...");
          stopRecordingAndProcess();
        }
      }, 15000); // 15 seconds fallback

      audioContextRef.current = new (window.AudioContext ||
        window.webkitAudioContext)();
      const source = audioContextRef.current.createMediaStreamSource(stream);
      analyserNodeRef.current = audioContextRef.current.createAnalyser();
      analyserNodeRef.current.fftSize = 2048;
      source.connect(analyserNodeRef.current);

      window.recordingStartTime = Date.now();
      window.silenceStart = null;

      const dataArray = new Uint8Array(analyserNodeRef.current.fftSize);
      console.log("📏 Calibrating noise...");

      const threshold = await calibrateSilence(
        analyserNodeRef.current,
        dataArray
      );
      window.calibratedThreshold = threshold;
      console.log("🎚️ Threshold set to:", threshold.toFixed(4));

      monitorAudioLevel();
    } catch (err) {
      console.error("❌ Microphone access error:", err);
      let errorMessage =
        "Microphone access denied. Please enable it in your browser settings.";
      if (err.name === "NotAllowedError") {
        errorMessage =
          'Microphone access was denied. Please click the microphone icon in your browser address bar and select "Allow".';
      } else if (err.name === "NotFoundError") {
        errorMessage =
          "No microphone found. Please connect a microphone and try again.";
      }
      setError(errorMessage);
      setStatus("error");
      setConversationStarted(false);
    }
  };

  // ✅ CORRECTED: This function now only tells the recorder to stop.
  const stopRecordingAndProcess = () => {
    console.log(
      "🎤 stopRecordingAndProcess called, current recorder state:",
      mediaRecorderRef.current?.state
    );
    if (
      mediaRecorderRef.current &&
      mediaRecorderRef.current.state === "recording"
    ) {
      mediaRecorderRef.current.stop();
    }
  };

  // Manual Recording Toggle Function
  const toggleRecording = () => {
    if (status === "ready" || status === "error") {
      setAutoMode(false); // When user takes manual control, disable auto-mode for this cycle
      setConversationStarted(true); // This will trigger startListening
    } else if (status === "listening") {
      stopRecordingAndProcess();
    }
  };

  const updateSessionTiming = async () => {
    console.log('🔄 updateSessionTiming called:', { setupId, sessionStartTime });
    
    if (!setupId || !sessionStartTime) {
      console.log('❌ Missing setupId or sessionStartTime:', { setupId, sessionStartTime });
      return;
    }
    
    const sessionEndTime = new Date();
    const actualDuration = Math.round((sessionEndTime - sessionStartTime) / 1000); // Duration in seconds
    
    console.log('📊 Session timing data:', {
      sessionStartedAt: sessionStartTime.toISOString(),
      sessionEndedAt: sessionEndTime.toISOString(),
      actualDuration: actualDuration
    });
    
    try {
      const response = await fetch(`/api/voice/session-setup/${setupId}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          sessionStartedAt: sessionStartTime.toISOString(),
          sessionEndedAt: sessionEndTime.toISOString(),
          actualDuration: actualDuration,
        }),
      });
      
      if (response.ok) {
        const result = await response.json();
        console.log('✅ Session timing updated successfully:', result);
      } else {
        const errorText = await response.text();
        console.error('❌ Failed to update session timing:', response.status, errorText);
      }
    } catch (error) {
      console.error('❌ Error updating session timing:', error);
    }
  };

  const endSession = async () => {
    setConversationStarted(false); // Stop the loop
    if (
      mediaRecorderRef.current &&
      mediaRecorderRef.current.state === "recording"
    ) {
      mediaRecorderRef.current.stop();
    }
    
    // Update session timing before redirecting
    await updateSessionTiming();
    router.push("/dashboard");
  };

  // Improved volume calculation using RMS
  const getVolume = (dataArray) => {
    let sum = 0;
    for (let i = 0; i < dataArray.length; i++) {
      sum += (dataArray[i] - 128) ** 2;
    }
    return Math.sqrt(sum / dataArray.length) / 128;
  };

  // Dynamic silence calibration
  const calibrateSilence = (analyser, dataArray) => {
    return new Promise((resolve) => {
      let samples = [];
      function capture() {
        analyser.getByteTimeDomainData(dataArray);
        samples.push(getVolume(dataArray));
        if (samples.length >= 50) {
          const avg = samples.reduce((a, b) => a + b, 0) / samples.length;
          resolve(avg + 0.02); // Add a small buffer to the average noise
        } else {
          requestAnimationFrame(capture);
        }
      }
      capture();
    });
  };

  const monitorAudioLevel = () => {
    if (!analyserNodeRef.current || status !== "listening") return;

    const dataArray = new Uint8Array(analyserNodeRef.current.fftSize);
    analyserNodeRef.current.getByteTimeDomainData(dataArray);
    const volume = getVolume(dataArray);
    setCurrentVolume(volume * 100);

    const now = Date.now();
    const elapsed = now - (window.recordingStartTime || now);

    if (volume < window.calibratedThreshold) {
      if (!window.silenceStart) {
        window.silenceStart = now;
      } else if (
        now - window.silenceStart > SILENCE_TIMEOUT_MS &&
        elapsed > MIN_RECORD_DURATION_MS
      ) {
        console.log("🛑 Stopped recording after silence.");
        stopRecordingAndProcess();
        return; // Important: exit the loop
      }
    } else {
      window.silenceStart = null;
    }

    animationFrameIdRef.current = requestAnimationFrame(monitorAudioLevel);
  };

  // --- CORE LOGIC ---
  const processAudio = async () => {
    console.log("🎤 Starting processAudio...");

    if (audioChunksRef.current.length === 0) {
      console.log("❌ No audio data to process. Returning to ready.");
      setStatus("ready");
      setAutoMode(true); // Re-enable auto mode if it was a silent recording
      return;
    }

    try {
      const recordedMimeType =
        mediaRecorderRef.current?.mimeType || "audio/webm";
      let audioBlob = new Blob(audioChunksRef.current, {
        type: recordedMimeType,
      });

      console.log("🎵 Created audio blob with MIME type:", recordedMimeType);
      console.log("📊 Audio blob size:", audioBlob.size, "bytes");

      // Check if we have pure WAV format
      if (audioBlob.type.includes("wav")) {
        console.log("✅ Pure WAV format detected - no conversion needed");
      } else {
        console.log(
          "📊 Audio format:",
          audioBlob.type,
          "- will be converted on server if needed"
        );
      }

      if (audioBlob.size < 1000) {
        console.log(
          "⚠️ Audio file too small, likely silence. Returning to ready."
        );
        setStatus("ready");
        setAutoMode(true);
        return;
      }

      const formData = new FormData();
      const actualMimeType = audioBlob.type;

      // Always send as WAV for ElevenLabs compatibility
      formData.append("audio", audioBlob, "audio.wav");
      console.log("📁 Sending as WAV file with MIME type:", actualMimeType);

      console.log("⬆️ Sending audio to STT API...", audioBlob.size, "bytes");
      const sttResponse = await fetch("/api/voice/stt", {
        method: "POST",
        body: formData,
      });
      console.log("📡 STT Response status:", sttResponse.status);

      if (!sttResponse.ok) {
        const errorText = await sttResponse.text();
        console.error("❌ STT API Error:", errorText);
        throw new Error(`STT API Error: ${errorText}`);
      }

      const { transcript } = await sttResponse.json();
      const userMessage = transcript?.trim() || "[User was silent]";
      console.log("🗣️ User said:", userMessage);

      if (!transcript || !transcript.trim()) {
        console.log("❌ No speech detected, returning to ready state");
        setStatus("ready");
        setAutoMode(true);
        return;
      }

      const updatedHistory = [
        ...conversationHistory,
        { role: "user", content: userMessage },
      ];
      setConversationHistory(updatedHistory);

      const chatContext = {
        messages: updatedHistory,
        setup: voiceSetup,
        userInfo: { includeProfile: true },
      };

      const chatResponse = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(chatContext),
      });

      if (!chatResponse.ok) {
        throw new Error(`Chat API Error: ${await chatResponse.text()}`);
      }

      const data = await chatResponse.json();
      const botReply =
        data.reply?.content || "I'm not sure how to respond to that.";
      console.log("🤖 Bot will say:", botReply);

      setConversationHistory((prev) => [
        ...prev,
        { role: "assistant", content: botReply },
      ]);
      await speakWithElevenLabs(botReply);
    } catch (err) {
      console.error("Error in processAudio:", err);
      setError("There was an issue processing your speech.");
      setStatus("error");
      // After an error, give the user a moment before trying again automatically
      setTimeout(() => {
        setStatus("ready");
        setAutoMode(true);
      }, 3000);
    }
  };

  const speakWithElevenLabs = async (text) => {
    setStatus("speaking");
    try {
      const ttsResponse = await fetch("/api/voice/tts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text, setup_id: setupId }),
      });

      if (!ttsResponse.ok) {
        throw new Error(`TTS API Error: ${await ttsResponse.text()}`);
      }

      const audioBlob = await ttsResponse.blob();
      if (audioBlob.size < 100)
        throw new Error("TTS API returned empty audio.");

      const audioUrl = URL.createObjectURL(audioBlob);
      responseAudioRef.current.src = audioUrl;
      await responseAudioRef.current.play();
      // onended event will set status to 'ready' and re-enable autoMode
    } catch (err) {
      console.error("Error in speakWithElevenLabs:", err);
      setError("Audio playback is not available.");
      setStatus("error");
      setTimeout(() => {
        setStatus("ready");
        setAutoMode(true);
      }, 3000);
    }
  };

  const VoiceSetupModal = () => (
    <div
      style={{
        position: "fixed",
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        background: "rgba(0,0,0,0.5)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        zIndex: 10000,
      }}
    >
      <div
        style={{
          background: "#ffffff",
          borderRadius: 16,
          padding: 32,
          maxWidth: 500,
          width: "90%",
          textAlign: "center",
          border: "1px solid #e2e8f0",
          boxShadow: "0 20px 40px rgba(0,0,0,0.1)",
        }}
      >
        <h2 style={{ color: "#1e293b", marginBottom: 16 }}>
          🎤 Voice Session Setup
        </h2>
        <p style={{ color: "#64748b", marginBottom: 24 }}>
          Let's set up your voice therapy session to personalize your
          experience.
        </p>
        <div style={{ display: "flex", gap: 12, justifyContent: "center" }}>
          <button
            onClick={() => router.push("/voice-setup")}
            style={{
              background: "linear-gradient(135deg, #6366f1, #a21caf)",
              color: "#fff",
              border: "none",
              borderRadius: 8,
              padding: "12px 24px",
              cursor: "pointer",
              fontSize: 16,
              fontWeight: 500,
              transition: "transform 0.2s",
            }}
            onMouseEnter={(e) =>
              (e.target.style.transform = "translateY(-2px)")
            }
            onMouseLeave={(e) => (e.target.style.transform = "translateY(0)")}
          >
            Set Up Now
          </button>
          <button
            onClick={() => setShowSetupModal(false)}
            style={{
              background: "transparent",
              color: "#64748b",
              border: "1px solid #e2e8f0",
              borderRadius: 8,
              padding: "12px 24px",
              cursor: "pointer",
              fontSize: 16,
              transition: "background-color 0.2s",
            }}
            onMouseEnter={(e) => (e.target.style.backgroundColor = "#f8fafc")}
            onMouseLeave={(e) =>
              (e.target.style.backgroundColor = "transparent")
            }
          >
            Skip for Now
          </button>
        </div>
      </div>
    </div>
  );

  return (
    <>
      <Head>
        <title>
          EchoNest Voice | AI-Powered Therapy Platform – 24/7 Mental Health
          Support
        </title>
        <style>{`
          body, html { 
            background: #ffffff !important; 
            margin: 0;
            padding: 0;
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
          }
          @keyframes listening {
            0%, 100% { transform: scale(1); box-shadow: 0 0 40px rgba(99, 102, 241, 0.3); }
            50% { transform: scale(1.05); box-shadow: 0 0 60px rgba(99, 102, 241, 0.5); }
          }
        `}</style>
      </Head>

      {showSetupModal && <VoiceSetupModal />}

      <div
        style={{
          minHeight: "100vh",
          background: "linear-gradient(135deg, #f8fafc 0%, #ffffff 100%)",
          display: "flex",
          flexDirection: "column",
          position: "relative",
        }}
      >
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
                      Voice Session
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
              onClick={() => router.push("/voice-setup")}
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
              Edit Setup
            </button>
          </div>
        </header>

        <div
          style={{
            flex: 1,
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            padding: "40px 20px",
          }}
        >
          <div
            className="voice-main-container-unique-voice"
            style={{
              width: 180,
              height: 180,
              borderRadius: "50%",
              background:
                status === "listening" ||
                status === "processing" ||
                status === "speaking"
                  ? "linear-gradient(135deg, #6366f1, #a21caf)"
                  : "#e2e8f0",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              marginBottom: 40,
              animation:
                status === "listening" ||
                status === "processing" ||
                status === "speaking"
                  ? "listening 1.5s ease-in-out infinite"
                  : "none",
              transition: "all 0.3s ease",
              border: `2px solid ${
                status === "listening" ||
                status === "processing" ||
                status === "speaking"
                  ? "#c7d2fe"
                  : "#f1f5f9"
              }`,
              position: "relative",
            }}
          >
            {/* Canvas for visual effects */}
            <canvas
              ref={canvasRef}
              style={{
                position: "absolute",
                top: 0,
                left: 0,
                width: "100%",
                height: "100%",
                borderRadius: "50%",
                pointerEvents: "none",
              }}
              width={180}
              height={180}
            />

            {/* Canvas-based microphone UI */}
            <div
              style={{
                position: "relative",
                zIndex: 1,
                width: "100%",
                height: "100%",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              {/* Canvas for drawing microphone icon */}
              <canvas
                ref={canvasRef}
                style={{
                  position: "absolute",
                  top: 0,
                  left: 0,
                  width: "100%",
                  height: "100%",
                  borderRadius: "50%",
                  pointerEvents: "none",
                }}
                width={180}
                height={180}
              />
            </div>
          </div>

          <div
            style={{
              color: "#1e293b",
              fontSize: 24,
              fontWeight: 600,
              marginBottom: 20,
              textAlign: "center",
              minHeight: "36px",
            }}
          >
            {status === "ready" &&
              (conversationStarted
                ? "Ready to listen"
                : "Press Start to Begin")}
            {status === "listening" && "Listening..."}
            {status === "processing" && "Processing..."}
            {status === "speaking" && "Speaking..."}
            {status === "error" && "An error occurred"}
          </div>

          {error && (
            <div
              style={{
                background: "#fef2f2",
                color: "#dc2626",
                padding: "12px 24px",
                borderRadius: 8,
                marginBottom: 20,
                maxWidth: 400,
                textAlign: "center",
                border: "1px solid #fecaca",
              }}
            >
              {error}
            </div>
          )}

          {status === "listening" && (
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: 12,
                marginBottom: 20,
                width: 250,
              }}
            >
              {/* <div
                style={{
                  width: "100%",
                  height: 6,
                  background: "#e2e8f0",
                  borderRadius: 3,
                  overflow: "hidden",
                }}
              >
                <div
                  style={{
                    width: `${Math.min(currentVolume * 2, 100)}%`,
                    height: "100%",
                    background: "linear-gradient(90deg, #6366f1, #a21caf)",
                    transition: "width 0.1s ease-out",
                  }}
                ></div>
              </div> */}
            </div>
          )}
        </div>

        <div
          style={{
            display: "flex",
            justifyContent: "center",
            alignItems: "center",
            padding: "32px",
            borderTop: "1px solid #e2e8f0",
            background: "rgba(255, 255, 255, 0.8)",
            backdropFilter: "blur(10px)",
          }}
        >
          <button
            onClick={endSession}
            style={{
              background: "linear-gradient(135deg, #9E31D8 0%, #C92A94 100%)",
              color: "#fff",
              border: "none",
              borderRadius: 10,
              padding: "12px 32px",
              fontSize: 18,
              fontWeight: 700,
              cursor: "pointer",
              boxShadow: "0 2px 8px rgba(0,0,0,0.1)",
              transition: "all 0.2s ease",
            }}
            onMouseEnter={(e) => {
              e.target.style.transform = "translateY(-1px)";
              e.target.style.boxShadow = "0 4px 12px rgba(0,0,0,0.15)";
            }}
            onMouseLeave={(e) => {
              e.target.style.transform = "translateY(0)";
              e.target.style.boxShadow = "0 2px 8px rgba(0,0,0,0.1)";
            }}
          >
            End Session
          </button>
        </div>
      </div>
    </>
  );
}
