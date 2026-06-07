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

    // If the request accepts JSON, send JSON. Otherwise, proxy the audio stream with Range Request support.
    if (req.headers.accept && req.headers.accept.includes('application/json')) {
      return res.json({ streamUrl: streamUrl });
    } else {
      console.log(`[Stream] Fetching audio buffer from: ${streamUrl}`);
      const audioResponse = await axios({
        method: 'get',
        url: streamUrl,
        responseType: 'arraybuffer',
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/115.0.0.0 Safari/537.36'
        }
      });

      const totalLength = audioResponse.data.length;
      const range = req.headers.range;

      res.setHeader('Content-Type', 'audio/mpeg');
      res.setHeader('Accept-Ranges', 'bytes');

      if (range) {
        console.log(`[Stream] Handling range request: ${range}`);
        const parts = range.replace(/bytes=/, "").split("-");
        const start = parseInt(parts[0], 10);
        const end = parts[1] ? parseInt(parts[1], 10) : totalLength - 1;
        const chunksize = (end - start) + 1;
        
        res.status(206);
        res.setHeader('Content-Range', `bytes ${start}-${end}/${totalLength}`);
        res.setHeader('Content-Length', chunksize);
        
        const slice = audioResponse.data.slice(start, end + 1);
        return res.send(slice);
      } else {
        res.setHeader('Content-Length', totalLength);
        return res.send(audioResponse.data);
      }
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
