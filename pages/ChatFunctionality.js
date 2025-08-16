// ChatFunctionality.js - Handles Text Chat
import React, { useState, useRef, useEffect } from 'react';
import { MdAdd, MdKeyboardVoice } from 'react-icons/md';
import { FiSend, FiX } from 'react-icons/fi';
import { HiSpeakerWave } from 'react-icons/hi2';

export default function ChatFunctionality({ onNewMessage, messages, theme = 'dark' }) {
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const textareaRef = useRef(null);
  const fileInputRef = useRef();
  const [fileHover, setFileHover] = useState(false);
  const [voiceHover, setVoiceHover] = useState(false);
  const [sendHover, setSendHover] = useState(false);
  const [ttsLoading, setTtsLoading] = useState(false);
  const [ttsHover, setTtsHover] = useState(false);
  const [previewImage, setPreviewImage] = useState(null);

  const isDark = theme === 'dark';
  const colors = {
    barBg: isDark ? '#242526' : '#fff',
    inputBg: 'transparent',
    inputText: isDark ? '#f5f6fa' : '#232323',
    icon: isDark ? '#a3a6f7' : '#3366ff',
    iconInactive: '#b0b3b8',
    border: isDark ? '#232323' : '#e3e6ea'
  };

  // Function to adjust textarea height
  const adjustTextareaHeight = () => {
    const textarea = textareaRef.current;
    if (textarea) {
      textarea.style.height = 'auto';
      const newHeight = Math.min(textarea.scrollHeight, 120); // Max height of 120px
      textarea.style.height = `${newHeight}px`;
    }
  };

  // Adjust height when input changes
  useEffect(() => {
    adjustTextareaHeight();
  }, [input]);

  const sendMessage = async () => {
    if (!input.trim() || loading) return;
    setLoading(true);
    setInput('');
    if (previewImage) {
      await onNewMessage({ role: 'user', content: input, image: previewImage });
      setPreviewImage(null);
    } else {
      await onNewMessage({ role: 'user', content: input });
    }
    setLoading(false);
  };

  const handleKeyPress = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  const handleFileUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    if (!['image/png', 'image/jpeg'].includes(file.type)) {
      alert('Only PNG and JPG images are allowed.');
      return;
    }
    setLoading(true);
    const reader = new FileReader();
    reader.onload = async () => {
      setPreviewImage(reader.result);
      // Extract text in the background
      try {
        const Tesseract = (await import('tesseract.js')).default;
        const { data: { text } } = await Tesseract.recognize(reader.result, 'eng');
        console.log('Extracted OCR text:', text);
        await fetch('/api/ocr', { method: 'POST', body: JSON.stringify({ text }) });
        // Only send the extracted text as the last user message to the assistant
        if (text && text.trim()) {
          try {
            const response = await fetch('/api/chat', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                messages: [
                  ...messages,
                  { role: 'user', content: text }
                ]
              }),
            });
            const data = await response.json();
            if (data.reply) {
              onNewMessage({ ...data.reply, timestamp: new Date().toISOString() });
            } else {
              console.error('No reply from assistant:', data.error || data);
            }
          } catch (err) {
            console.error('Error calling /api/chat:', err);
          }
        }
      } catch (error) {
        // Optionally handle OCR errors silently
        console.error('OCR error:', error);
      }
      setLoading(false);
    };
    reader.readAsDataURL(file);
  };

  const handleFileButtonClick = () => {
    if (fileInputRef.current) fileInputRef.current.click();
  };

  // Simple voice input implementation
  const startVoiceInput = () => {
    if (loading || isRecording) return;
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) {
      alert('Speech recognition is not supported in this browser.');
      return;
    }
    const recognition = new SpeechRecognition();
    recognition.lang = 'en-US';
    recognition.interimResults = false;
    recognition.maxAlternatives = 1;
    setIsRecording(true);
    recognition.start();
    recognition.onresult = (event) => {
      const transcript = event.results[0][0].transcript;
      setIsRecording(false);
      if (transcript && transcript.trim()) {
        onNewMessage({ role: 'user', content: transcript });
      }
    };
    recognition.onerror = (event) => {
      setIsRecording(false);
      alert('Voice input error: ' + event.error);
    };
    recognition.onend = () => {
      setIsRecording(false);
    };
  };

  // Find the last assistant message
  const lastAssistantMsg = messages && messages.length > 0
    ? [...messages].reverse().find(m => m.role === 'assistant' && m.content && typeof m.content === 'string')
    : null;

  const playAssistantTTS = async () => {
    if (!lastAssistantMsg || ttsLoading) return;
    setTtsLoading(true);
    try {
      const res = await fetch('/api/voice/tts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: lastAssistantMsg.content }),
      });
      if (!res.ok) throw new Error('TTS failed');
      const audioBlob = await res.blob();
      const audioUrl = URL.createObjectURL(audioBlob);
      const audio = new window.Audio(audioUrl);
      audio.play();
    } catch (err) {
      alert('Sorry, could not play audio.');
    }
    setTtsLoading(false);
  };

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        width: 'auto',
        background: 'transparent',
        borderRadius: 12,
        boxShadow: isDark ? '0 1px 4px rgba(0,0,0,0.06)' : '0 1px 4px rgba(0,0,0,0.03)',
        padding: 8,
        border: `1px solid ${colors.border}`,
        fontFamily: 'system-ui, Arial, sans-serif',
      }}
    >
      {/* Text Input Field */}
      <div style={{ position: 'relative', width: '100%' }}>
        {previewImage && (
          <div style={{ marginBottom: 8, position: 'relative', display: 'inline-block' }}>
            <img src={previewImage} alt="Preview" style={{ width: 80, height: 80, objectFit: 'cover', borderRadius: 8 }} />
            <button
              type="button"
              onClick={() => setPreviewImage(null)}
              style={{
                position: 'absolute',
                top: -8,
                right: -8,
                background: '#fff',
                border: '1px solid #e3e3e3',
                borderRadius: '50%',
                width: 22,
                height: 22,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                cursor: 'pointer',
                boxShadow: '0 1px 4px rgba(0,0,0,0.08)',
                zIndex: 2
              }}
              aria-label="Remove image"
            >
              <FiX size={16} color="#000000" />
            </button>
          </div>
        )}
        <textarea
          ref={textareaRef}
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyPress={handleKeyPress}
          placeholder="Enter your message..."
          style={{
            width: '100%',
            padding: '10px 12px',
            border: 'none',
            outline: 'none',
            fontSize: 14,
            background: colors.inputBg,
            color: colors.inputText,
            borderRadius: 12,
            marginBottom: 8,
            boxSizing: 'border-box',
            minHeight: 40,
            maxHeight: 120,
            resize: 'none',
            fontFamily: 'system-ui, Arial, sans-serif',
            lineHeight: '1.5',
            overflowY: 'auto',
            transition: 'height 0.1s ease-out'
          }}
          disabled={loading}
          rows={1}
        />
      </div>

      {/* Action Buttons Row */}
      <div className="echonest-chat-actionbar" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 4 }}>
        {/* File Upload (Plus Icon) - Disabled for now visually and functionally */}
        <button
          className="echonest-chat-btn-attach"
          type="button"
          onClick={() => {}}
          disabled={true}
          onMouseEnter={() => setFileHover(true)}
          onMouseLeave={() => setFileHover(false)}
          style={{
            width: 36,
            height: 36,
            background: fileHover ? '#f3f4f6' : '#fff',
            border: '1px solid #e3e3e3',
            borderRadius: 8,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            cursor: 'not-allowed',
            opacity: 0.6,
            padding: 0,
            marginLeft: 10,
            transition: 'background 0.2s',
          }}
          title="File attachment is temporarily disabled"
        >
          <MdAdd size={24} color={'#ccc'} />
        </button>
        <input
          ref={fileInputRef}
          id="file-upload"
          type="file"
          accept="image/png, image/jpeg"
          style={{ display: 'none' }}
          onChange={handleFileUpload}
          disabled={true}
        />
        <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end', marginRight: 10 }}>
          {/* Voice Icon */}
          <button
            className="echonest-chat-btn-voice"
            type="button"
            onClick={startVoiceInput}
            disabled={loading || isRecording}
            onMouseEnter={() => setVoiceHover(true)}
            onMouseLeave={() => setVoiceHover(false)}
            style={{
              width: 36,
              height: 36,
              background: voiceHover ? '#f3f4f6' : '#fff',
              border: '1px solid #e3e3e3',
              borderRadius: 8,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              cursor: loading || isRecording ? 'not-allowed' : 'pointer',
              opacity: loading || isRecording ? 0.5 : 1,
              padding: 0,
              transition: 'background 0.2s',
            }}
            title={isRecording ? 'Recording...' : 'Start voice input'}
          >
            <MdKeyboardVoice size={24} color="#181F2C" />
          </button>
          {/* Send Icon */}
          <button
            className="echonest-chat-btn-send"
            type="button"
            onClick={sendMessage}
            disabled={loading}
            onMouseEnter={() => setSendHover(true)}
            onMouseLeave={() => setSendHover(false)}
            style={{
              width: 36,
              height: 36,
              background: sendHover ? '#23272f' : '#000000',
              border: 'none',
              borderRadius: 8,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              cursor: loading ? 'not-allowed' : 'pointer',
              opacity: loading ? 0.5 : (input.trim() ? 1 : 0.7),
              padding: 0,
              transition: 'background 0.2s, opacity 0.2s',
            }}
            title="Send Message"
          >
            <FiSend size={24} color="#fff" />
          </button>
        </div>
      </div>
    </div>
  );
}
