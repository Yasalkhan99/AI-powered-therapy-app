import React, { useState, useRef } from 'react';
import Head from 'next/head';

export default function MicTest() {
  const [status, setStatus] = useState('idle');
  const [error, setError] = useState(null);
  const [permissionStatus, setPermissionStatus] = useState('unknown');
  const [supportedFormats, setSupportedFormats] = useState([]);
  const [currentVolume, setCurrentVolume] = useState(0);
  
  const streamRef = useRef(null);
  const analyserRef = useRef(null);
  const animationFrameRef = useRef(null);

  const checkPermissions = async () => {
    try {
      if (navigator.permissions) {
        const permission = await navigator.permissions.query({ name: 'microphone' });
        setPermissionStatus(permission.state);
        console.log('Permission status:', permission.state);
      } else {
        setPermissionStatus('permissions API not supported');
      }
    } catch (err) {
      setPermissionStatus('error checking permissions');
      console.error('Permission check error:', err);
    }
  };

  const checkSupportedFormats = () => {
    const formats = [
      'audio/mp3',
      'audio/mpeg', 
      'audio/webm;codecs=opus',
      'audio/webm',
      'audio/mp4',
      'audio/ogg;codecs=opus',
      'audio/wav'
    ];
    
    const supported = formats.filter(format => MediaRecorder.isTypeSupported(format));
    setSupportedFormats(supported);
    console.log('Supported formats:', supported);
    
    // Check which ones are ElevenLabs compatible
    const elevenLabsCompatible = supported.filter(format => 
      format.includes('mp3') || 
      format.includes('mpeg') || 
      format.includes('mp4') || 
      format.includes('webm') || 
      format.includes('ogg') || 
      format.includes('wav')
    );
    
    console.log('ElevenLabs compatible formats:', elevenLabsCompatible);
  };

  const startTest = async () => {
    setStatus('testing');
    setError(null);
    
    try {
      console.log('🎤 Starting microphone test...');
      
      // Check if getUserMedia is supported
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        throw new Error('getUserMedia is not supported in this browser');
      }
      
      // Get microphone access
      const stream = await navigator.mediaDevices.getUserMedia({ 
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true
        } 
      });
      
      streamRef.current = stream;
      console.log('✅ Microphone access granted');
      setStatus('listening');
      
      // Set up volume monitoring
      const audioContext = new (window.AudioContext || window.webkitAudioContext)();
      const source = audioContext.createMediaStreamSource(stream);
      analyserRef.current = audioContext.createAnalyser();
      analyserRef.current.fftSize = 256;
      source.connect(analyserRef.current);
      
      const monitorVolume = () => {
        if (!analyserRef.current) return;
        
        const dataArray = new Uint8Array(analyserRef.current.fftSize);
        analyserRef.current.getByteTimeDomainData(dataArray);
        const maxVolume = dataArray.reduce((max, val) => Math.max(max, Math.abs(val - 128)), 0);
        setCurrentVolume(maxVolume);
        
        animationFrameRef.current = requestAnimationFrame(monitorVolume);
      };
      
      monitorVolume();
      
    } catch (err) {
      console.error('❌ Microphone test error:', err);
      setError(err.message);
      setStatus('error');
    }
  };

  const stopTest = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }
    
    if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current);
      animationFrameRef.current = null;
    }
    
    setStatus('idle');
    setCurrentVolume(0);
  };

  return (
    <>
      <Head>
        <title>Microphone Test</title>
      </Head>
      
      <div style={{
        minHeight: '100vh',
        padding: '20px',
        fontFamily: 'Arial, sans-serif',
        background: '#f5f5f5'
      }}>
        <h1>🎤 Microphone Test</h1>
        
        <div style={{ marginBottom: '20px' }}>
          <button 
            onClick={checkPermissions}
            style={{ marginRight: '10px', padding: '10px 15px' }}
          >
            Check Permissions
          </button>
          <button 
            onClick={checkSupportedFormats}
            style={{ marginRight: '10px', padding: '10px 15px' }}
          >
            Check Supported Formats
          </button>
        </div>
        
        <div style={{ marginBottom: '20px' }}>
          <strong>Permission Status:</strong> {permissionStatus}
        </div>
        
        <div style={{ marginBottom: '20px' }}>
          <strong>Supported Formats:</strong>
          <ul>
            {supportedFormats.map(format => (
              <li key={format}>{format}</li>
            ))}
          </ul>
        </div>
        
        <div style={{ marginBottom: '20px' }}>
          {status === 'idle' && (
            <button 
              onClick={startTest}
              style={{ 
                padding: '15px 30px', 
                fontSize: '18px',
                background: '#4CAF50',
                color: 'white',
                border: 'none',
                borderRadius: '5px',
                cursor: 'pointer'
              }}
            >
              Start Microphone Test
            </button>
          )}
          
          {status === 'listening' && (
            <div>
              <button 
                onClick={stopTest}
                style={{ 
                  padding: '15px 30px', 
                  fontSize: '18px',
                  background: '#f44336',
                  color: 'white',
                  border: 'none',
                  borderRadius: '5px',
                  cursor: 'pointer',
                  marginBottom: '10px'
                }}
              >
                Stop Test
              </button>
              
              <div style={{ marginTop: '10px' }}>
                <strong>Volume Level:</strong> {currentVolume}
                <div style={{
                  width: '200px',
                  height: '20px',
                  background: '#ddd',
                  borderRadius: '10px',
                  overflow: 'hidden',
                  marginTop: '5px'
                }}>
                  <div style={{
                    width: `${Math.min((currentVolume / 50) * 100, 100)}%`,
                    height: '100%',
                    background: '#4CAF50',
                    transition: 'width 0.1s'
                  }}></div>
                </div>
              </div>
            </div>
          )}
          
          {status === 'testing' && (
            <div>Testing microphone access...</div>
          )}
        </div>
        
        {error && (
          <div style={{
            padding: '15px',
            background: '#ffebee',
            color: '#c62828',
            borderRadius: '5px',
            border: '1px solid #ffcdd2'
          }}>
            <strong>Error:</strong> {error}
          </div>
        )}
        
        <div style={{ marginTop: '30px', padding: '20px', background: 'white', borderRadius: '5px' }}>
          <h3>🔧 Troubleshooting Tips:</h3>
          <ul>
            <li>Make sure your microphone is connected and working</li>
            <li>Check browser permissions (click the lock/info icon in the address bar)</li>
            <li>Try refreshing the page</li>
            <li>Use Chrome, Firefox, or Edge browser</li>
            <li>Make sure you're on HTTPS or localhost</li>
          </ul>
        </div>
      </div>
    </>
  );
} 