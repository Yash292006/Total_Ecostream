const express = require('express');
const router = express.Router();
const axios = require('axios');

const handleStream = async (req, res) => {
  const { videoId } = req.params;
  const fullYoutubeUrl = `https://www.youtube.com/watch?v=${videoId}`;

  console.log(`[Stream] Request received for videoId: ${videoId}`);

  try {
    const response = await axios.get('https://youtube-mp310.p.rapidapi.com/download/mp3', {
      params: { url: fullYoutubeUrl },
      headers: {
        'x-rapidapi-host': 'youtube-mp310.p.rapidapi.com',
        'x-rapidapi-key': process.env.RAPIDAPI_KEY
      }
    });

    // Extract the MP3 download/stream URL from the API response
    const streamUrl = response.data.downloadUrl || response.data.url || response.data;
    
    if (!streamUrl) {
      throw new Error('API did not return a valid downloadUrl or url.');
    }

    console.log(`[Stream] Resolved streamUrl successfully: ${streamUrl}`);

    // If the request accepts JSON, send JSON. Otherwise, redirect for HTML5 audio tags.
    if (req.headers.accept && req.headers.accept.includes('application/json')) {
      return res.json({ streamUrl: streamUrl });
    } else {
      return res.redirect(streamUrl);
    }

  } catch (error) {
    console.error("Streaming API error:", error.message);
    return res.status(500).json({ error: "Failed to fetch audio stream" });
  }
};

// Route: GET /api/stream/:videoId (standard)
router.get('/:videoId', handleStream);

// Route: GET /api/stream/stream/:videoId (fallback matching example snippet)
router.get('/stream/:videoId', handleStream);

module.exports = router;
