/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './app/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        felt: '#1b6b3a',
        felt2: '#0f4d28',
        accent: '#e0a93b',
      },
    },
  },
  plugins: [],
};
