/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,ts,jsx,tsx}"],
  theme: {
    extend: {
      colors: {
        navy: {
          950: "#07121f",
          900: "#0c1c30",
          800: "#132a46",
          700: "#1c3d63",
        },
        gold: {
          400: "#d4b45a",
          500: "#c4a046",
          600: "#a78432",
        },
        sand: {
          50: "#fbf7f0",
          100: "#f3ece0",
          200: "#e5d8c4",
        },
        ink: "#1a140c",
      },
      fontFamily: {
        serif: ["\"Fraunces\"", "Georgia", "serif"],
        sans: ["\"Manrope\"", "system-ui", "sans-serif"],
      },
      boxShadow: {
        card: "0 18px 50px -28px rgba(7, 18, 31, 0.55)",
      },
    },
  },
  plugins: [],
};
