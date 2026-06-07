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

  // Handle media events setup
  useEffect(() => {
    const audio = audioRef.current;
    audio.volume = volume;

    const handleTimeUpdate = () => {
      setCurrentTime(audio.currentTime);
    };

    const handleDurationChange = () => {
      setDuration(audio.duration || 0);
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
