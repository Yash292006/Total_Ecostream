const express = require('express');
const axios = require('axios');
const router = express.Router();

// Route: GET /api/search?q=query
router.get('/', async (req, res) => {
  const { q } = req.query;
  
  if (!q || q.trim() === '') {
    return res.status(400).json({ error: 'Search query parameter "q" is required.' });
  }

  try {
    const response = await axios.get('https://youtube-v31.p.rapidapi.com/search', {
      params: {
        q: q,
        part: 'snippet,id',
        maxResults: '15'
      },
      headers: {
        'x-rapidapi-host': 'youtube-v31.p.rapidapi.com',
        'x-rapidapi-key': process.env.RAPIDAPI_KEY
      }
    });

    // Filter out channels/playlists, keep only videos
    const items = response.data?.items || [];
    const videos = items.filter(item => item.id && item.id.kind === 'youtube#video');
    
    // Format the search output for your React frontend
    const formattedVideos = videos.map(video => ({
      videoId: video.id.videoId,
      title: video.snippet.title,
      artist: video.snippet.channelTitle,
      thumbnail: video.snippet.thumbnails?.high?.url || video.snippet.thumbnails?.default?.url || '',
      duration: 0, // Not strictly required for the player to launch
      url: `https://youtube.com/watch?v=${video.id.videoId}`
    }));

    return res.json(formattedVideos);
  } catch (error) {
    console.error('Search error:', error.message);
    return res.status(500).json({ error: 'Failed to search YouTube.' });
  }
});

// Route: GET /api/search/resolve?title=song&artist=artist
router.get('/resolve', async (req, res) => {
  const { title, artist } = req.query;

  if (!title || title.trim() === '') {
    return res.status(400).json({ error: 'Search title is required.' });
  }

  try {
    const query = `${title} ${artist || ''}`.trim();
    console.log(`[Resolve] Searching YouTube for query: "${query}"`);
    
    const response = await axios.get('https://youtube-v31.p.rapidapi.com/search', {
      params: {
        q: query,
        part: 'snippet,id',
        maxResults: '3'
      },
      headers: {
        'x-rapidapi-host': 'youtube-v31.p.rapidapi.com',
        'x-rapidapi-key': process.env.RAPIDAPI_KEY
      }
    });

    const items = response.data?.items || [];
    const videos = items.filter(item => item.id && item.id.kind === 'youtube#video');

    if (videos.length === 0) {
      return res.status(404).json({ error: 'No matching track found on YouTube.' });
    }

    const bestMatch = videos[0];
    return res.json({
      videoId: bestMatch.id.videoId,
      title: bestMatch.snippet.title,
      artist: bestMatch.snippet.channelTitle,
      thumbnail: bestMatch.snippet.thumbnails?.high?.url || bestMatch.snippet.thumbnails?.default?.url || '',
      duration: 0,
      url: `https://youtube.com/watch?v=${bestMatch.id.videoId}`
    });
  } catch (error) {
    console.error('Resolve error:', error.message);
    return res.status(500).json({ error: 'Failed to resolve track on YouTube.' });
  }
});

module.exports = router;
