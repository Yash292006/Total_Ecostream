import React, { useContext, useEffect, useState } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { Search, Library, Plus, Music, LogOut, Home } from 'lucide-react';
import { AuthContext, api } from '../context/AuthContext';
import YashCreationLogo from './YashCreationLogo';

export default function Sidebar() {
  const { user, logout } = useContext(AuthContext);
  const [playlists, setPlaylists] = useState([]);
  const navigate = useNavigate();

  const fetchPlaylists = async () => {
    try {
      const res = await api.get('/api/playlists');
      setPlaylists(res.data);
    } catch (error) {
      console.error('Error fetching playlists in sidebar:', error);
    }
  };

  useEffect(() => {
    fetchPlaylists();

    // Listen for custom events to refresh playlists in real-time
    const handlePlaylistUpdate = () => {
      fetchPlaylists();
    };

    window.addEventListener('playlists-updated', handlePlaylistUpdate);
    return () => {
      window.removeEventListener('playlists-updated', handlePlaylistUpdate);
    };
  }, []);

  const handleCreatePlaylist = async () => {
    const name = prompt('Enter playlist name:');
    if (!name || name.trim() === '') return;

    try {
      await api.post('/api/playlists', { name: name.trim() });
      fetchPlaylists();
      // Notify other components (like Library page)
      window.dispatchEvent(new Event('playlists-updated'));
    } catch (error) {
      alert(error.response?.data?.error || 'Failed to create playlist');
    }
  };

  return (
    <aside className="hidden md:flex w-64 bg-black flex-col h-full border-r border-zinc-900 select-none flex-shrink-0">
      {/* Brand logo */}
      <div className="p-6 flex items-center gap-3 text-spotify-green cursor-pointer" onClick={() => navigate('/')}>
        <YashCreationLogo className="w-9 h-9 filter drop-shadow-[0_0_8px_rgba(29,185,84,0.35)]" />
        <div className="flex flex-col text-left">
          <span className="font-extrabold text-lg tracking-tight text-white leading-none">EchoStream</span>
          <span className="text-[9px] uppercase font-bold tracking-widest text-spotify-green mt-1">Yash Creation</span>
        </div>
      </div>

      {/* Main Navigation */}
      <nav className="px-4 space-y-1">
        <NavLink
          to="/search"
          className={({ isActive }) =>
            `flex items-center gap-4 px-4 py-3 rounded-md font-semibold text-sm transition-all duration-200 ${
              isActive ? 'text-white bg-zinc-900' : 'text-zinc-400 hover:text-white'
            }`
          }
        >
          <Search className="w-5 h-5" />
          Search
        </NavLink>
        
        <NavLink
          to="/library"
          className={({ isActive }) =>
            `flex items-center gap-4 px-4 py-3 rounded-md font-semibold text-sm transition-all duration-200 ${
              isActive ? 'text-white bg-zinc-900' : 'text-zinc-400 hover:text-white'
            }`
          }
        >
          <Library className="w-5 h-5" />
          Your Library
        </NavLink>
      </nav>

      {/* Playlists section */}
      <div className="flex-1 flex flex-col mt-6 overflow-hidden">
        <div className="px-8 py-2 flex items-center justify-between text-zinc-400 hover:text-white transition-colors duration-200">
          <span className="text-xs uppercase font-bold tracking-wider">Playlists</span>
          <button 
            onClick={handleCreatePlaylist}
            className="hover:scale-105 active:scale-95 transition-transform p-1 rounded-full hover:bg-zinc-800"
            title="Create Playlist"
          >
            <Plus className="w-4 h-4" />
          </button>
        </div>

        {/* Playlist Scroll List */}
        <div className="flex-1 overflow-y-auto px-4 py-2 space-y-1">
          {playlists.length === 0 ? (
            <div className="px-4 py-3 text-xs text-zinc-500 italic">
              No playlists created yet.
            </div>
          ) : (
            playlists.map((playlist) => (
              <button
                key={playlist._id}
                onClick={() => navigate(`/library?id=${playlist._id}`)}
                className="w-full text-left flex items-center gap-3 px-4 py-2 rounded-md text-sm text-zinc-400 hover:text-white hover:bg-zinc-900/50 transition-all truncate"
              >
                <div className="w-8 h-8 rounded bg-zinc-800 flex items-center justify-center text-xs font-bold text-zinc-400 group-hover:text-white flex-shrink-0">
                  {playlist.name.substring(0, 2).toUpperCase()}
                </div>
                <span className="truncate font-medium">{playlist.name}</span>
              </button>
            ))
          )}
        </div>
      </div>

      {/* User profile controls at bottom */}
      {user && (
        <div className="p-4 border-t border-zinc-900 bg-zinc-950 flex flex-col gap-3">
          <div className="flex items-center gap-3 px-2">
            <div className="w-8 h-8 rounded-full bg-spotify-green flex items-center justify-center font-bold text-black text-sm">
              {user.username.charAt(0).toUpperCase()}
            </div>
            <span className="text-sm font-semibold text-white truncate">{user.username}</span>
          </div>
          <button
            onClick={logout}
            className="flex items-center justify-center gap-2 w-full py-2 px-4 rounded-full bg-zinc-900 hover:bg-zinc-800 text-zinc-300 hover:text-white transition-colors duration-200 text-sm font-medium"
          >
            <LogOut className="w-4 h-4" />
            Log Out
          </button>
        </div>
      )}
    </aside>
  );
}
