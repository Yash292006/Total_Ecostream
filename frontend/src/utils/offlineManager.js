// A simple manager for IndexedDB to store and retrieve audio Blobs for offline playback
const DB_NAME = 'EchoStreamOfflineDB';
const DB_VERSION = 1;
const STORE_NAME = 'downloaded_tracks';

function getDB() {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);
    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve(request.result);
    
    request.onupgradeneeded = (e) => {
      const db = e.target.result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME, { keyPath: 'videoId' });
      }
    };
  });
}

export const offlineManager = {
  // Save a track's audio blob and metadata
  async saveTrack(track, audioBlob) {
    const db = await getDB();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction(STORE_NAME, 'readwrite');
      const store = transaction.objectStore(STORE_NAME);
      
      const record = {
        videoId: track.videoId,
        title: track.title,
        artist: track.artist,
        thumbnail: track.thumbnail,
        duration: track.duration,
        audioBlob: audioBlob,
        downloadedAt: Date.now()
      };
      
      const request = store.put(record);
      request.onsuccess = () => resolve(true);
      request.onerror = () => reject(request.error);
    });
  },

  // Get a track from the database
  async getTrack(videoId) {
    try {
      const db = await getDB();
      return new Promise((resolve, reject) => {
        const transaction = db.transaction(STORE_NAME, 'readonly');
        const store = transaction.objectStore(STORE_NAME);
        const request = store.get(videoId);
        
        request.onsuccess = () => resolve(request.result || null);
        request.onerror = () => reject(request.error);
      });
    } catch (err) {
      console.warn('Offline DB not available:', err);
      return null;
    }
  },

  // Remove a downloaded track
  async deleteTrack(videoId) {
    const db = await getDB();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction(STORE_NAME, 'readwrite');
      const store = transaction.objectStore(STORE_NAME);
      const request = store.delete(videoId);
      
      request.onsuccess = () => resolve(true);
      request.onerror = () => reject(request.error);
    });
  },

  // List all downloaded tracks
  async getAllTracks() {
    try {
      const db = await getDB();
      return new Promise((resolve, reject) => {
        const transaction = db.transaction(STORE_NAME, 'readonly');
        const store = transaction.objectStore(STORE_NAME);
        const request = store.getAll();
        
        request.onsuccess = () => resolve(request.result || []);
        request.onerror = () => reject(request.error);
      });
    } catch (err) {
      console.warn('Offline DB not available:', err);
      return [];
    }
  },

  // Check if a track is downloaded
  async isDownloaded(videoId) {
    if (!videoId) return false;
    const track = await this.getTrack(videoId);
    return !!track;
  }
};
