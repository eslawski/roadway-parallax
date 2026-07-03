import { defineConfig } from 'vite';

export default defineConfig({
  // Relative base so the built bundle can be dropped into any host/cockpit shell.
  base: './',
});
