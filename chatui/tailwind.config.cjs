const defaultTheme = require("tailwindcss/defaultTheme");
const colors = require("tailwindcss/colors");

/** @type {import('tailwindcss').Config} */
module.exports = {
	darkMode: "class",
	mode: "jit",
	content: ["./src/**/*.{html,js,svelte,ts}"],
	theme: {
		extend: {
			colors: {
				// Use CSS variables for gray palette to support different themes
				gray: {
					50: "rgb(var(--color-gray-50) / <alpha-value>)",
					100: "rgb(var(--color-gray-100) / <alpha-value>)",
					200: "rgb(var(--color-gray-200) / <alpha-value>)",
					300: "rgb(var(--color-gray-300) / <alpha-value>)",
					400: "rgb(var(--color-gray-400) / <alpha-value>)",
					500: "rgb(var(--color-gray-500) / <alpha-value>)",
					600: "rgb(var(--color-gray-600) / <alpha-value>)",
					700: "rgb(var(--color-gray-700) / <alpha-value>)",
					800: "rgb(var(--color-gray-800) / <alpha-value>)",
					900: "rgb(var(--color-gray-900) / <alpha-value>)",
					950: "rgb(var(--color-gray-950) / <alpha-value>)",
				},
			},
			fontSize: {
				xxs: "0.625rem",
				smd: "0.94rem",
			},
		},
	},
	plugins: [
		require("tailwind-scrollbar")({ nocompatible: true }),
		require("@tailwindcss/typography"),
	],
};
