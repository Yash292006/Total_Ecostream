import React, { useContext, useState } from 'react';
import { Play, Pause, SkipForward, SkipBack, Volume2, VolumeX, Volume1, ChevronDown } from 'lucide-react';
import { PlayerContext } from '../context/PlayerContext';

export default function BottomPlayer() {
  const {
    currentTrack,
    isPlaying,
    currentTime,
    duration,
    volume,
    togglePlay,
    nextTrack,
    prevTrack,
    seekTo,
    changeVolume,
  } = useContext(PlayerContext);

  const [isMuted, setIsMuted] = useState(false);
  const [prevVolume, setPrevVolume] = useState(0.5);
  const [isFullScreen, setIsFullScreen] = useState(false);

  const formatTime = (secs) => {
    if (isNaN(secs) || secs === Infinity || secs === null) return '0:00';
    const minutes = Math.floor(secs / 60);
    const seconds = Math.floor(secs % 60);
    return `${minutes}:${seconds < 10 ? '0' : ''}${seconds}`;
  };

  const handleSeek = (e) => {
    seekTo(parseFloat(e.target.value));
  };

  const handleVolumeChange = (e) => {
    const vol = parseFloat(e.target.value);
    changeVolume(vol);
    if (vol > 0 && isMuted) {
      setIsMuted(false);
    }
  };

  const toggleMute = () => {
    if (isMuted) {
      changeVolume(prevVolume);
      setIsMuted(false);
    } else {
      setPrevVolume(volume);
      changeVolume(0);
      setIsMuted(true);
    }
  };

  // Determine volume icon
  const getVolumeIcon = () => {
    if (volume === 0 || isMuted) return <VolumeX className="w-5 h-5" />;
    if (volume < 0.4) return <Volume1 className="w-5 h-5" />;
    return <Volume2 className="w-5 h-5" />;
  };

  return (
    <>
      {/* Mini Player / Desktop Bottom Bar */}
      <div className="h-20 md:h-24 bg-zinc-950 border-t border-zinc-900 flex items-center justify-between px-4 md:px-6 fixed bottom-16 md:bottom-0 left-0 right-0 z-40 text-white select-none">
        {/* Track info (Left) */}
        <div 
          className="flex items-center w-full md:w-1/3 min-w-0 md:min-w-[180px] cursor-pointer hover:opacity-80 transition-opacity group"
          onClick={() => currentTrack && setIsFullScreen(true)}
        >
          {currentTrack ? (
            <>
              <img
                src={currentTrack.thumbnail || 'https://via.placeholder.com/60'}
                alt={currentTrack.title}
                className="w-12 h-12 md:w-14 md:h-14 rounded object-cover mr-3 md:mr-4 shadow-md bg-zinc-800"
              />
              <div className="flex-1 min-w-0">
                <h4 className="text-xs md:text-sm font-semibold text-white truncate">
                  {currentTrack.title}
                </h4>
                <p className="text-[10px] md:text-xs text-zinc-400 truncate">
                  {currentTrack.artist}
                </p>
              </div>
            </>
          ) : (
            <div className="flex items-center text-zinc-500 text-xs italic">
              No song selected
            </div>
          )}
        </div>

        {/* Control center (Middle) - Hidden on mobile mini player */}
        <div className="hidden md:flex flex-col items-center w-1/3 max-w-[600px] px-4">
          <div className="flex items-center gap-6 mb-2">
            <button onClick={prevTrack} disabled={!currentTrack} className="text-zinc-400 hover:text-white transition-colors duration-200 disabled:opacity-40">
              <SkipBack className="w-5 h-5 fill-current" />
            </button>
            <button onClick={togglePlay} disabled={!currentTrack} className="w-8 h-8 rounded-full bg-white text-black flex items-center justify-center hover:scale-105 transition-transform duration-200 disabled:opacity-40">
              {isPlaying ? <Pause className="w-5 h-5 fill-current" /> : <Play className="w-5 h-5 fill-current ml-0.5" />}
            </button>
            <button onClick={nextTrack} disabled={!currentTrack} className="text-zinc-400 hover:text-white transition-colors duration-200 disabled:opacity-40">
              <SkipForward className="w-5 h-5 fill-current" />
            </button>
          </div>
          <div className="w-full flex items-center gap-3 text-xs text-zinc-400">
            <span>{formatTime(currentTime)}</span>
            <div className="flex-1 relative flex items-center">
              <input
                type="range"
                min="0"
                max={duration || 0}
                value={currentTime || 0}
                onChange={handleSeek}
                disabled={!currentTrack}
                className="w-full h-1 bg-zinc-700 rounded-lg appearance-none cursor-pointer accent-spotify-green"
                style={{ background: `linear-gradient(to right, #1DB954 0%, #1DB954 ${duration > 0 ? (currentTime / duration) * 100 : 0}%, #4f4f4f ${duration > 0 ? (currentTime / duration) * 100 : 0}%, #4f4f4f 100%)` }}
              />
            </div>
            <span>{formatTime(duration)}</span>
          </div>
        </div>

        {/* Volume & Mobile Play Toggle (Right) */}
        <div className="flex items-center justify-end gap-3 md:w-1/3 md:min-w-[150px]">
          {/* Mobile Play/Pause Toggle */}
          <button 
            onClick={(e) => {
              e.stopPropagation();
              togglePlay();
            }}
            disabled={!currentTrack}
            className="md:hidden text-white p-2"
          >
            {isPlaying ? <Pause className="w-6 h-6" /> : <Play className="w-6 h-6" />}
          </button>

          {/* Desktop Volume Slider */}
          <div className="hidden md:flex items-center gap-3">
            <button onClick={toggleMute} disabled={!currentTrack} className="text-zinc-400 hover:text-white transition-colors">
              {getVolumeIcon()}
            </button>
            <input
              type="range"
              min="0"
              max="1"
              step="0.01"
              value={isMuted ? 0 : volume}
              onChange={handleVolumeChange}
              disabled={!currentTrack}
              className="w-24 h-1 bg-zinc-700 rounded-lg appearance-none cursor-pointer accent-spotify-green"
              style={{ background: `linear-gradient(to right, #1DB954 0%, #1DB954 ${(isMuted ? 0 : volume) * 100}%, #4f4f4f ${(isMuted ? 0 : volume) * 100}%, #4f4f4f 100%)` }}
            />
          </div>
        </div>
      </div>

      {/* Full Screen Player Overlay */}
      {isFullScreen && currentTrack && (
        <div className="fixed inset-0 z-[100] bg-[#0c0c0c] flex flex-col items-center justify-between p-6 md:p-12 animate-slide-up select-none">
          {/* Background Ambient Glow */}
          <div className="absolute inset-0 overflow-hidden pointer-events-none opacity-20">
            <div 
              className="absolute -top-1/4 -left-1/4 w-[150%] h-[150%] rounded-full bg-gradient-to-br from-emerald-600/60 to-blue-900/60 blur-[120px]"
              style={{ transition: 'all 2s ease' }}
            />
          </div>

          {/* Top Bar */}
          <div className="relative z-10 w-full flex items-center justify-between max-w-xl">
            <button 
              onClick={() => setIsFullScreen(false)}
              className="p-2 hover:bg-zinc-950 rounded-full transition-colors text-zinc-400 hover:text-white border border-zinc-900 bg-zinc-900/40"
            >
              <ChevronDown className="w-6 h-6" />
            </button>
            <span className="text-[10px] uppercase font-extrabold tracking-widest text-zinc-500">
              Now Playing
            </span>
            <div className="w-10 h-10" /> {/* Spacer */}
          </div>

          {/* Album Art (Center) */}
          <div className="relative z-10 my-auto flex flex-col items-center justify-center max-w-xl w-full">
            <div className="relative group shadow-2xl rounded-2xl overflow-hidden aspect-square max-w-[280px] md:max-w-[380px] w-full bg-zinc-900 border border-zinc-800">
              <img
                src={currentTrack.thumbnail || 'https://via.placeholder.com/400'}
                alt={currentTrack.title}
                className={`w-full h-full object-cover shadow-2xl transition-transform duration-700 ${isPlaying ? 'scale-[1.02]' : 'scale-100'}`}
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/50 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
            </div>

            {/* Song Meta info */}
            <div className="text-center mt-6 w-full px-6">
              <h2 className="text-xl md:text-3xl font-extrabold text-white truncate max-w-full">
                {currentTrack.title}
              </h2>
              <p className="text-spotify-green hover:underline cursor-pointer text-xs md:text-base font-semibold mt-1 truncate">
                {currentTrack.artist}
              </p>
            </div>
          </div>

          {/* Controls & Slider (Bottom) */}
          <div className="relative z-10 w-full max-w-xl flex flex-col gap-4 mt-auto">
            {/* Progress seek bar */}
            <div className="w-full flex flex-col gap-2">
              <div className="w-full flex items-center gap-3 text-[10px] text-zinc-400">
                <span>{formatTime(currentTime)}</span>
                <div className="flex-1 relative flex items-center">
                  <input
                    type="range"
                    min="0"
                    max={duration || 0}
                    value={currentTime || 0}
                    onChange={handleSeek}
                    className="w-full h-1 bg-zinc-800 rounded-lg appearance-none cursor-pointer accent-spotify-green hover:accent-spotify-hover transition-colors"
                    style={{
                      background: `linear-gradient(to right, #1DB954 0%, #1DB954 ${duration > 0 ? (currentTime / duration) * 100 : 0}%, #27272a ${duration > 0 ? (currentTime / duration) * 100 : 0}%, #27272a 100%)`
                    }}
                  />
                </div>
                <span>{formatTime(duration)}</span>
              </div>
            </div>

            {/* Playback Controls */}
            <div className="flex items-center justify-center gap-8 md:gap-10">
              <button 
                onClick={prevTrack} 
                className="text-zinc-400 hover:text-white transition-colors duration-200 p-2 hover:bg-zinc-900 rounded-full"
              >
                <SkipBack className="w-6 h-6 md:w-8 md:h-8 fill-current" />
              </button>
              
              <button
                onClick={togglePlay}
                className="w-14 h-14 md:w-16 md:h-16 rounded-full bg-white text-black flex items-center justify-center hover:scale-105 active:scale-95 transition-transform duration-200 shadow-xl"
              >
                {isPlaying ? (
                  <Pause className="w-6 h-6 md:w-8 md:h-8 fill-current text-black" />
                ) : (
                  <Play className="w-6 h-6 md:w-8 md:h-8 fill-current text-black ml-1" />
                )}
              </button>

              <button 
                onClick={nextTrack} 
                className="text-zinc-400 hover:text-white transition-colors duration-200 p-2 hover:bg-zinc-900 rounded-full"
              >
                <SkipForward className="w-6 h-6 md:w-8 md:h-8 fill-current" />
              </button>
            </div>

            {/* Volume controls */}
            <div className="flex items-center justify-center gap-3 w-full px-6 mb-6">
              <button 
                onClick={toggleMute}
                className="text-zinc-400 hover:text-white transition-colors duration-200"
              >
                {getVolumeIcon()}
              </button>
              <input
                type="range"
                min="0"
                max="1"
                step="0.01"
                value={isMuted ? 0 : volume}
                onChange={handleVolumeChange}
                className="flex-1 max-w-[200px] h-1 bg-zinc-800 rounded-lg appearance-none cursor-pointer accent-spotify-green hover:accent-spotify-hover transition-colors"
                style={{
                  background: `linear-gradient(to right, #1DB954 0%, #1DB954 ${(isMuted ? 0 : volume) * 100}%, #27272a ${(isMuted ? 0 : volume) * 100}%, #27272a 100%)`
                }}
              />
            </div>
          </div>
        </div>
      )}
    </>
  );
}
