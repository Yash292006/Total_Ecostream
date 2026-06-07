import React, { useState, useEffect, useContext } from 'react';
import { Search as SearchIcon, X, Loader, Disc, Clock, Play } from 'lucide-react';
import { api, AuthContext } from '../context/AuthContext';
import { PlayerContext } from '../context/PlayerContext';
import { useNavigate } from 'react-router-dom';
import TrackList from '../components/TrackList';

const CATEGORIES = [
  { name: 'Lofi Beats', gradient: 'from-pink-500 to-indigo-500' },
  { name: 'Synthwave & Retro', gradient: 'from-purple-600 to-blue-500' },
  { name: 'Rock Classics', gradient: 'from-orange-500 to-red-600' },
  { name: 'Pop Hits', gradient: 'from-green-400 to-blue-600' },
  { name: 'Jazz Essentials', gradient: 'from-yellow-600 to-red-500' },
  { name: 'Study Focus', gradient: 'from-teal-400 to-blue-500' }
];

export default function Search() {
  const { user } = useContext(AuthContext);
  const { playTrack } = useContext(PlayerContext);
  const navigate = useNavigate();
  const username = user?.username || 'guest';

  const [query, setQuery] = useState('');
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [searched, setSearched] = useState(false);

  // Search history state
  const [history, setHistory] = useState([]);
  
  // Featured playlists state
  const [featuredPlaylists, setFeaturedPlaylists] = useState([]);
  const [featuredLoading, setFeaturedLoading] = useState(false);

  // Load history and featured playlists
  useEffect(() => {
    const savedHistory = localStorage.getItem(`echostream_search_history_${username}`);
    if (savedHistory) {
      try {
        setHistory(JSON.parse(savedHistory));
      } catch (e) {
        console.error('Failed to parse search history:', e);
      }
    }

    const fetchFeatured = async () => {
      setFeaturedLoading(true);
      try {
        const res = await api.get('/api/playlists/featured');
        setFeaturedPlaylists(res.data);
      } catch (err) {
        console.error('Failed to fetch featured playlists:', err);
      } finally {
        setFeaturedLoading(false);
      }
    };

    fetchFeatured();
  }, [username]);

  const handleSearch = async (searchQuery) => {
    const q = searchQuery !== undefined ? searchQuery : query;
    if (!q || q.trim() === '') return;

    setLoading(true);
    setError('');
    setSearched(true);

    try {
      const res = await api.get(`/api/search?q=${encodeURIComponent(q.trim())}`);
      setResults(res.data);

      // Save to search history
      setHistory(prev => {
        const filtered = prev.filter(item => item.toLowerCase() !== q.trim().toLowerCase());
        const updated = [q.trim(), ...filtered].slice(0, 6); // Keep top 6 items
        localStorage.setItem(`echostream_search_history_${username}`, JSON.stringify(updated));
        return updated;
      });
    } catch (err) {
      console.error('[Search] Detailed Search query error:', {
        message: err.message,
        status: err.response?.status,
        statusText: err.response?.statusText,
        data: err.response?.data
      });
      const detailedErrorMessage = err.response?.data?.details 
        ? `${err.response.data.error} Details: ${err.response.data.details}`
        : (err.response?.data?.error || err.message || 'Failed to search for tracks.');
      setError(detailedErrorMessage);
    } finally {
      setLoading(false);
    }
  };

  const handleClear = () => {
    setQuery('');
    setResults([]);
    setSearched(false);
    setError('');
  };

  const handleCategoryClick = (categoryName) => {
    setQuery(categoryName);
    handleSearch(categoryName);
  };

  const handleRemoveHistoryItem = (e, itemToRemove) => {
    e.stopPropagation();
    setHistory(prev => {
      const updated = prev.filter(item => item !== itemToRemove);
      localStorage.setItem(`echostream_search_history_${username}`, JSON.stringify(updated));
      return updated;
    });
  };

  const handleClearAllHistory = (e) => {
    e.stopPropagation();
    setHistory([]);
    localStorage.removeItem(`echostream_search_history_${username}`);
  };

  return (
    <div className="space-y-8 pb-10">
      {/* Search Input Area */}
      <div className="sticky top-0 bg-zinc-900/95 py-4 z-10 backdrop-blur-md">
        <form
          onSubmit={(e) => {
            e.preventDefault();
            handleSearch();
          }}
          className="relative max-w-lg w-full flex items-center"
        >
          <SearchIcon className="absolute left-4 w-5 h-5 text-zinc-400" />
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="What do you want to listen to?"
            className="w-full bg-zinc-800 border border-zinc-700/50 rounded-full py-3 pl-12 pr-12 text-sm text-white focus:outline-none focus:bg-zinc-800 focus:border-white transition-all font-medium placeholder-zinc-400"
          />
          {query && (
            <button
              type="button"
              onClick={handleClear}
              className="absolute right-4 p-1 hover:bg-zinc-700 rounded-full transition-colors text-zinc-400 hover:text-white"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </form>
      </div>

      {/* Main Content Area */}
      {loading ? (
        <div className="flex flex-col items-center justify-center py-20 text-zinc-400">
          <Loader className="w-10 h-10 animate-spin text-spotify-green mb-4" />
          <p className="text-sm font-medium">Searching YouTube streams...</p>
        </div>
      ) : error ? (
        <div className="p-6 rounded-lg bg-red-500/10 border border-red-500/20 text-red-400 text-sm max-w-lg">
          <p className="font-semibold mb-1">Search Error</p>
          <p>{error}</p>
        </div>
      ) : searched ? (
        <div className="space-y-4">
          <h2 className="text-xl font-bold tracking-tight text-white text-left">Search Results</h2>
          <TrackList tracks={results} />
        </div>
      ) : (
        <div className="space-y-10">
          {/* Recent Searches */}
          {history.length > 0 && (
            <div className="space-y-4 text-left">
              <div className="flex items-center justify-between">
                <h2 className="text-xl font-bold tracking-tight text-white">Recent searches</h2>
                <button
                  type="button"
                  onClick={handleClearAllHistory}
                  className="text-xs font-semibold text-zinc-400 hover:text-white transition-colors"
                >
                  Clear all
                </button>
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4">
                {history.map((item, idx) => (
                  <div
                    key={idx}
                    onClick={() => {
                      setQuery(item);
                      handleSearch(item);
                    }}
                    className="bg-zinc-800/40 hover:bg-zinc-800/80 px-4 py-3 rounded-md flex items-center justify-between cursor-pointer group transition-all duration-200"
                  >
                    <div className="flex items-center gap-3 overflow-hidden">
                      <Clock className="w-4 h-4 text-zinc-400 flex-shrink-0" />
                      <span className="text-sm font-semibold text-white truncate">{item}</span>
                    </div>
                    <button
                      type="button"
                      onClick={(e) => handleRemoveHistoryItem(e, item)}
                      className="p-1 rounded-full text-zinc-400 hover:text-white hover:bg-zinc-700/50 transition-all opacity-0 group-hover:opacity-100"
                      title="Remove"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Eco Creations Featured Playlists */}
          {featuredPlaylists.length > 0 && (
            <div className="space-y-4 text-left">
              <h2 className="text-2xl font-bold tracking-tight text-white">Eco Creations Featured Playlists</h2>
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-6">
                {featuredPlaylists.map((playlist) => (
                  <div
                    key={playlist._id}
                    onClick={() => navigate(`/library?id=${playlist._id}&featured=true`)}
                    className="bg-zinc-900/60 p-4 rounded-lg hover:bg-zinc-800/80 cursor-pointer transition-all duration-200 group select-none shadow border border-zinc-900 hover:border-zinc-800 relative text-left"
                  >
                    {/* Cover Art Box */}
                    <div className="aspect-square w-full rounded bg-gradient-to-br from-emerald-600/80 to-blue-900 flex items-center justify-center text-4xl font-extrabold text-zinc-200 mb-4 shadow-md relative overflow-hidden">
                      {playlist.name.substring(0, 2).toUpperCase()}
                      
                      {/* Floating Play Button */}
                      {playlist.tracks.length > 0 && (
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            playTrack(playlist.tracks[0], playlist.tracks);
                          }}
                          className="absolute bottom-3 right-3 w-10 h-10 rounded-full bg-spotify-green hover:bg-spotify-hover text-black flex items-center justify-center scale-0 group-hover:scale-100 transition-all duration-200 shadow-lg z-10 hover:scale-105"
                        >
                          <Play className="w-5 h-5 fill-current text-black ml-0.5" />
                        </button>
                      )}
                    </div>
                    
                    {/* Meta */}
                    <h3 className="font-bold text-sm text-white truncate mb-1">
                      {playlist.name}
                    </h3>
                    <p className="text-xs text-zinc-400 font-medium line-clamp-2 leading-snug">
                      {playlist.description || `${playlist.tracks.length} songs`}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Quick categories */}
          <div className="space-y-4 text-left">
            <h2 className="text-2xl font-bold tracking-tight text-white">Browse all</h2>
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-5">
              {CATEGORIES.map((category, idx) => (
                <div
                  key={idx}
                  onClick={() => handleCategoryClick(category.name)}
                  className={`relative h-36 rounded-lg p-4 bg-gradient-to-br ${category.gradient} cursor-pointer transform hover:scale-[1.03] active:scale-[0.98] transition-all duration-200 overflow-hidden shadow-lg group`}
                >
                  <span className="font-bold text-lg text-white leading-tight block truncate max-w-[85%]">
                    {category.name}
                  </span>
                  <Disc className="absolute -right-6 -bottom-6 w-24 h-24 text-white/10 rotate-12 group-hover:rotate-45 group-hover:scale-110 transition-transform duration-300 flex-shrink-0" />
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
