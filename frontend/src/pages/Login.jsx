import React, { useContext, useState } from 'react';
import { Music, Lock, User, AlertCircle } from 'lucide-react';
import { AuthContext } from '../context/AuthContext';
import YashCreationLogo from '../components/YashCreationLogo';

export default function Login() {
  const { login, register } = useContext(AuthContext);
  const [isLoginView, setIsLoginView] = useState(true);
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    
    if (!username.trim() || !password) {
      setError('Please fill in all fields.');
      return;
    }

    setLoading(true);

    if (isLoginView) {
      const result = await login(username, password);
      if (!result.success) {
        setError(result.error);
        setLoading(false);
      }
    } else {
      if (password.length < 6) {
        setError('Password must be at least 6 characters.');
        setLoading(false);
        return;
      }
      const result = await register(username, password);
      if (!result.success) {
        setError(result.error);
        setLoading(false);
      }
    }
  };

  return (
    <div className="min-h-screen bg-black text-white flex flex-col justify-center items-center px-4 font-sans select-none">
      {/* Container Card */}
      <div className="w-full max-w-md bg-zinc-950 p-10 rounded-2xl border border-zinc-900 shadow-2xl flex flex-col items-center">
        {/* Brand Header */}
        <div className="flex flex-col items-center gap-3 mb-8">
          <YashCreationLogo className="w-16 h-16 filter drop-shadow-[0_0_12px_rgba(29,185,84,0.45)] mb-2" />
          <h1 className="text-3xl font-black tracking-tight text-white">EchoStream</h1>
          <span className="text-xs uppercase font-extrabold tracking-widest text-spotify-green bg-spotify-green/10 px-3 py-1 rounded-full border border-spotify-green/20">
            by Yash Creation
          </span>
        </div>

        <h2 className="text-xl font-bold mb-6 text-center text-zinc-200">
          {isLoginView ? 'Log in to continue listening' : 'Sign up for a free account'}
        </h2>

        {/* Error Alert Box */}
        {error && (
          <div className="w-full mb-6 p-4 rounded-lg bg-red-500/10 border border-red-500/30 flex items-start gap-3 text-red-400 text-sm">
            <AlertCircle className="w-5 h-5 flex-shrink-0 mt-0.5" />
            <p className="font-medium leading-relaxed">{error}</p>
          </div>
        )}

        {/* Auth Form */}
        <form onSubmit={handleSubmit} className="w-full space-y-5">
          {/* Username Input */}
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-zinc-400 mb-2">
              Username
            </label>
            <div className="relative">
              <span className="absolute inset-y-0 left-0 pl-3 flex items-center text-zinc-500">
                <User className="w-5 h-5" />
              </span>
              <input
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="Enter your username"
                className="w-full pl-10 pr-4 py-3 bg-zinc-900 border border-zinc-800 rounded-lg focus:outline-none focus:border-spotify-green text-sm text-white placeholder-zinc-500 transition-colors"
                autoComplete="username"
              />
            </div>
          </div>

          {/* Password Input */}
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-zinc-400 mb-2">
              Password
            </label>
            <div className="relative">
              <span className="absolute inset-y-0 left-0 pl-3 flex items-center text-zinc-500">
                <Lock className="w-5 h-5" />
              </span>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Enter your password"
                className="w-full pl-10 pr-4 py-3 bg-zinc-900 border border-zinc-800 rounded-lg focus:outline-none focus:border-spotify-green text-sm text-white placeholder-zinc-500 transition-colors"
                autoComplete="current-password"
              />
            </div>
          </div>

          {/* Action Button */}
          <button
            type="submit"
            disabled={loading}
            className="w-full py-3 bg-spotify-green hover:bg-spotify-hover text-black font-bold rounded-full transition-all duration-200 transform hover:scale-[1.02] active:scale-[0.98] shadow-md hover:shadow-spotify-green/20 disabled:opacity-50 disabled:scale-100 mt-4 text-sm tracking-wide"
          >
            {loading ? (
              <span className="flex items-center justify-center gap-2">
                <div className="w-4 h-4 border-2 border-black border-t-transparent rounded-full animate-spin"></div>
                Please wait...
              </span>
            ) : isLoginView ? (
              'Log In'
            ) : (
              'Sign Up'
            )}
          </button>
        </form>

        {/* Divider */}
        <div className="w-full flex items-center gap-3 my-5">
          <div className="h-[1px] flex-1 bg-zinc-900"></div>
          <span className="text-[10px] text-zinc-500 font-extrabold uppercase tracking-widest">or</span>
          <div className="h-[1px] flex-1 bg-zinc-900"></div>
        </div>

        {/* Google Signup/Login Link */}
        <a
          href="https://www.google.com"
          target="_blank"
          rel="noopener noreferrer"
          className="w-full flex items-center justify-center gap-3 py-3 bg-transparent hover:bg-zinc-900 border border-zinc-800 hover:border-zinc-700 text-white font-bold rounded-full transition-all duration-200 transform hover:scale-[1.02] active:scale-[0.98] text-sm tracking-wide"
        >
          <svg className="w-5 h-5 flex-shrink-0" viewBox="0 0 24 24">
            <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
            <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
            <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z" />
            <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z" />
          </svg>
          Continue with Google
        </a>

        {/* Toggle link */}
        <div className="mt-8 border-t border-zinc-900 w-full pt-6 text-center text-sm text-zinc-400">
          <span>
            {isLoginView ? "Don't have an account? " : 'Already have an account? '}
          </span>
          <button
            onClick={() => {
              setIsLoginView(!isLoginView);
              setError('');
              setUsername('');
              setPassword('');
            }}
            className="text-spotify-green hover:underline font-semibold"
          >
            {isLoginView ? 'Sign Up' : 'Log In'}
          </button>
        </div>
      </div>
    </div>
  );
}
