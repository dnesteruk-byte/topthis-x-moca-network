import adapter from '@sveltejs/adapter-auto';
import { vitePreprocess } from '@sveltejs/vite-plugin-svelte';

/** @type {import('@sveltejs/kit').Config} */
const config = {
  preprocess: vitePreprocess(),
  kit: {
    adapter: adapter(),
    alias: {
      "$lib/*": "./src/lib/*",
      "@pages/*": "./src/pages/*",
      "@widgets/*": "./src/widgets/*",
      "@features/*": "./src/features/*",
      "@entities/*": "./src/enitities/*",
      "@shared/*": "./src/shared/*",
    }
  }
};

export default config;
