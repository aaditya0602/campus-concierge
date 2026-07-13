/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        'vt-orange': '#E5751F',
        'vt-maroon': '#861F41',
      }
    },
  },
  plugins: [],
}
