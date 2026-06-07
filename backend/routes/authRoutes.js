const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const axios = require('axios');
const User = require('../models/User');
const auth = require('../middleware/auth');
const router = express.Router();

// JWT Secret Key
const JWT_SECRET = process.env.JWT_SECRET || 'spotify_clone_secret_key';

// Route: POST /api/auth/register
router.post('/register', async (req, res) => {
  const { username, password } = req.body;

  if (!username || !password) {
    return res.status(400).json({ error: 'Username and password are required.' });
  }

  if (username.trim().length < 3) {
    return res.status(400).json({ error: 'Username must be at least 3 characters long.' });
  }

  if (password.length < 6) {
    return res.status(400).json({ error: 'Password must be at least 6 characters long.' });
  }

  try {
    // Check if user already exists
    const existingUser = await User.findOne({ username: username.trim() });
    if (existingUser) {
      return res.status(400).json({ error: 'Username is already taken.' });
    }

    // Hash the password
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    // Create and save new user
    const newUser = new User({
      username: username.trim(),
      password: hashedPassword
    });

    const savedUser = await newUser.save();

    // Generate JWT
    const token = jwt.sign(
      { id: savedUser._id, username: savedUser.username },
      JWT_SECRET,
      { expiresIn: '7d' }
    );

    res.status(201).json({
      token,
      user: {
        id: savedUser._id,
        username: savedUser.username
      }
    });

  } catch (error) {
    console.error('Error registering user:', error);
    res.status(500).json({ error: 'Registration failed.', details: error.message });
  }
});

// Route: POST /api/auth/login
router.post('/login', async (req, res) => {
  const { username, password } = req.body;

  if (!username || !password) {
    return res.status(400).json({ error: 'Username and password are required.' });
  }

  try {
    // Check if user exists
    const user = await User.findOne({ username: username.trim() });
    if (!user) {
      return res.status(400).json({ error: 'Invalid username or password.' });
    }

    // Verify user password exists (if user signed up via Google, they might not have a password)
    if (!user.password) {
      return res.status(400).json({ error: 'This account was registered using Google. Please log in with Google.' });
    }

    // Check password
    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(400).json({ error: 'Invalid username or password.' });
    }

    // Generate JWT
    const token = jwt.sign(
      { id: user._id, username: user.username },
      JWT_SECRET,
      { expiresIn: '7d' }
    );

    res.json({
      token,
      user: {
        id: user._id,
        username: user.username
      }
    });

  } catch (error) {
    console.error('Error logging in user:', error);
    res.status(500).json({ error: 'Login failed.', details: error.message });
  }
});

// Route: POST /api/auth/google
router.post('/google', async (req, res) => {
  const { credential } = req.body;

  if (!credential) {
    return res.status(400).json({ error: 'Google credential token is required.' });
  }

  try {
    // Verify token validity on Google tokeninfo endpoint
    console.log('[Google Auth] Verifying ID token with Google API...');
    const response = await axios.get(`https://oauth2.googleapis.com/tokeninfo?id_token=${credential}`);
    const payload = response.data;

    const { sub: googleId, email, name } = payload;

    if (!googleId) {
      return res.status(400).json({ error: 'Invalid Google token response.' });
    }

    // Check if user with this googleId exists
    let user = await User.findOne({ googleId });
    if (!user) {
      console.log(`[Google Auth] No user found with googleId: ${googleId}. Attempting lookup by email: ${email}`);
      
      if (email) {
        user = await User.findOne({ email });
      }

      if (user) {
        // Link googleId to existing user
        console.log(`[Google Auth] Linking googleId to existing account: ${user.username}`);
        user.googleId = googleId;
        if (!user.email) user.email = email;
        await user.save();
      } else {
        // Create new account
        let baseUsername = name || email.split('@')[0] || 'user';
        // Normalize username to alphanumeric only
        baseUsername = baseUsername.replace(/[^a-zA-Z0-9]/g, '');
        if (baseUsername.length < 3) baseUsername += '123';

        let username = baseUsername;
        let isTaken = await User.findOne({ username });
        let attempts = 0;
        while (isTaken && attempts < 10) {
          username = `${baseUsername}${Math.floor(100 + Math.random() * 900)}`;
          isTaken = await User.findOne({ username });
          attempts++;
        }

        console.log(`[Google Auth] Creating new user with username: ${username}`);
        user = new User({
          username,
          email,
          googleId
        });
        await user.save();
      }
    } else {
      console.log(`[Google Auth] Found existing user with googleId: ${user.username}`);
    }

    // Generate backend JWT session token
    const token = jwt.sign(
      { id: user._id, username: user.username },
      JWT_SECRET,
      { expiresIn: '7d' }
    );

    res.json({
      token,
      user: {
        id: user._id,
        username: user.username
      }
    });

  } catch (error) {
    console.error('[Google Auth] Error during Google verification:', error);
    res.status(500).json({
      error: 'Google login verification failed.',
      details: error.response?.data?.error_description || error.message
    });
  }
});

// Route: GET /api/auth/me (Get logged in user info)
router.get('/me', auth, async (req, res) => {
  try {
    if (req.user.id === '000000000000000000000000') {
      return res.json({
        _id: '000000000000000000000000',
        username: 'guest',
        email: 'guest@ecostream.com'
      });
    }
    const user = await User.findById(req.user.id).select('-password');
    if (!user) {
      return res.status(404).json({ error: 'User not found.' });
    }
    res.json(user);
  } catch (error) {
    console.error('Error fetching user info:', error);
    res.status(500).json({ error: 'Failed to retrieve profile info.', details: error.message });
  }
});

module.exports = router;
