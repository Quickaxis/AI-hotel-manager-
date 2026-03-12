/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        orange: "#ff6b00",
        "orange-light": "#ff9500",
        "bg-dark": "#0a0a0a",
      },
      fontFamily: {
        jakarta: ['"Plus Jakarta Sans"', 'sans-serif'],
      },
      boxShadow: {
        'orange-glow': '0 0 40px rgba(255, 107, 0, 0.15)',
        'btn-glow': '0 0 20px rgba(255, 107, 0, 0.4)',
      },
    },
  },
  plugins: [],
}
