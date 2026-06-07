const express = require('express');
const axios = require('axios');
const router = express.Router();

// In-memory cache for resolved format information to prevent API rate limiting & socket hang-ups
const formatCache = new Map();
const CACHE_TTL = 30 * 60 * 1000; // 30 minutes TTL (YouTube URLs expire in 6 hours)

// Route: GET /api/stream/:videoId
router.get('/:videoId', async (req, res) => {
  const { videoId } = req.params;

  if (!videoId || videoId.trim() === '') {
    return res.status(400).json({ error: 'Video ID parameter is required.' });
  }

  try {
    let streamInfo = null;
    const cached = formatCache.get(videoId);
    
    if (cached && cached.expiresAt > Date.now()) {
      streamInfo = cached.streamInfo;
      console.log(`[Cache Hit] Using cached stream format for videoId: ${videoId}`);
    } else {
      console.log(`[Cache Miss] Resolving streaming data from RapidAPI for videoId: ${videoId}...`);
      
      const response = await axios.get(`https://youtube-scraper-api.p.rapidapi.com/v1/stream?videoId=${videoId}`, {
        headers: {
          'x-rapidapi-key': process.env.RAPIDAPI_KEY,
          'x-rapidapi-host': 'youtube-scraper-api.p.rapidapi.com'
        }
      });

      if (!response.data) {
        throw new Error('RapidAPI returned empty response data.');
      }

      // Try to parse the stream URL from various possible response structures
      let streamUrl = null;
      if (typeof response.data === 'string') {
        streamUrl = response.data;
      } else {
        streamUrl = response.data.url ||
                    response.data.streamUrl ||
                    response.data.stream_url ||
                    (response.data.formats && response.data.formats[0] && response.data.formats[0].url) ||
                    (response.data.streams && response.data.streams[0] && response.data.streams[0].url) ||
                    (response.data.data && response.data.data.url) ||
                    (response.data.data && response.data.data.streamUrl);
      }

      if (!streamUrl) {
        console.error('Failed to extract stream URL from RapidAPI response:', response.data);
        throw new Error('Failed to retrieve streaming URL from YouTube Scraper API.');
      }

      // Fetch content length and content type directly from YouTube's media server
      let contentLength = null;
      let contentType = 'audio/mpeg';

      try {
        const headRes = await axios.head(streamUrl, {
          headers: {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)'
          },
          timeout: 5000
        });
        contentLength = headRes.headers['content-length'] ? parseInt(headRes.headers['content-length'], 10) : null;
        contentType = headRes.headers['content-type'] || 'audio/mpeg';
      } catch (headErr) {
        console.warn(`[Stream] HEAD request failed for ${videoId}, attempting GET request headers fallback...`);
        try {
          const getHeadersResponse = await axios.get(streamUrl, {
            headers: {
              'Range': 'bytes=0-0',
              'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)'
            },
            timeout: 5000
          });
          const contentRange = getHeadersResponse.headers['content-range'];
          if (contentRange) {
            const parts = contentRange.split('/');
            if (parts.length > 1) {
              contentLength = parseInt(parts[1], 10);
            }
          }
          contentType = getHeadersResponse.headers['content-type'] || 'audio/mpeg';
        } catch (getErr) {
          console.error(`[Stream] GET fallback headers failed for ${videoId}:`, getErr);
        }
      }

      streamInfo = {
        streamUrl,
        contentLength,
        contentType
      };

      formatCache.set(videoId, {
        streamInfo,
        expiresAt: Date.now() + CACHE_TTL
      });
    }

    const { streamUrl, contentLength, contentType } = streamInfo;

    // Parse the browser's Range request
    const rangeHeader = req.headers.range;
    if (rangeHeader && contentLength) {
      const parts = rangeHeader.replace(/bytes=/, "").split("-");
      const start = parseInt(parts[0], 10);
      const end = parts[1] ? parseInt(parts[1], 10) : contentLength - 1;

      // Limit response chunk size to 1MB to keep buffering snappy and reduce memory/network overhead
      const maxChunkSize = 1024 * 1024; // 1MB
      const actualEnd = Math.min(end, start + maxChunkSize - 1);
      const chunksize = (actualEnd - start) + 1;

      console.log(`Proxying Range request for videoId ${videoId}: bytes=${start}-${actualEnd}/${contentLength} (${chunksize} bytes)`);

      const streamResponse = await axios.get(streamUrl, {
        headers: {
          'Range': `bytes=${start}-${actualEnd}`,
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)'
        },
        responseType: 'stream'
      });

      res.writeHead(206, {
        'Content-Range': `bytes ${start}-${actualEnd}/${contentLength}`,
        'Accept-Ranges': 'bytes',
        'Content-Length': chunksize,
        'Content-Type': contentType
      });

      streamResponse.data.pipe(res);

      req.on('close', () => {
        streamResponse.data.destroy();
      });

    } else {
      console.log(`No range header for videoId ${videoId} or contentLength unknown, proxying full file stream...`);
      const streamResponse = await axios.get(streamUrl, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)'
        },
        responseType: 'stream'
      });

      const responseHeaders = {
        'Content-Type': contentType,
        'Accept-Ranges': 'bytes'
      };
      if (contentLength) {
        responseHeaders['Content-Length'] = contentLength;
      }

      res.writeHead(200, responseHeaders);

      streamResponse.data.pipe(res);

      req.on('close', () => {
        streamResponse.data.destroy();
      });
    }

  } catch (error) {
    console.error(`Error streaming videoId ${videoId}:`, error);
    if (!res.headersSent) {
      res.status(500).json({ 
        error: 'Failed to retrieve audio stream.', 
        details: error.message 
      });
    }
  }
});

module.exports = router;
