const mongoose = require('mongoose');

const UserSchema = new mongoose.Schema({
  username: {
    type: String,
    required: true,
    unique: true,
    trim: true,
    minlength: 3
  },
  password: {
    type: String,
    required: false
  },
  email: {
    type: String,
    required: false,
    trim: true,
    lowercase: true
  },
  googleId: {
    type: String,
    required: false,
    unique: true,
    sparse: true
  }
}, {
  timestamps: true
});

module.exports = mongoose.model('User', UserSchema);
