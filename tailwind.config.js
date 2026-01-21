/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        garden: {
          soil: '#8B7355',
          corn: '#F4E285',
          tomato: '#E74C3C',
          potato: '#D4A76A',
          grass: '#7CB342',
          water: '#3498DB',
        },
      },
      spacing: {
        'subcell': '3rem',
        'cell': '12rem',
        'zone': '48rem',
      },
    },
  },
  plugins: [],
}
