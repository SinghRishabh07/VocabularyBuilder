import { sveltekit } from '@sveltejs/kit/vite';
import { defineConfig } from 'vite';
import tailwindcss from '@tailwindcss/vite';


export default defineConfig({
	plugins: [
		tailwindcss(),
		sveltekit()
	],
	ssr: {
		// Prevent Vite from bundling these CJS packages (they use `exports` which breaks in ESM context)
		external: ['pg', '@prisma/adapter-pg']
	}
});
