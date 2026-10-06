// @ts-check
import { defineConfig } from 'astro/config';

// GitHub Pages: the deploy workflow injects SITE_URL and BASE_PATH.
// - User site (username.github.io)      -> BASE_PATH=/
// - Project site (username.github.io/x) -> BASE_PATH=/x
export default defineConfig({
  site: process.env.SITE_URL || 'https://example.github.io',
  base: process.env.BASE_PATH || '/',
  trailingSlash: 'ignore',
  build: {
    inlineStylesheets: 'always',
  },
  image: {
    responsiveStyles: false,
  },
  devToolbar: { enabled: false },
});
