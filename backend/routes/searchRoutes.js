const express = require('express');
const axios = require('axios');
const router = express.Router();

// Helper to parse ISO 8601 duration format (e.g. PT4M13S -> 253 seconds)
function parseISO8601Duration(durationString) {
  const regex = /PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?/;
  const matches = durationString.match(regex);
  if (!matches) return 0;
  
  const hours = parseInt(matches[1] || 0, 10);
  const minutes = parseInt(matches[2] || 0, 10);
  const seconds = parseInt(matches[3] || 0, 10);
  
  return hours * 3600 + minutes * 60 + seconds;
}

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
        maxResults: '15',
        type: 'video'
      },
      headers: {
        'x-rapidapi-host': 'youtube-v31.p.rapidapi.com',
        'x-rapidapi-key': process.env.RAPIDAPI_KEY
      }
    });

    const items = response.data?.items || [];
    const videos = items.filter(item => item.id && item.id.kind === 'youtube#video');
    
    // Fetch durations for all videos in a single batch query
    const durationsMap = {};
    if (videos.length > 0) {
      const videoIds = videos.map(v => v.id.videoId).join(',');
      try {
        const detailsResponse = await axios.get('https://youtube-v31.p.rapidapi.com/videos', {
          params: {
            id: videoIds,
            part: 'contentDetails'
          },
          headers: {
            'x-rapidapi-host': 'youtube-v31.p.rapidapi.com',
            'x-rapidapi-key': process.env.RAPIDAPI_KEY
          }
        });
        
        const detailItems = detailsResponse.data?.items || [];
        detailItems.forEach(item => {
          if (item.id && item.contentDetails?.duration) {
            durationsMap[item.id] = parseISO8601Duration(item.contentDetails.duration);
          }
        });
      } catch (err) {
        console.warn('Failed to fetch video durations, defaulting to 0:', err.message);
      }
    }

    // Format the search output for your React frontend
    const formattedVideos = videos.map(video => ({
      videoId: video.id.videoId,
      title: video.snippet.title,
      artist: video.snippet.channelTitle,
      thumbnail: video.snippet.thumbnails?.high?.url || video.snippet.thumbnails?.default?.url || '',
      duration: durationsMap[video.id.videoId] || 0,
      url: `https://youtube.com/watch?v=${video.id.videoId}`
    }));

    return res.json(formattedVideos);
  } catch (error) {
    console.error('Search error:', error.message);
    if (error.response) {
      console.error('RapidAPI search response error:', {
        status: error.response.status,
        data: error.response.data
      });
    }
    return res.status(500).json({ 
      error: 'Failed to search YouTube.',
      details: error.response?.data?.message || error.message
    });
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
        maxResults: '3',
        type: 'video'
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
    
    // Fetch duration for the resolved match
    let duration = 0;
    try {
      const detailsResponse = await axios.get('https://youtube-v31.p.rapidapi.com/videos', {
        params: {
          id: bestMatch.id.videoId,
          part: 'contentDetails'
        },
        headers: {
          'x-rapidapi-host': 'youtube-v31.p.rapidapi.com',
          'x-rapidapi-key': process.env.RAPIDAPI_KEY
        }
      });
      
      const detailItem = detailsResponse.data?.items?.[0];
      if (detailItem && detailItem.contentDetails?.duration) {
        duration = parseISO8601Duration(detailItem.contentDetails.duration);
      }
    } catch (err) {
      console.warn('Failed to fetch resolved video duration, defaulting to 0:', err.message);
    }

    return res.json({
      videoId: bestMatch.id.videoId,
      title: bestMatch.snippet.title,
      artist: bestMatch.snippet.channelTitle,
      thumbnail: bestMatch.snippet.thumbnails?.high?.url || bestMatch.snippet.thumbnails?.default?.url || '',
      duration: duration,
      url: `https://youtube.com/watch?v=${bestMatch.id.videoId}`
    });
  } catch (error) {
    console.error('Resolve error:', error.message);
    if (error.response) {
      console.error('RapidAPI resolve response error:', {
        status: error.response.status,
        data: error.response.data
      });
    }
    return res.status(500).json({ 
      error: 'Failed to resolve track on YouTube.',
      details: error.response?.data?.message || error.message
    });
  }
});

module.exports = router;
