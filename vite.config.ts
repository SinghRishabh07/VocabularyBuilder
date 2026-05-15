import { sveltekit } from '@sveltejs/kit/vite';
import { defineConfig } from 'vite';
import tailwindcss from '@tailwindcss/vite';
import { SvelteKitPWA } from '@vite-pwa/sveltekit';


export default defineConfig({
	plugins: [
		tailwindcss(),
		sveltekit(),
		SvelteKitPWA({
			srcDir: './src',
			strategies: 'generateSW',
			scope: '/',
			base: '/',
			registerType: 'autoUpdate',
			manifest: {
				short_name: 'VocabVault',
				name: 'VocabVault | Master Your Language',
				description:
					'Build and review vocabulary with spaced repetition-style practice.',
				start_url: '/',
				id: '/',
				scope: '/',
				display: 'standalone',
				orientation: 'portrait-primary',
				theme_color: '#070a10',
				background_color: '#070a10',
				categories: ['education', 'productivity'],
				icons: [
					{
						src: '/pwa-192x192.png',
						sizes: '192x192',
						type: 'image/png',
					},
					{
						src: '/pwa-512x512.png',
						sizes: '512x512',
						type: 'image/png',
					},
					{
						src: '/pwa-512x512.png',
						sizes: '512x512',
						type: 'image/png',
						purpose: 'maskable',
					},
				],
			},
			workbox: {
				globPatterns: ['client/**/*.{js,css,ico,png,svg,webp,woff,woff2}'],
			},
			devOptions: {
				enabled: false,
				type: 'module',
				navigateFallback: '/',
			},
		}),
	],
	ssr: {
		// Prevent Vite from bundling these CJS packages (they use `exports` which breaks in ESM context)
		external: ['pg', '@prisma/adapter-pg']
	}
});
