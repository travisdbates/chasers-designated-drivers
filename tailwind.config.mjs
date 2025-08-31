/** @type {import('tailwindcss').Config} */
export default {
	content: ['./src/**/*.{astro,html,js,jsx,md,mdx,svelte,ts,tsx,vue}'],
	theme: {
		extend: {
			colors: {
				// Primary Gold Palette - Updated to match WorldClass
				gold: {
					primary: '#c69214',
					light: '#d4a629',
					dark: '#a67c0f',
					50: '#fefce8',
					100: '#fef3c7',
					200: '#fde68a',
					300: '#fcd34d',
					400: '#f59e0b',
					500: '#c69214',
					600: '#a67c0f',
					700: '#92400e',
					800: '#78350f',
					900: '#451a03',
				},
				// WorldClass Cream/Off-White Palette
				cream: {
					primary: '#d1c9b8',
					light: '#e0dac9',
					dark: '#c2b8a7',
					50: '#f7f5f1',
					100: '#f0ece3',
					200: '#e7e0d4',
					300: '#ddd3c3',
					400: '#d1c9b8',
					500: '#c2b8a7',
					600: '#a89e8d',
					700: '#8e8373',
					800: '#6d635a',
					900: '#4a4340',
				},
				// Dark Luxury Theme - Updated with WorldClass dark text
				dark: {
					primary: '#000000',
					text: '#2d2d2d', // WorldClass dark text color
					900: '#0f0f0f',
					800: '#1a1a1a',
					700: '#2d2d2d',
					600: '#404040',
					500: '#525252',
					400: '#a1a1a1',
					300: '#d1d1d1',
					200: '#e5e5e5',
					100: '#f5f5f5',
				}
			},
			fontFamily: {
				// Primary: Overpass for headers
				primary: ['Overpass', 'Inter', 'Arial', 'sans-serif'],
				// Secondary: Louize Display for body text
				secondary: ['LouizeDisplay', 'Louize Display', 'Overpass', 'Inter', 'sans-serif'],
				// Accent: Overpass for buttons, CTAs, navigation
				accent: ['Overpass', 'Inter', 'Arial', 'sans-serif'],
			},
			fontSize: {
				// Custom typography scale
				'hero': ['4rem', { lineHeight: '1.1', letterSpacing: '-0.02em' }],
				'display': ['3rem', { lineHeight: '1.2', letterSpacing: '-0.01em' }],
				'heading': ['2.25rem', { lineHeight: '1.3' }],
				'subheading': ['1.5rem', { lineHeight: '1.4' }],
			},
			spacing: {
				'hero': '40vh',
				'section': '6rem',
			},
			boxShadow: {
				'luxury': '0 25px 50px -12px rgba(0, 0, 0, 0.5)',
				'luxury-hover': '0 35px 60px -12px rgba(0, 0, 0, 0.7)',
				'gold': '0 10px 25px rgba(198, 146, 20, 0.3)',
			},
			backdropBlur: {
				'luxury': '10px',
			},
			animation: {
				'fade-in': 'fadeIn 0.5s ease-in-out',
				'slide-up': 'slideUp 0.6s ease-out',
				'scale-in': 'scaleIn 0.3s ease-in-out',
			},
			keyframes: {
				fadeIn: {
					'0%': { opacity: '0' },
					'100%': { opacity: '1' },
				},
				slideUp: {
					'0%': { opacity: '0', transform: 'translateY(30px)' },
					'100%': { opacity: '1', transform: 'translateY(0)' },
				},
				scaleIn: {
					'0%': { opacity: '0', transform: 'scale(0.95)' },
					'100%': { opacity: '1', transform: 'scale(1)' },
				},
			},
			transitionTimingFunction: {
				'bounce': 'cubic-bezier(0.68, -0.55, 0.265, 1.55)',
			}
		},
	},
	plugins: [],
}