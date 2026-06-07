import React, { useContext, useEffect, useState } from 'react';
import { Play, Pause, Plus, Trash2, Clock, Music, Check, Download, Loader2 } from 'lucide-react';
import { PlayerContext } from '../context/PlayerContext';
import { api } from '../context/AuthContext';
import { offlineManager } from '../utils/offlineManager';
import { getApiUrl } from '../apiConfig';

export default function TrackList({ tracks, isPlaylistView = false, playlistId = null, onTrackRemoved = null }) {
  const { currentTrack, isPlaying, playTrack } = useContext(PlayerContext);
  const [playlists, setPlaylists] = useState([]);
  const [openDropdownId, setOpenDropdownId] = useState(null);
  const [addedTracks, setAddedTracks] = useState({}); // Track temporary checkmarks: { [trackUniqueId]: true }
  
  // Download states
  const [downloading, setDownloading] = useState({}); // { [uniqueId]: true }
  const [downloaded, setDownloaded] = useState({}); // { [videoId]: true }

  const fetchDropdownPlaylists = async () => {
    try {
      const res = await api.get('/api/playlists');
      setPlaylists(res.data);
    } catch (err) {
      console.error('Failed to load playlists for dropdown:', err);
    }
  };

  useEffect(() => {
    fetchDropdownPlaylists();

    const handleUpdate = () => {
      fetchDropdownPlaylists();
    };

    window.addEventListener('playlists-updated', handleUpdate);
    return () => window.removeEventListener('playlists-updated', handleUpdate);
  }, []);

  // Check which tracks are already downloaded in IndexedDB
  useEffect(() => {
    const checkDownloads = async () => {
      try {
        const list = await offlineManager.getAllTracks();
        const downloadedMap = {};
        list.forEach(t => {
          if (t.videoId) downloadedMap[t.videoId] = true;
        });
        setDownloaded(downloadedMap);
      } catch (err) {
        console.error('Failed to query downloaded tracks:', err);
      }
    };
    checkDownloads();
  }, [tracks]);

  // Close dropdown on click outside
  useEffect(() => {
    const handleOutsideClick = () => setOpenDropdownId(null);
    window.addEventListener('click', handleOutsideClick);
    return () => window.removeEventListener('click', handleOutsideClick);
  }, []);

  const formatDuration = (secs) => {
    if (!secs) return '0:00';
    const minutes = Math.floor(secs / 60);
    const seconds = Math.floor(secs % 60);
    return `${minutes}:${seconds < 10 ? '0' : ''}${seconds}`;
  };

  const handlePlay = (track) => {
    playTrack(track, tracks);
  };

  const handleDropdownToggle = (e, uniqueId) => {
    e.stopPropagation();
    if (openDropdownId === uniqueId) {
      setOpenDropdownId(null);
    } else {
      setOpenDropdownId(uniqueId);
    }
  };

  const handleAddToPlaylist = async (e, targetPlaylistId, track, uniqueId) => {
    e.stopPropagation();
    try {
      await api.post(`/api/playlists/${targetPlaylistId}/tracks`, {
        videoId: track.videoId || '', // Empty videoId will be resolved in the backend!
        title: track.title,
        artist: track.artist,
        thumbnail: track.thumbnail,
        duration: track.duration
      });
      
      // Update checkmark state
      setAddedTracks(prev => ({ ...prev, [uniqueId]: true }));
      setTimeout(() => {
        setAddedTracks(prev => {
          const updated = { ...prev };
          delete updated[uniqueId];
          return updated;
        });
      }, 2000);

      // Trigger standard playlists-updated event
      window.dispatchEvent(new Event('playlists-updated'));
      setOpenDropdownId(null);
    } catch (error) {
      alert(error.response?.data?.error || 'Failed to add track to playlist');
    }
  };

  const handleRemoveFromPlaylist = async (e, videoId) => {
    e.stopPropagation();
    if (!confirm('Are you sure you want to remove this song?')) return;
    try {
      await api.delete(`/api/playlists/${playlistId}/tracks/${videoId}`);
      if (onTrackRemoved) {
        onTrackRemoved(videoId);
      }
    } catch (error) {
      alert(error.response?.data?.error || 'Failed to remove track');
    }
  };

  // Premium Download handler
  const handleDownload = async (e, track) => {
    e.stopPropagation();
    
    let videoId = track.videoId;
    let trackToSave = { ...track };
    const uniqueId = track.videoId || `${track.title}-${track.artist}`;
    
    setDownloading(prev => ({ ...prev, [uniqueId]: true }));
    
    try {
      // 1. Resolve videoId if not present (Spotify imported track)
      if (!videoId) {
        console.log(`Resolving videoId for "${track.title}" download...`);
        const resolveRes = await api.get('/api/search/resolve', {
          params: { title: track.title, artist: track.artist }
        });
        videoId = resolveRes.data.videoId;
        trackToSave.videoId = videoId;
        trackToSave.duration = resolveRes.data.duration;
        trackToSave.thumbnail = resolveRes.data.thumbnail || track.thumbnail;
      }
      
      // 2. Toggle delete if already downloaded
      if (downloaded[videoId]) {
        if (confirm(`Remove "${track.title}" from offline downloads?`)) {
          await offlineManager.deleteTrack(videoId);
          setDownloaded(prev => {
            const updated = { ...prev };
            delete updated[videoId];
            return updated;
          });
        }
        return;
      }
      
      // 3. Download the audio stream from backend
      const API_URL = getApiUrl();
      const streamEndpoint = `${API_URL}/api/stream/${videoId}`;
      
      console.log(`Downloading stream to local IndexedDB: ${streamEndpoint}`);
      const response = await fetch(streamEndpoint);
      if (!response.ok) {
        throw new Error('Failed to fetch audio stream.');
      }
      
      const blob = await response.blob();
      
      // 4. Save to browser IndexedDB
      await offlineManager.saveTrack(trackToSave, blob);
      setDownloaded(prev => ({ ...prev, [videoId]: true }));
    } catch (err) {
      console.error('Download error:', err);
      const detailMsg = err.response?.data?.details || err.response?.data?.error || err.message;
      alert(`Offline Download failed: ${detailMsg}`);
    } finally {
      setDownloading(prev => {
        const updated = { ...prev };
        delete updated[uniqueId];
        return updated;
      });
    }
  };

  if (tracks.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-zinc-500">
        <Music className="w-12 h-12 mb-4 opacity-40" />
        <p className="text-sm font-medium">No songs available in this list</p>
      </div>
    );
  }

  return (
    <div className="w-full text-zinc-300 select-none text-left">
      <div className="grid grid-cols-[40px_1fr_40px_40px] md:grid-cols-[50px_1fr_100px_80px_50px] gap-2 md:gap-4 px-2 md:px-4 py-2 border-b border-zinc-800 text-[10px] md:text-xs font-bold uppercase tracking-wider text-zinc-400">
        <div className="text-center">#</div>
        <div>Title</div>
        <div className="hidden md:block">Duration</div>
        <div className="text-center font-bold"><span className="hidden md:inline">Offline</span><Download className="w-3.5 h-3.5 mx-auto md:hidden" /></div>
        <div className="text-right">Action</div>
      </div>

      {/* Track rows */}
      <div className="mt-2 space-y-1">
        {tracks.map((track, index) => {
          const isCurrent = currentTrack && (
            (track.videoId && currentTrack.videoId === track.videoId) ||
            (currentTrack.title === track.title && currentTrack.artist === track.artist)
          );
          
          const uniqueId = track.videoId || `${track.title}-${track.artist}`;
          const trackKey = track.videoId || `${track.title}-${track.artist}-${index}`;
          const isTrackDownloaded = track.videoId ? downloaded[track.videoId] : false;
          const isTrackDownloading = downloading[uniqueId];

          return (
            <div
              key={trackKey}
              onClick={() => handlePlay(track)}
              className={`grid grid-cols-[40px_1fr_40px_40px] md:grid-cols-[50px_1fr_100px_80px_50px] gap-2 md:gap-4 px-2 md:px-4 py-2 md:py-3 items-center rounded-md cursor-pointer hover:bg-zinc-800/60 group transition-all duration-150 ${
                isCurrent ? 'bg-zinc-900 text-spotify-green' : ''
              }`}
            >
              {/* Index / Play Button */}
              <div className="flex items-center justify-center text-center">
                <span className="group-hover:hidden w-6 text-xs md:text-sm font-medium text-zinc-500">
                  {isCurrent && isPlaying ? (
                    <div className="flex justify-center items-end gap-0.5 h-3">
                      <div className="w-0.5 bg-spotify-green animate-[bounce_0.8s_infinite_100ms] h-full"></div>
                      <div className="w-0.5 bg-spotify-green animate-[bounce_0.8s_infinite_300ms] h-2/3"></div>
                      <div className="w-0.5 bg-spotify-green animate-[bounce_0.8s_infinite_200ms] h-4/5"></div>
                    </div>
                  ) : (
                    index + 1
                  )}
                </span>
                <span className="hidden group-hover:block w-6 text-white">
                  {isCurrent && isPlaying ? (
                    <Pause className="w-4 h-4 fill-current" />
                  ) : (
                    <Play className="w-4 h-4 fill-current ml-0.5" />
                  )}
                </span>
              </div>

              {/* Title & Artist */}
              <div className="flex items-center gap-2 md:gap-3 overflow-hidden">
                <img
                  src={track.thumbnail || 'https://via.placeholder.com/40'}
                  alt={track.title}
                  className="w-8 h-8 md:w-10 md:h-10 rounded object-cover flex-shrink-0 bg-zinc-800"
                />
                <div className="truncate text-left">
                  <p className={`font-semibold text-xs md:text-sm truncate ${isCurrent ? 'text-spotify-green' : 'text-white'}`}>
                    {track.title}
                  </p>
                  <p className="text-[10px] md:text-xs text-zinc-400 truncate group-hover:text-zinc-300">
                    {track.artist}
                  </p>
                </div>
              </div>

              {/* Duration (Hidden on mobile grid, but maybe merged?) */}
              <div className="hidden md:block text-zinc-400 text-sm font-medium">
                {formatDuration(track.duration || track.seconds)}
              </div>

              {/* Premium Download Status (Offline Column) */}
              <div className="flex items-center justify-center">
                <button
                  type="button"
                  onClick={(e) => handleDownload(e, track)}
                  className={`p-1.5 rounded-full transition-all duration-200 ${
                    isTrackDownloaded 
                      ? 'text-spotify-green hover:bg-zinc-700/30' 
                      : 'text-zinc-500 hover:text-white hover:bg-zinc-700/50'
                  }`}
                  title={isTrackDownloaded ? 'Downloaded (Click to remove)' : 'Download for Offline Playback'}
                >
                  {isTrackDownloading ? (
                    <Loader2 className="w-4 h-4 animate-spin text-spotify-green" />
                  ) : isTrackDownloaded ? (
                    <Check className="w-4 h-4 text-spotify-green" />
                  ) : (
                    <Download className="w-4 h-4" />
                  )}
                </button>
              </div>

              {/* Action Dropdown / Trash */}
              <div className="flex items-center justify-end relative">
                {isPlaylistView ? (
                  <button
                    type="button"
                    onClick={(e) => handleRemoveFromPlaylist(e, track.videoId)}
                    className="text-zinc-500 hover:text-red-500 transition-colors p-1.5 rounded-full hover:bg-zinc-700/50"
                    title="Remove from Playlist"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                ) : (
                  <>
                    <button
                      type="button"
                      onClick={(e) => handleDropdownToggle(e, uniqueId)}
                      className="text-zinc-400 hover:text-white transition-colors p-1.5 rounded-full hover:bg-zinc-700/50"
                      title="Add to Playlist"
                    >
                      {addedTracks[uniqueId] ? (
                        <Check className="w-4 h-4 text-spotify-green" />
                      ) : (
                        <Plus className="w-4 h-4" />
                      )}
                    </button>
                    
                    {/* Add to Playlist Popup Menu */}
                    {openDropdownId === uniqueId && (
                      <div className="absolute right-0 top-8 w-56 rounded-md bg-zinc-900 border border-zinc-800 shadow-xl z-50 py-1 overflow-hidden">
                        <div className="px-3 py-1.5 border-b border-zinc-800 text-[10px] font-bold uppercase tracking-wider text-zinc-500">
                          Add to playlist
                        </div>
                        <div className="max-h-48 overflow-y-auto">
                          {playlists.length === 0 ? (
                            <div className="px-3 py-2 text-xs text-zinc-500 italic">
                              No playlists found. Create one in the sidebar.
                            </div>
                          ) : (
                            playlists.map((playlist) => (
                              <button
                                key={playlist._id}
                                type="button"
                                onClick={(e) => handleAddToPlaylist(e, playlist._id, track, uniqueId)}
                                className="w-full text-left px-3 py-2 text-sm text-zinc-300 hover:bg-zinc-800 hover:text-white transition-colors truncate font-medium"
                              >
                                {playlist.name}
                              </button>
                            ))
                          )}
                        </div>
                      </div>
                    )}
                  </>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
