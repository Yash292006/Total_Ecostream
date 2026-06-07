import React, { useState } from 'react';
import { GoogleLogin } from '@react-oauth/google';
import { Music, Lock, User, AlertCircle, CheckCircle } from 'lucide-react';
import useAuth from '../hooks/useAuth';
import YashCreationLogo from '../components/YashCreationLogo';

export default function Auth() {
  const { login, register, googleLogin } = useAuth();
  const [isLoginView, setIsLoginView] = useState(true);
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [feedback, setFeedback] = useState({ type: '', message: '' });
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setFeedback({ type: '', message: '' });

    if (!username.trim() || !password) {
      setFeedback({ type: 'error', message: 'Please fill in all fields.' });
      return;
    }

    setLoading(true);
    try {
      if (isLoginView) {
        console.log(`[Auth Submit] Attempting log in for user: "${username}"`);
        const result = await login(username, password);
        if (result.success) {
          setFeedback({ type: 'success', message: 'Logged in successfully! Loading your library...' });
        } else {
          setFeedback({ type: 'error', message: result.error });
          setLoading(false);
        }
      } else {
        if (password.length < 6) {
          setFeedback({ type: 'error', message: 'Password must be at least 6 characters long.' });
          setLoading(false);
          return;
        }
        console.log(`[Auth Submit] Attempting registration for user: "${username}"`);
        const result = await register(username, password);
        if (result.success) {
          setFeedback({ type: 'success', message: 'Account created successfully! Logging you in...' });
        } else {
          setFeedback({ type: 'error', message: result.error });
          setLoading(false);
        }
      }
    } catch (err) {
      console.error('[Auth Submit] Error:', err);
      setFeedback({ type: 'error', message: 'An unexpected authentication error occurred.' });
      setLoading(false);
    }
  };

  const handleGoogleSuccess = async (credentialResponse) => {
    setFeedback({ type: '', message: '' });
    setLoading(true);
    
    const token = credentialResponse.credential;
    console.log('[Google OAuth] Credential token received. Validating with backend...');
    
    try {
      const result = await googleLogin(token);
      if (result.success) {
        setFeedback({ type: 'success', message: 'Signed in with Google successfully!' });
      } else {
        setFeedback({ type: 'error', message: result.error });
        setLoading(false);
      }
    } catch (err) {
      console.error('[Google OAuth] Error:', err);
      setFeedback({ type: 'error', message: 'Google authentication handshake failed.' });
      setLoading(false);
    }
  };

  const handleGoogleError = () => {
    console.error('[Google OAuth] Sign In Failed.');
    setFeedback({ type: 'error', message: 'Google Sign In was cancelled or failed.' });
  };

  return (
    <div className="min-h-screen bg-black text-white flex flex-col justify-center items-center px-4 font-sans select-none">
      {/* Container Card */}
      <div className="w-full max-w-md bg-zinc-950 p-8 md:p-10 rounded-2xl border border-zinc-900 shadow-2xl flex flex-col items-center">
        
        {/* Brand Header */}
        <div className="flex flex-col items-center gap-3 mb-8">
          <YashCreationLogo className="w-16 h-16 filter drop-shadow-[0_0_12px_rgba(29,185,84,0.45)] mb-2 animate-pulse" />
          <h1 className="text-3xl font-black tracking-tight text-white">EchoStream</h1>
          <span className="text-xs uppercase font-extrabold tracking-widest text-spotify-green bg-spotify-green/10 px-3 py-1 rounded-full border border-spotify-green/20">
            by Yash Creation
          </span>
        </div>

        <h2 className="text-xl font-bold mb-6 text-center text-zinc-200">
          {isLoginView ? 'Log in to continue listening' : 'Create a free account'}
        </h2>

        {/* Color-Coded User Feedback Box */}
        {feedback.message && (
          <div 
            className={`w-full mb-6 p-4 rounded-lg flex items-start gap-3 text-sm transition-all duration-300 ${
              feedback.type === 'success' 
                ? 'bg-emerald-500/10 border border-emerald-500/30 text-emerald-400' 
                : 'bg-red-500/10 border border-red-500/30 text-red-400'
            }`}
          >
            {feedback.type === 'success' ? (
              <CheckCircle className="w-5 h-5 flex-shrink-0 mt-0.5 animate-bounce" />
            ) : (
              <AlertCircle className="w-5 h-5 flex-shrink-0 mt-0.5" />
            )}
            <p className="font-medium leading-relaxed">{feedback.message}</p>
          </div>
        )}

        {/* Credentials Authentication Form */}
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
                disabled={loading}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="Enter your username"
                className="w-full pl-10 pr-4 py-3 bg-zinc-900 border border-zinc-800 rounded-lg focus:outline-none focus:ring-2 focus:ring-spotify-green focus:border-transparent text-sm text-white placeholder-zinc-500 transition-all disabled:opacity-50"
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
                disabled={loading}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Enter your password"
                className="w-full pl-10 pr-4 py-3 bg-zinc-900 border border-zinc-800 rounded-lg focus:outline-none focus:ring-2 focus:ring-spotify-green focus:border-transparent text-sm text-white placeholder-zinc-500 transition-all disabled:opacity-50"
                autoComplete="current-password"
              />
            </div>
          </div>

          {/* Action Button */}
          <button
            type="submit"
            disabled={loading}
            className="w-full py-3 bg-spotify-green hover:bg-spotify-hover text-black font-bold rounded-full transition-all duration-200 transform hover:scale-[1.02] active:scale-[0.98] shadow-md hover:shadow-spotify-green/20 disabled:opacity-50 disabled:scale-100 mt-4 text-sm tracking-wide flex items-center justify-center gap-2"
          >
            {loading && feedback.type !== 'success' ? (
              <>
                <div className="w-4 h-4 border-2 border-black border-t-transparent rounded-full animate-spin"></div>
                Please wait...
              </>
            ) : isLoginView ? (
              'Log In'
            ) : (
              'Sign Up'
            )}
          </button>
        </form>

        {/* Divider */}
        <div className="w-full flex items-center gap-3 my-6">
          <div className="h-[1px] flex-1 bg-zinc-900"></div>
          <span className="text-[10px] text-zinc-500 font-extrabold uppercase tracking-widest">or</span>
          <div className="h-[1px] flex-1 bg-zinc-900"></div>
        </div>

        {/* Professional Google Sign-In Integration */}
        <div className="w-full flex justify-center">
          {loading ? (
            <div className="w-full py-3 text-center text-sm font-semibold border border-zinc-800 rounded-full text-zinc-500">
              Handshake in progress...
            </div>
          ) : (
            <div className="w-full custom-google-login-btn">
              <GoogleLogin
                onSuccess={handleGoogleSuccess}
                onError={handleGoogleError}
                theme="filled_blue"
                shape="pill"
                size="large"
                width="380"
              />
            </div>
          )}
        </div>

        {/* Toggle View Options */}
        <div className="mt-8 border-t border-zinc-900 w-full pt-6 text-center text-sm text-zinc-400">
          <span>
            {isLoginView ? "Don't have an account? " : 'Already have an account? '}
          </span>
          <button
            onClick={() => {
              setIsLoginView(!isLoginView);
              setFeedback({ type: '', message: '' });
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
