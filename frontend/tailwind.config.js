/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        spotify: {
          green: '#1DB954',
          dark: '#121212',
          black: '#191414',
          light: '#282828',
          zinc: '#181818',
          hover: '#1ed760'
        }
      }
    },
  },
  plugins: [],
}
