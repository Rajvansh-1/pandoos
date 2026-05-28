import type { VercelRequest, VercelResponse } from '@vercel/node';

// Hardcoded fallback logic when Gemini is not configured
function fallbackNLP(text: string) {
  const lower = text.toLowerCase();
  let query = text; 
  let reply = "Let me dig into my bamboo forest for that...";
  let emotion = 'focus';
  
  if (lower.includes('sad') || lower.includes('cry') || lower.includes('heartbreak')) { 
    reply = "I'm here for you. Let's play some sad songs to let it out. 🌧️"; 
    query = "sad emotional acoustic heartbreak"; 
    emotion = 'heartbroken';
  }
  else if (lower.includes('workout') || lower.includes('gym')) { 
    reply = "Time to crush it! Let's get pumped! 🏋️‍♂️"; 
    query = "heavy workout gym phonk"; 
    emotion = 'workout';
  }
  else if (lower.includes('happy') || lower.includes('good mood') || lower.includes('dance')) { 
    reply = "Awesome! Let's keep the good vibes rolling and dance! ☀️"; 
    query = "happy feel good uplifting pop dance hits"; 
    emotion = 'happy';
  }
  else if (lower.includes('sleep') || lower.includes('bed') || lower.includes('tired')) { 
    reply = "Shh... time to rest. Here's some ambient magic. 💤"; 
    query = "sleep ambient delta waves lullaby"; 
    emotion = 'sleepy';
  }
  else if (lower.includes('chill') || lower.includes('relax') || lower.includes('lofi')) {
    reply = "Got it. Bamboo, tea, and lo-fi beats. 🍃";
    query = "lofi chill relax aesthetic beats";
    emotion = 'chill';
  }
  else if (lower.includes('desi') || lower.includes('punjabi')) {
    reply = "Pure swag incoming! 🔥";
    query = "desi hip hop punjabi swag hits";
    emotion = 'desi';
  }
  else if (lower.includes('bollywood') || lower.includes('hindi')) {
    reply = "Ah, the magic of Bollywood. Setting the stage... ✨";
    query = "bollywood pop romantic hits";
    emotion = 'bollywood';
  }
  else if (lower.includes('romantic') || lower.includes('love')) {
    reply = "Love is in the air. Playing some romantic hits. 💖";
    query = "romantic love songs acoustic";
    emotion = 'romantic';
  }
  else if (lower.includes('arijit') || lower.includes('singh')) {
    reply = "The voice of romance itself. Here is some Arijit Singh. 🎤";
    query = "arijit singh top romantic hits";
    emotion = 'romantic';
  }
  else {
    reply = `Searching for exactly what you asked for: "${text}"... 🔍`;
  }
  
  return { reply, query, emotion };
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { message } = req.body;
    
    if (!message) {
      return res.status(400).json({ error: 'Message is required' });
    }

    // Check if Gemini API Key exists
    const apiKey = process.env.GEMINI_API_KEY;

    if (apiKey) {
      try {
        // Use Gemini API
        const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            contents: [{
              parts: [{
                text: `You are Pandoo, a highly advanced, chill panda mascot for a music streaming app. 
The user says: "${message}"

Determine the best music search query for the YouTube Music API to fulfill their request.
Also write a short, friendly, conversational reply (1-2 sentences, use emojis).

Return ONLY a valid JSON object in this exact format, with no markdown formatting or extra text:
{
  "reply": "Your friendly conversational reply here.",
  "query": "The highly optimized youtube music search query",
  "emotion": "chill" // Must be one of: chill, happy, heartbroken, workout, focus, sleepy, bollywood, desi, romantic
}`
              }]
            }]
          })
        });

        if (!response.ok) {
          throw new Error('Gemini API failed');
        }

        const data = await response.json();
        const geminiText = data.candidates?.[0]?.content?.parts?.[0]?.text;
        
        if (geminiText) {
          // Clean markdown formatting if Gemini included it despite instructions
          const cleanedText = geminiText.replace(/```json/g, '').replace(/```/g, '').trim();
          const parsed = JSON.parse(cleanedText);
          return res.status(200).json(parsed);
        }
      } catch (err) {
        console.error('Gemini error, falling back to NLP', err);
        // Fallback to local NLP on error
      }
    }

    // Fallback if no API key or Gemini fails
    const result = fallbackNLP(message);
    return res.status(200).json(result);

  } catch (error) {
    console.error('Chat API Error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}
