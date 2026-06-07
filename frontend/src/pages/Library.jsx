import React, { useContext, useEffect, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { Plus, Play, Pause, Library as LibIcon, Music, Disc, Download } from 'lucide-react';
import { AuthContext, api } from '../context/AuthContext';
import { PlayerContext } from '../context/PlayerContext';
import { offlineManager } from '../utils/offlineManager';
import TrackList from '../components/TrackList';

export default function Library() {
  const { user } = useContext(AuthContext);
  const { currentTrack, isPlaying, playTrack, togglePlay } = useContext(PlayerContext);
  
  const [playlists, setPlaylists] = useState([]);
  const [selectedPlaylist, setSelectedPlaylist] = useState(null);
  const [newPlaylistName, setNewPlaylistName] = useState('');
  const [spotifyUrl, setSpotifyUrl] = useState('');
  const [importing, setImporting] = useState(false);
  const [loading, setLoading] = useState(true);
  const [importError, setImportError] = useState('');
  const [importSuccess, setImportSuccess] = useState('');

  // Offline tracks count
  const [offlineTracksCount, setOfflineTracksCount] = useState(0);

  const location = useLocation();
  const navigate = useNavigate();

  // Parse playlist ID and featured flag from query parameters (?id=...&featured=true)
  const queryParams = new URLSearchParams(location.search);
  const selectedId = queryParams.get('id');
  const isFeaturedParam = queryParams.get('featured') === 'true';

  const fetchPlaylists = async () => {
    setLoading(true);
    try {
      // Fetch local offline tracks count
      const localTracks = await offlineManager.getAllTracks();
      setOfflineTracksCount(localTracks.length);

      if (selectedId === 'offline') {
        setSelectedPlaylist({
          _id: 'offline',
          name: 'Offline Downloads',
          description: 'Songs saved locally on this device for offline playback.',
          tracks: localTracks,
          isOfflineDownloads: true
        });
        setLoading(false);
        return;
      }

      // Fetch user custom playlists
      const res = await api.get('/api/playlists');
      setPlaylists(res.data);
      
      if (selectedId) {
        if (isFeaturedParam) {
          // Fetch the featured playlist detail
          const featRes = await api.get(`/api/playlists/featured/${selectedId}`);
          setSelectedPlaylist(featRes.data);
        } else {
          // Fetch from user's custom playlists
          const found = res.data.find(p => p._id === selectedId);
          setSelectedPlaylist(found || null);
        }
      } else {
        setSelectedPlaylist(null);
      }
    } catch (err) {
      console.error('Error fetching playlists in library:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPlaylists();

    const handleUpdate = () => {
      fetchPlaylists();
    };

    window.addEventListener('playlists-updated', handleUpdate);
    return () => window.removeEventListener('playlists-updated', handleUpdate);
  }, [selectedId, isFeaturedParam]);

  const handleCreatePlaylist = async (e) => {
    e.preventDefault();
    if (!newPlaylistName.trim()) return;

    try {
      const res = await api.post('/api/playlists', { name: newPlaylistName.trim() });
      setNewPlaylistName('');
      fetchPlaylists();
      
      // Dispatch custom event to sync Sidebar
      window.dispatchEvent(new Event('playlists-updated'));
      
      // Auto-navigate to newly created playlist
      navigate(`/library?id=${res.data._id}`);
    } catch (error) {
      alert(error.response?.data?.error || 'Failed to create playlist');
    }
  };

  const handleImportSpotify = async (e) => {
    e.preventDefault();
    setImportError('');
    setImportSuccess('');
    const trimmed = spotifyUrl.trim();
    if (!trimmed) return;

    // Basic URL validation before even hitting the server
    if (!trimmed.includes('spotify.com/playlist/')) {
      setImportError('❌ Invalid URL. Please paste a full Spotify playlist link, e.g. https://open.spotify.com/playlist/...');
      return;
    }

    setImporting(true);
    try {
      const res = await api.post('/api/playlists/import-spotify', { url: trimmed });
      setSpotifyUrl('');
      setImportSuccess(`✅ Imported "${res.data.name}" — ${res.data.tracks?.length || 0} tracks`);
      fetchPlaylists();
      window.dispatchEvent(new Event('playlists-updated'));
      // Navigate after a short delay so user sees the success message
      setTimeout(() => navigate(`/library?id=${res.data._id}`), 1200);
    } catch (error) {
      console.error('Import error:', error);
      const msg = error.response?.data?.error || error.message || 'Unknown error';
      setImportError(`❌ ${msg}`);
    } finally {
      setImporting(false);
    }
  };

  const handleDeletePlaylist = async () => {
    if (!selectedPlaylist || selectedPlaylist.isFeatured || selectedPlaylist.isOfflineDownloads) return;
    if (!confirm(`Are you sure you want to delete the playlist "${selectedPlaylist.name}"?`)) return;

    try {
      await api.delete(`/api/playlists/${selectedPlaylist._id}`);
      window.dispatchEvent(new Event('playlists-updated'));
      navigate('/library');
    } catch (error) {
      alert(error.response?.data?.error || 'Failed to delete playlist');
    }
  };

  const handleTrackRemoved = (videoId) => {
    if (selectedPlaylist) {
      const updatedTracks = selectedPlaylist.tracks.filter(t => t.videoId !== videoId);
      setSelectedPlaylist(prev => ({ ...prev, tracks: updatedTracks }));
      
      // Sync playlist list as well
      setPlaylists(prev =>
        prev.map(p => (p._id === selectedPlaylist._id ? { ...p, tracks: updatedTracks } : p))
      );
      
      // Trigger update of local downloads count if we removed an offline track
      if (selectedPlaylist.isOfflineDownloads) {
        fetchPlaylists();
      }
    }
  };

  const handlePlayPlaylist = () => {
    if (!selectedPlaylist || selectedPlaylist.tracks.length === 0) return;
    
    // Check if the current playing track is already in this playlist to toggle play/pause
    const isCurrentInPlaylist = currentTrack && selectedPlaylist.tracks.some(
      t => (t.videoId && currentTrack.videoId === t.videoId) || 
           (currentTrack.title === t.title && currentTrack.artist === t.artist)
    );

    if (isCurrentInPlaylist) {
      togglePlay();
    } else {
      playTrack(selectedPlaylist.tracks[0], selectedPlaylist.tracks);
    }
  };

  const isPlaylistPlaying = () => {
    if (!selectedPlaylist || selectedPlaylist.tracks.length === 0 || !isPlaying || !currentTrack) return false;
    
    return selectedPlaylist.tracks.some(
      t => (t.videoId && currentTrack.videoId === t.videoId) || 
           (currentTrack.title === t.title && currentTrack.artist === t.artist)
    );
  };

  // Render detail view of a selected playlist
  if (selectedPlaylist) {
    const isFeatured = selectedPlaylist.isFeatured || isFeaturedParam;
    const isOffline = selectedPlaylist.isOfflineDownloads;
    
    return (
      <div className="space-y-8 pb-10 text-left animate-fade-in select-none">
        <button 
          onClick={() => navigate(isFeatured ? '/search' : '/library')}
          className="text-sm text-zinc-400 hover:text-white transition-colors"
        >
          &larr; Back to {isFeatured ? 'Search' : 'Library'}
        </button>

        {/* Playlist Header */}
        <div className="flex flex-col md:flex-row items-end gap-6 pb-6 border-b border-zinc-800">
          <div className={`w-36 h-36 md:w-48 md:h-48 rounded bg-gradient-to-br ${isOffline ? 'from-blue-600 to-indigo-800' : 'from-emerald-600/80 to-blue-900'} flex items-center justify-center text-5xl font-extrabold text-zinc-300 shadow-xl flex-shrink-0`}>
            {isOffline ? (
              <Download className="w-16 h-16 text-white" />
            ) : (
              selectedPlaylist.name.substring(0, 2).toUpperCase()
            )}
          </div>
          <div className="flex-1 space-y-2 text-left">
            <span className="text-xs uppercase font-bold tracking-widest text-zinc-400">
              {isOffline ? 'Premium Feature' : isFeatured ? 'Eco Creations Playlist' : 'Playlist'}
            </span>
            <h1 className="text-3xl md:text-5xl font-extrabold text-white tracking-tight leading-none">
              {selectedPlaylist.name}
            </h1>
            {selectedPlaylist.description && (
              <p className="text-zinc-400 text-sm font-medium leading-relaxed max-w-2xl">
                {selectedPlaylist.description}
              </p>
            )}
            <p className="text-sm text-zinc-500">
              {isOffline ? (
                <>Offline mode &bull; saved on this device</>
              ) : isFeatured ? (
                <>Curated by <span className="font-semibold text-spotify-green">Eco Creations</span></>
              ) : (
                <>Created by <span className="font-semibold text-white">{user?.username}</span></>
              )}
              &nbsp;&bull;&nbsp;{selectedPlaylist.tracks.length} {selectedPlaylist.tracks.length === 1 ? 'song' : 'songs'}
            </p>
          </div>
        </div>

        {/* Play & Delete controls */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            {selectedPlaylist.tracks.length > 0 ? (
              <button
                onClick={handlePlayPlaylist}
                className="w-14 h-14 rounded-full bg-spotify-green hover:bg-spotify-hover text-black flex items-center justify-center hover:scale-105 active:scale-95 transition-transform shadow-lg"
              >
                {isPlaylistPlaying() ? (
                  <Pause className="w-6 h-6 fill-current text-black" />
                ) : (
                  <Play className="w-6 h-6 fill-current text-black ml-0.5" />
                )}
              </button>
            ) : (
              <div className="text-zinc-500 text-sm italic">
                Add tracks from the search tab to listen.
              </div>
            )}
          </div>
        </div>

        {/* Playlist Tracks Table */}
        <div className="mt-4">
          <TrackList
            tracks={selectedPlaylist.tracks}
            isPlaylistView={!isFeatured && !isOffline}
            playlistId={selectedPlaylist._id}
            onTrackRemoved={handleTrackRemoved}
          />
        </div>
      </div>
    );
  }

  // Render grid list of all playlists (Landing View)
  return (
    <div className="space-y-8 pb-10 animate-fade-in select-none">
      {/* Page Title & Create Inline Form */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <LibIcon className="w-8 h-8 text-zinc-400" />
          <h1 className="text-3xl font-extrabold tracking-tight text-white">Your Playlists</h1>
        </div>

        {/* Actions Box */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
          {/* Inline Create Form */}
          <form onSubmit={handleCreatePlaylist} className="flex items-center gap-2">
            <input
              type="text"
              value={newPlaylistName}
              onChange={(e) => setNewPlaylistName(e.target.value)}
              placeholder="New playlist name..."
              className="bg-zinc-800 border border-zinc-700/50 rounded-full px-4 py-2 text-xs text-white focus:outline-none focus:border-white transition-all font-medium w-full sm:w-auto"
            />
            <button
              type="submit"
              className="p-2 bg-spotify-green hover:bg-spotify-hover text-black rounded-full hover:scale-105 active:scale-95 transition-transform flex items-center justify-center shadow flex-shrink-0"
              title="Create Playlist"
            >
              <Plus className="w-4 h-4" />
            </button>
          </form>

          <div className="hidden sm:block w-px h-6 bg-zinc-800"></div>

          {/* Import Spotify Playlist Form */}
          <div className="flex flex-col gap-1.5">
            <form onSubmit={handleImportSpotify} className="flex items-center gap-2">
              <input
                type="text"
                value={spotifyUrl}
                onChange={(e) => { setSpotifyUrl(e.target.value); setImportError(''); setImportSuccess(''); }}
                placeholder="Paste Spotify playlist link..."
                className={`bg-zinc-800 border rounded-full px-4 py-2 text-xs text-white focus:outline-none transition-all font-medium w-full sm:w-56 md:w-72 ${
                  importError ? 'border-red-500/70 focus:border-red-400' : 'border-zinc-700/50 focus:border-white'
                }`}
                disabled={importing}
              />
              <button
                type="submit"
                disabled={importing || !spotifyUrl.trim()}
                className="px-4 py-2 bg-spotify-green hover:bg-spotify-hover text-black rounded-full text-xs font-bold hover:scale-105 active:scale-95 transition-transform flex items-center justify-center shadow disabled:opacity-50 disabled:cursor-not-allowed flex-shrink-0"
                title="Import from Spotify"
              >
                {importing ? (
                  <span className="flex items-center gap-1.5">
                    <svg className="w-3 h-3 animate-spin" viewBox="0 0 24 24" fill="none"><circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" className="opacity-25"/><path d="M4 12a8 8 0 018-8" stroke="currentColor" strokeWidth="4" className="opacity-75"/></svg>
                    Importing...
                  </span>
                ) : 'Import'}
              </button>
            </form>
            {importError && (
              <p className="text-xs text-red-400 font-medium px-2 max-w-sm leading-relaxed">{importError}</p>
            )}
            {importSuccess && (
              <p className="text-xs text-spotify-green font-semibold px-2">{importSuccess}</p>
            )}
          </div>
        </div>
      </div>

      {/* Grid of Custom Playlists & Offline downloads card */}
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-6 text-left">
        {/* Special Offline Downloads Card */}
        <div
          onClick={() => navigate('/library?id=offline')}
          className="bg-gradient-to-br from-blue-900/40 to-indigo-900/30 p-4 rounded-lg hover:from-blue-900/60 hover:to-indigo-900/55 cursor-pointer transition-all duration-200 group select-none shadow border border-indigo-950 hover:border-indigo-800"
        >
          {/* Cover Art Box */}
          <div className="aspect-square w-full rounded bg-gradient-to-br from-blue-600 to-indigo-800 flex flex-col items-center justify-center mb-4 shadow-md relative overflow-hidden">
            <Download className="w-14 h-14 text-white animate-pulse" />
            <span className="text-[10px] mt-2 tracking-widest uppercase font-extrabold text-white bg-blue-500/30 px-2 py-0.5 rounded border border-blue-500/20">Offline</span>
            
            {/* Play Button */}
            {offlineTracksCount > 0 && (
              <button
                type="button"
                onClick={async (e) => {
                  e.stopPropagation();
                  const list = await offlineManager.getAllTracks();
                  if (list.length > 0) playTrack(list[0], list);
                }}
                className="absolute bottom-2 right-2 w-10 h-10 rounded-full bg-white hover:bg-zinc-100 text-black flex items-center justify-center scale-0 group-hover:scale-100 transition-all duration-200 shadow-lg"
              >
                <Play className="w-5 h-5 fill-current text-black ml-0.5" />
              </button>
            )}
          </div>
          
          <h3 className="font-bold text-sm text-white truncate mb-1">Offline Downloads</h3>
          <p className="text-xs text-zinc-400 font-medium">{offlineTracksCount} local {offlineTracksCount === 1 ? 'song' : 'songs'}</p>
        </div>

        {/* Custom Playlists */}
        {playlists.map((playlist) => (
          <div
            key={playlist._id}
            onClick={() => navigate(`/library?id=${playlist._id}`)}
            className="bg-zinc-900/60 p-4 rounded-lg hover:bg-zinc-800/80 cursor-pointer transition-all duration-200 group select-none shadow border border-zinc-900 hover:border-zinc-800"
          >
            {/* Cover Art Placeholder */}
            <div className="aspect-square w-full rounded bg-gradient-to-br from-zinc-800 to-zinc-900 flex items-center justify-center text-4xl font-extrabold text-zinc-400 mb-4 shadow-md relative overflow-hidden">
              {playlist.name.substring(0, 2).toUpperCase()}
              
              {/* Micro Play Hover Button */}
              {playlist.tracks.length > 0 && (
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    playTrack(playlist.tracks[0], playlist.tracks);
                  }}
                  className="absolute bottom-2 right-2 w-10 h-10 rounded-full bg-spotify-green hover:bg-spotify-hover text-black flex items-center justify-center scale-0 group-hover:scale-100 transition-all duration-200 shadow-lg"
                >
                  <Play className="w-5 h-5 fill-current text-black ml-0.5" />
                </button>
              )}
            </div>

            {/* Meta */}
            <h3 className="font-bold text-sm text-white truncate mb-1">
              {playlist.name}
            </h3>
            <p className="text-xs text-zinc-400 font-medium">
              {playlist.tracks.length} {playlist.tracks.length === 1 ? 'song' : 'songs'}
            </p>
          </div>
        ))}
      </div>
    </div>
  );
}
