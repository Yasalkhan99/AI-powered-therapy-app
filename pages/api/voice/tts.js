import fetch from 'node-fetch';

export const config = {
  api: {
    responseLimit: '8mb',
  },
};

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  const { text, voice_id, setup_id } = req.body;
  const apiKey = process.env.ELEVENLABS_API_KEY;

  if (!apiKey) {
    console.error('[TTS] Missing ElevenLabs API key');
    return res.status(500).json({ error: 'Server is not configured for text-to-speech.' });
  }
  if (!text) {
    return res.status(400).json({ error: 'Missing text for TTS' });
  }

  // Determine which voice ID to use
  let elevenLabsVoiceId = voice_id;
  
  // If setup_id is provided, try to get voice settings from database
  if (setup_id && !voice_id) {
    try {
      const { getServerSession } = await import('next-auth/next');
      const { authOptions } = await import('../auth/[...nextauth]');
      const prisma = (await import('../../../lib/prisma')).default;
      
      const session = await getServerSession(req, res, authOptions);
      if (session?.user?.email) {
        const user = await prisma.user.findUnique({ 
          where: { email: session.user.email } 
        });
        
        if (user) {
          const setup = await prisma.voiceSessionSetup.findFirst({
            where: { 
              userId: user.id,
              id: setup_id 
            },
            orderBy: { createdAt: 'desc' }
          });
          
          if (setup?.voiceId) {
            elevenLabsVoiceId = setup.voiceId;
            console.log(`[TTS] Using voice from setup: ${setup.voiceName} (${setup.voiceId})`);
          }
        }
      }
    } catch (error) {
      console.error('[TTS] Error fetching voice setup:', error);
    }
  }
  
  // Fallback to default voice if no voice ID found
  if (!elevenLabsVoiceId) {
    elevenLabsVoiceId = process.env.ELEVENLABS_VOICE_ID || 'pNInz6obpgDQGcFmaJgB';
  }

  try {
    const ttsResponse = await fetch(
      `https://api.elevenlabs.io/v1/text-to-speech/${elevenLabsVoiceId}`,
      {
        method: 'POST',
        headers: {
          'xi-api-key': apiKey,
          'Content-Type': 'application/json',
          'Accept': 'audio/mpeg',
        },
        body: JSON.stringify({
          text: text,
          model_id: "eleven_multilingual_v2",
          voice_settings: {
            stability: 0.75,
            similarity_boost: 0.75,
          },
        }),
      }
    );

    if (ttsResponse.headers.get('content-type') !== 'audio/mpeg') {
      const errorDetails = await ttsResponse.json();
      console.error('[TTS] ElevenLabs did not return audio. Details:', errorDetails);
      return res.status(502).json({ error: 'TTS provider returned a non-audio response.', details: errorDetails });
    }
    if (!ttsResponse.ok) {
      const errorText = await ttsResponse.text();
      console.error('[TTS] ElevenLabs API Error:', ttsResponse.status, errorText);
      return res.status(ttsResponse.status).json({ error: 'TTS provider API error.', details: errorText });
    }

    const audioBuffer = await ttsResponse.arrayBuffer();
    if (audioBuffer.byteLength < 100) { // Check for suspiciously small files
      return res.status(502).json({ error: 'TTS provider returned an empty or invalid audio file.' });
    }

    res.setHeader('Content-Type', 'audio/mpeg');
    res.setHeader('Content-Length', audioBuffer.byteLength);
    res.send(Buffer.from(audioBuffer));

  } catch (e) {
    console.error('[TTS] Error during TTS process:', e);
    return res.status(500).json({ error: 'Failed to generate speech.', details: e.message });
  }
}