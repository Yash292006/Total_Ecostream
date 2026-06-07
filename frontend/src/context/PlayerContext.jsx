import React, { createContext, useState, useEffect, useRef } from 'react';
import { api } from './AuthContext';
import { getApiUrl } from '../apiConfig';
import { offlineManager } from '../utils/offlineManager';

export const PlayerContext = createContext();

const API_URL = getApiUrl();

export const PlayerProvider = ({ children }) => {
  const [currentTrack, setCurrentTrack] = useState(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [queue, setQueue] = useState([]);
  const [currentTrackIndex, setCurrentTrackIndex] = useState(-1);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [volume, setVolume] = useState(() => {
    const savedVolume = localStorage.getItem('spotify_volume');
    return savedVolume ? parseFloat(savedVolume) : 0.5;
  });

  const audioRef = useRef(new Audio());

  // Keep refs of queue and index for the event listener callback closure
  const queueRef = useRef([]);
  const indexRef = useRef(-1);

  useEffect(() => {
    queueRef.current = queue;
    indexRef.current = currentTrackIndex;
  }, [queue, currentTrackIndex]);

  const currentTrackRef = useRef(null);

  useEffect(() => {
    currentTrackRef.current = currentTrack;
  }, [currentTrack]);

  // Handle media events setup
  useEffect(() => {
    const audio = audioRef.current;
    audio.volume = volume;

    const handleTimeUpdate = () => {
      setCurrentTime(audio.currentTime);
    };

    const handleDurationChange = () => {
      const audioDuration = audio.duration;
      if (audioDuration && audioDuration !== Infinity && !isNaN(audioDuration)) {
        setDuration(audioDuration);
      } else if (currentTrackRef.current && currentTrackRef.current.duration) {
        setDuration(currentTrackRef.current.duration);
      } else {
        setDuration(0);
      }
    };

    const handleEnded = () => {
      const q = queueRef.current;
      const idx = indexRef.current;
      if (q.length > 0 && idx !== -1) {
        const nextIdx = (idx + 1) % q.length;
        playTrackAtIndex(nextIdx);
      } else {
        setIsPlaying(false);
      }
    };

    const handleError = (e) => {
      console.error('Audio element error event emitted:', e, audio.error);
    };

    audio.addEventListener('timeupdate', handleTimeUpdate);
    audio.addEventListener('durationchange', handleDurationChange);
    audio.addEventListener('ended', handleEnded);
    audio.addEventListener('error', handleError);

    return () => {
      audio.removeEventListener('timeupdate', handleTimeUpdate);
      audio.removeEventListener('durationchange', handleDurationChange);
      audio.removeEventListener('ended', handleEnded);
      audio.removeEventListener('error', handleError);
    };
  }, []);

  // Helper to resolve track video ID if missing
  const resolveTrack = async (track) => {
    if (track.videoId) return track;

    console.log(`[Player] Resolving YouTube stream for "${track.title}" by "${track.artist}"...`);
    const res = await api.get('/api/search/resolve', {
      params: { title: track.title, artist: track.artist }
    });

    return {
      ...track,
      videoId: res.data.videoId,
      duration: res.data.duration,
      thumbnail: res.data.thumbnail || track.thumbnail,
      artist: res.data.artist || track.artist
    };
  };

  const playTrackAtIndex = async (index) => {
    const q = queueRef.current.length > 0 ? queueRef.current : queue;
    if (index < 0 || index >= q.length) return;

    let track = { ...q[index] };
    setCurrentTrack(track);
    setCurrentTrackIndex(index);
    setCurrentTime(0);
    setIsPlaying(false);

    if (!track.videoId) {
      try {
        const resolved = await resolveTrack(track);
        track = resolved;

        // Update queue states
        const updatedQueue = [...q];
        updatedQueue[index] = resolved;
        setQueue(updatedQueue);
        queueRef.current = updatedQueue;
        setCurrentTrack(resolved);
      } catch (err) {
        const detailMsg = err.response?.data?.details || err.response?.data?.error || err.message;
        console.error('Failed to resolve track at index:', detailMsg, err);
        // Auto-play the next song if this one fails to resolve
        const nextIdx = (index + 1) % q.length;
        playTrackAtIndex(nextIdx);
        return;
      }
    }

    const audio = audioRef.current;
    
    // Attempt to play from offline cache first
    try {
      const offlineTrack = await offlineManager.getTrack(track.videoId);
      if (offlineTrack && offlineTrack.audioBlob) {
        console.log(`[Player] Playing downloaded offline track: "${track.title}"`);
        audio.src = URL.createObjectURL(offlineTrack.audioBlob);
      } else {
        audio.src = `${API_URL}/api/stream/${track.videoId}`;
      }
    } catch (e) {
      console.warn('Error loading offline track, falling back to network:', e);
      audio.src = `${API_URL}/api/stream/${track.videoId}`;
    }

    audio.load();
    audio.play()
      .then(() => {
        setIsPlaying(true);
      })
      .catch(err => {
        console.error('Audio playback error:', err);
        setIsPlaying(false);
      });
  };

  const playTrack = async (track, newQueue = []) => {
    // Compare tracks using videoId or title + artist to see if same track clicked
    const isSameTrack = currentTrack && (
      (track.videoId && currentTrack.videoId === track.videoId) ||
      (currentTrack.title === track.title && currentTrack.artist === track.artist)
    );

    if (isSameTrack) {
      togglePlay();
      return;
    }

    let activeQueue = newQueue.length > 0 ? [...newQueue] : [track];

    // Find index of target track in queue by title/artist
    let idx = activeQueue.findIndex(t => t.title === track.title && t.artist === track.artist);
    if (idx === -1) {
      activeQueue.push(track);
      idx = activeQueue.length - 1;
    }

    setQueue(activeQueue);
    setCurrentTrackIndex(idx);

    let trackToPlay = { ...track };
    setCurrentTrack(trackToPlay);
    setCurrentTime(0);
    setIsPlaying(false);

    if (!trackToPlay.videoId) {
      try {
        const resolved = await resolveTrack(trackToPlay);
        trackToPlay = resolved;

        // Sync resolved track to queue state
        activeQueue[idx] = resolved;
        setQueue([...activeQueue]);
        setCurrentTrack(resolved);
      } catch (err) {
        console.error('Failed to resolve track on play:', err);
        const detailMsg = err.response?.data?.details || err.response?.data?.error || err.message;
        alert(`Could not resolve song stream on YouTube: ${detailMsg}`);
        return;
      }
    }

    const audio = audioRef.current;

    // Attempt to play from offline cache first
    try {
      const offlineTrack = await offlineManager.getTrack(trackToPlay.videoId);
      if (offlineTrack && offlineTrack.audioBlob) {
        console.log(`[Player] Playing downloaded offline track: "${trackToPlay.title}"`);
        audio.src = URL.createObjectURL(offlineTrack.audioBlob);
      } else {
        audio.src = `${API_URL}/api/stream/${trackToPlay.videoId}`;
      }
    } catch (e) {
      console.warn('Error loading offline track, falling back to network:', e);
      audio.src = `${API_URL}/api/stream/${trackToPlay.videoId}`;
    }

    audio.load();
    audio.play()
      .then(() => {
        setIsPlaying(true);
      })
      .catch(err => {
        console.error('Audio playback error:', err);
        setIsPlaying(false);
      });
  };

  const togglePlay = () => {
    if (!currentTrack) return;
    const audio = audioRef.current;

    if (isPlaying) {
      audio.pause();
      setIsPlaying(false);
    } else {
      audio.play()
        .then(() => {
          setIsPlaying(true);
        })
        .catch(err => {
          console.error('Play resume error:', err);
        });
    }
  };

  const nextTrack = () => {
    if (queue.length === 0) return;
    const nextIdx = (currentTrackIndex + 1) % queue.length;
    playTrackAtIndex(nextIdx);
  };

  const prevTrack = () => {
    if (queue.length === 0) return;
    let prevIdx = currentTrackIndex - 1;
    if (prevIdx < 0) {
      prevIdx = queue.length - 1;
    }
    playTrackAtIndex(prevIdx);
  };

  const seekTo = (seconds) => {
    if (!currentTrack) return;
    audioRef.current.currentTime = seconds;
    setCurrentTime(seconds);
  };

  const changeVolume = (level) => {
    const clampedLevel = Math.max(0, Math.min(1, level));
    setVolume(clampedLevel);
    audioRef.current.volume = clampedLevel;
    localStorage.setItem('spotify_volume', clampedLevel);
  };

  // Keep active control handlers in refs to avoid re-binding MediaSession handlers on every render
  const controlsRef = useRef({});
  useEffect(() => {
    controlsRef.current = { togglePlay, nextTrack, prevTrack };
  }, [togglePlay, nextTrack, prevTrack]);

  // Register OS MediaSession notification and lock screen controls
  useEffect(() => {
    if (!('mediaSession' in navigator)) return;

    const actionHandlers = [
      ['play', () => controlsRef.current.togglePlay?.()],
      ['pause', () => controlsRef.current.togglePlay?.()],
      ['previoustrack', () => controlsRef.current.prevTrack?.()],
      ['nexttrack', () => controlsRef.current.nextTrack?.()],
      ['seekto', (details) => {
        if (audioRef.current) {
          if (details.fastSeek && 'fastSeek' in audioRef.current) {
            audioRef.current.fastSeek(details.seekTime);
          } else {
            audioRef.current.currentTime = details.seekTime;
          }
        }
      }],
    ];

    for (const [action, handler] of actionHandlers) {
      try {
        navigator.mediaSession.setActionHandler(action, handler);
      } catch (error) {
        console.warn(`MediaSession action "${action}" not supported:`, error);
      }
    }

    return () => {
      for (const [action] of actionHandlers) {
        try {
          navigator.mediaSession.setActionHandler(action, null);
        } catch (error) {
          console.warn(`Failed to clean up MediaSession action "${action}":`, error);
        }
      }
    };
  }, []);

  // Sync HTML5 Media Session metadata to OS lock screen & notifications
  useEffect(() => {
    if (!('mediaSession' in navigator) || !window.MediaMetadata || !currentTrack) return;

    // Update playback state
    navigator.mediaSession.playbackState = isPlaying ? 'playing' : 'paused';

    // Update metadata details
    navigator.mediaSession.metadata = new window.MediaMetadata({
      title: currentTrack.title || 'Unknown Title',
      artist: currentTrack.artist || 'Unknown Artist',
      album: 'EchoStream',
      artwork: [
        {
          src: currentTrack.thumbnail || 'https://images.unsplash.com/photo-1487180142328-0c4e37023af5?w=300',
          sizes: '300x300',
          type: 'image/jpeg'
        }
      ]
    });
  }, [currentTrack, isPlaying]);

  // Sync seekbar position in media notification
  useEffect(() => {
    if (!('mediaSession' in navigator) || !currentTrack || !duration) return;

    try {
      navigator.mediaSession.setPositionState({
        duration: duration,
        playbackRate: audioRef.current?.playbackRate || 1.0,
        position: currentTime
      });
    } catch (e) {
      console.warn('Error setting MediaSession position state:', e);
    }
  }, [currentTime, duration, currentTrack]);

  return (
    <PlayerContext.Provider
      value={{
        currentTrack,
        isPlaying,
        queue,
        currentTrackIndex,
        currentTime,
        duration,
        volume,
        playTrack,
        togglePlay,
        nextTrack,
        prevTrack,
        seekTo,
        changeVolume,
      }}
    >
      {children}
    </PlayerContext.Provider>
  );
};
