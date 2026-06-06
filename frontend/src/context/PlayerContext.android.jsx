// Watermark: Yash Creations
import React, { createContext, useState, useEffect, useRef } from 'react';
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

    audio.addEventListener('timeupdate', handleTimeUpdate);
    audio.addEventListener('durationchange', handleDurationChange);
    audio.addEventListener('ended', handleEnded);

    return () => {
      audio.removeEventListener('timeupdate', handleTimeUpdate);
      audio.removeEventListener('durationchange', handleDurationChange);
      audio.removeEventListener('ended', handleEnded);
    };
  }, []);

  const playTrackAtIndex = (index) => {
    const q = queueRef.current.length > 0 ? queueRef.current : queue;
    if (index < 0 || index >= q.length) return;

    const track = q[index];
    setCurrentTrack(track);
    setCurrentTrackIndex(index);
    setCurrentTime(0);

    const audio = audioRef.current;
    
    // Attempt to play from offline cache first
    try {
      offlineManager.getTrack(track.videoId).then(offlineTrack => {
        if (offlineTrack && offlineTrack.audioBlob) {
          console.log(`[Player Android] Playing downloaded offline track: "${track.title}"`);
          audio.src = URL.createObjectURL(offlineTrack.audioBlob);
        } else {
          audio.src = `${API_URL}/api/stream/${track.videoId}`;
        }
        audio.load();
        audio.play()
          .then(() => setIsPlaying(true))
          .catch(err => {
            console.error('Audio playback error:', err);
            setIsPlaying(false);
          });
      }).catch(e => {
        console.warn('Error loading offline track, falling back to network:', e);
        audio.src = `${API_URL}/api/stream/${track.videoId}`;
        audio.load();
        audio.play().then(() => setIsPlaying(true)).catch(() => setIsPlaying(false));
      });
    } catch (err) {
      audio.src = `${API_URL}/api/stream/${track.videoId}`;
      audio.load();
      audio.play().then(() => setIsPlaying(true)).catch(() => setIsPlaying(false));
    }
  };

  const playTrack = (track, newQueue = []) => {
    // If the track clicked is already playing, toggle it
    if (currentTrack && currentTrack.videoId === track.videoId) {
      togglePlay();
      return;
    }

    let activeQueue = newQueue.length > 0 ? [...newQueue] : [track];
    
    // Find index of the clicked track in queue
    let idx = activeQueue.findIndex(t => t.videoId === track.videoId);
    if (idx === -1) {
      activeQueue.push(track);
      idx = activeQueue.length - 1;
    }

    setQueue(activeQueue);
    setCurrentTrack(track);
    setCurrentTrackIndex(idx);
    setCurrentTime(0);

    const audio = audioRef.current;

    // Attempt to play from offline cache first
    try {
      offlineManager.getTrack(track.videoId).then(offlineTrack => {
        if (offlineTrack && offlineTrack.audioBlob) {
          console.log(`[Player Android] Playing downloaded offline track: "${track.title}"`);
          audio.src = URL.createObjectURL(offlineTrack.audioBlob);
        } else {
          audio.src = `${API_URL}/api/stream/${track.videoId}`;
        }
        audio.load();
        audio.play()
          .then(() => setIsPlaying(true))
          .catch(err => {
            console.error('Audio playback error:', err);
            setIsPlaying(false);
          });
      }).catch(e => {
        console.warn('Error loading offline track, falling back to network:', e);
        audio.src = `${API_URL}/api/stream/${track.videoId}`;
        audio.load();
        audio.play().then(() => setIsPlaying(true)).catch(() => setIsPlaying(false));
      });
    } catch (err) {
      audio.src = `${API_URL}/api/stream/${track.videoId}`;
      audio.load();
      audio.play().then(() => setIsPlaying(true)).catch(() => setIsPlaying(false));
    }
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
