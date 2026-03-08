import { defineConfig } from 'vite';

export default defineConfig({
  // Configuration pour déploiement sur VistaPanel (à la racine du domaine)
  base: '/',

  // Configuration serveur de développement local
  server: {
    proxy: {
      '/backend': {
        target: 'http://localhost:8000',
        changeOrigin: true,
        pathRewrite: {
          '^/backend': '',
        },
        logLevel: 'debug',
      },
    },
  },

  // Optimisations pour la production
  build: {
    outDir: 'dist',
    assetsDir: 'assets',
    rollupOptions: {
      output: {
        manualChunks: undefined,
      },
    },
  },
});