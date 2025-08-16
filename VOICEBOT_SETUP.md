# Voice Bot Setup Guide

## 🎤 Voice Bot Features

This voice bot uses a hybrid approach:
- **Primary**: ElevenLabs API for high-quality STT and TTS
- **Fallback**: Browser-native Web Speech API and Web Speech Synthesis

## 🔧 API Configuration

### ElevenLabs Setup (Optional - for better quality)

1. **Get API Key**: Sign up at [ElevenLabs](https://elevenlabs.io/) and get your API key
2. **Create .env file**: Add your API key to a `.env` file in the root directory:

```env
ELEVENLABS_API_KEY=your_elevenlabs_api_key_here
ELEVENLABS_VOICE_ID=pNInz6obpgDQGcFmaJgB
```

### Without API Keys (Browser-only mode)

The voice bot will work without any API keys using:
- **Web Speech API**: For speech-to-text
- **Web Speech Synthesis**: For text-to-speech

## 🚀 How It Works

### Audio Recording Flow:
1. **Start Listening**: Gets microphone access
2. **Volume Monitoring**: Real-time audio level analysis
3. **Silence Detection**: Stops after 2 seconds of silence
4. **Processing**: Sends audio to STT (ElevenLabs or Web Speech API)
5. **Response**: Generates bot response
6. **Speaking**: Uses TTS (ElevenLabs or Web Speech Synthesis)
7. **Restart**: Automatically starts listening again

### Configuration Options:

```javascript
// In pages/voice.js - adjust these values as needed
const SILENCE_TIMEOUT_MS = 2000; // 2 seconds of silence
const AUDIO_SILENCE_THRESHOLD = 35; // Volume threshold (20-50)
const RE_ENGAGE_TIMEOUT_MS = 15000; // 15 seconds before re-engagement
```

## 🎯 Testing

1. **Open the voice bot** at `/voice`
2. **Speak clearly** - watch for voice activity indicator
3. **Stop speaking** - wait for auto-stop (2 seconds)
4. **Listen to response** - bot will speak back
5. **Continue conversation** - automatically restarts

## 🔍 Debugging

Check the browser console for detailed logs:
- `🎤 Starting to listen...`
- `🔊 Audio level: [number]`
- `⏹️ MediaRecorder stopped`
- `⬆️ Sending audio to STT API...`
- `🗣️ User said: [transcript]`
- `🤖 Bot will say: [response]`

## 🛠️ Troubleshooting

### "Audio recording fails"
- Check microphone permissions
- Try adjusting `AUDIO_SILENCE_THRESHOLD`
- Check browser console for errors

### "ElevenLabs API errors"
- Verify API key in `.env` file
- Check ElevenLabs account status
- System will fall back to browser APIs

### "No speech detected"
- Speak louder or adjust threshold
- Check microphone is working
- Try different browser

## 📱 Browser Compatibility

- **Chrome/Edge**: Full support
- **Firefox**: Full support
- **Safari**: Limited Web Speech API support
- **Mobile**: Works on most modern browsers

## 🎨 Customization

### Voice Settings:
```javascript
// In speakWithWebSpeech function
utterance.rate = 0.9; // Speed (0.1-10)
utterance.pitch = 1.0; // Pitch (0-2)
utterance.volume = 1.0; // Volume (0-1)
```

### Bot Responses:
```javascript
// In getBotResponseFromAPI function
// Add your own response logic here
```

## 🔒 Security

- API keys are stored in environment variables
- Audio is processed locally when possible
- No audio data is stored permanently
- HTTPS recommended for production 