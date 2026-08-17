/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ["./app/**/*.{js,jsx}", "./components/**/*.{js,jsx}"],
  theme: {
    extend: {
      colors: {
        accent: {
          50: "#E7F3FB",
          100: "#C4E2F5",
          200: "#8FC7EA",
          300: "#5CACDE",
          400: "#2C9BD6",
          500: "#1F82B8",
          600: "#186896",
          700: "#144F71",
          800: "#0F3A52",
        },
        brandYellow: "#FBBF24",
        ink: "#0F3A52",
      },
      borderRadius: {
        cc: "10px",
      },
    },
  },
  plugins: [],
};
