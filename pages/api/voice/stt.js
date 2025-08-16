// pages/api/voice/stt.js

import formidable from 'formidable';
import fs from 'fs';
import axios from 'axios';
import ffmpeg from 'fluent-ffmpeg';
import ffmpegInstaller from '@ffmpeg-installer/ffmpeg';
const FormData = require('form-data');

// Set FFmpeg path
ffmpeg.setFfmpegPath(ffmpegInstaller.path);

// Disable Next.js's default body parser to handle file streams
export const config = {
  api: {
    bodyParser: false,
  },
};

// Helper function to parse the incoming form data
function parseForm(req) {
  return new Promise((resolve, reject) => {
    const form = new formidable.IncomingForm();
    form.parse(req, (err, fields, files) => {
      if (err) return reject(err);
      // formidable can return an array of files, we only want the first one
      const file = Array.isArray(files.audio) ? files.audio[0] : files.audio;
      resolve({ file });
    });
  });
}

// Helper function to convert WebM to WAV using FFmpeg
function convertWebmToWav(inputPath, outputPath) {
  return new Promise((resolve, reject) => {
    ffmpeg(inputPath)
      .toFormat('wav')
      .audioCodec('pcm_s16le')
      .audioChannels(1)
      .audioFrequency(16000)
      .on('end', () => {
        console.log('✅ WebM to WAV conversion completed');
        resolve(outputPath);
      })
      .on('error', (err) => {
        console.error('❌ FFmpeg conversion error:', err);
        reject(err);
      })
      .save(outputPath);
  });
}

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  const apiKey = process.env.ELEVENLABS_API_KEY;
  if (!apiKey) {
    return res.status(500).json({ error: 'Missing ElevenLabs API key' });
  }

  try {
    const { file } = await parseForm(req);

    if (!file || !file.filepath) {
      return res.status(400).json({ error: 'No audio file uploaded' });
    }

    const filePath = file.filepath;
    const fileName = file.originalFilename || 'audio.webm';
    const contentType = file.mimetype || 'audio/webm';
    
    console.log('📤 Processing audio file:', {
      fileName,
      contentType,
      fileSize: file.size
    });
    
    let finalFilePath = filePath;
    let finalFileName = fileName;
    let finalContentType = contentType;
    
    // Convert WebM to WAV if needed
    if (contentType.includes('webm')) {
      console.log('🔄 Converting WebM to WAV for ElevenLabs compatibility...');
      try {
        const wavPath = filePath.replace('.webm', '.wav').replace('.mp4', '.wav');
        await convertWebmToWav(filePath, wavPath);
        finalFilePath = wavPath;
        finalFileName = finalFileName.replace('.webm', '.wav').replace('.mp4', '.wav');
        finalContentType = 'audio/wav';
        console.log('✅ Conversion successful, using WAV file');
      } catch (conversionError) {
        console.error('❌ WebM to WAV conversion failed:', conversionError);
        // Continue with original file as fallback
      }
    }
    
    const audioStream = fs.createReadStream(finalFilePath);

    // Create form data to send to ElevenLabs
    const formData = new FormData();
    
    console.log('📤 Sending to ElevenLabs STT:', {
      fileName: finalFileName,
      contentType: finalContentType,
      fileSize: file.size
    });
    
    formData.append('file', audioStream, {
      filename: finalFileName,
      contentType: finalContentType,
    });
    
    // Add model specification for better results
    formData.append('model_id', 'scribe_v1');

    // Send the audio to ElevenLabs for transcription
    const response = await axios.post('https://api.elevenlabs.io/v1/speech-to-text', formData, {
      headers: {
        'xi-api-key': apiKey,
        ...formData.getHeaders(),
        'Accept': 'application/json',
      },
      timeout: 30000, // 30 second timeout
    });

    // Clean up the temporary files
    fs.unlink(filePath, (err) => {
        if (err) console.error("Error deleting original temp file:", err);
    });
    
    // Clean up converted file if it's different from original
    if (finalFilePath !== filePath) {
      fs.unlink(finalFilePath, (err) => {
          if (err) console.error("Error deleting converted temp file:", err);
      });
    }
    
    console.log('✅ ElevenLabs STT response:', response.data);
    
    // The transcript is usually in response.data.text for the latest API
    const transcript = response.data.text;
    return res.status(200).json({ transcript: transcript || '' });

  } catch (err) {
    console.error('[STT_API_ERROR]', err.response ? err.response.data : err.message);
    
    // Clean up temp file on error
    if (err.file && err.file.filepath) {
      fs.unlink(err.file.filepath, (unlinkErr) => {
        if (unlinkErr) console.error("Error deleting temp file on error:", unlinkErr);
      });
    }
    
    let errorMessage = 'Speech-to-text processing failed';
    
    if (err.response) {
      if (err.response.status === 401) {
        errorMessage = 'ElevenLabs API key is invalid or expired';
      } else if (err.response.status === 413) {
        errorMessage = 'Audio file is too large. Please record a shorter message.';
      } else if (err.response.status === 422) {
        errorMessage = 'Audio format not supported. Please try again.';
      } else if (err.response.data && err.response.data.detail) {
        errorMessage = `ElevenLabs API error: ${err.response.data.detail}`;
      }
    } else if (err.code === 'ECONNABORTED') {
      errorMessage = 'Request timed out. Please try again.';
    }
    
    return res.status(500).json({
      error: errorMessage,
      details: err.response ? err.response.data : err.message,
    });
  }
}