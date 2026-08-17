import { defineConfig } from 'vite'
import path from 'path'
import tailwindcss from '@tailwindcss/vite'
import react from '@vitejs/plugin-react'


function figmaAssetResolver() {
  return {
    name: 'figma-asset-resolver',
    resolveId(id) {
      if (id.startsWith('figma:asset/')) {
        const filename = id.replace('figma:asset/', '')
        return path.resolve(__dirname, 'src/assets', filename)
      }
    },
  }
}

export default defineConfig({
  plugins: [
    figmaAssetResolver(),
    // The React and Tailwind plugins are both required for Make, even if
    // Tailwind is not being actively used – do not remove them
    react(),
    tailwindcss(),
  ],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src/app'),
    },
  },
  server: {
    proxy: {
      // Proxifie les appels PocketBase (site 3000 / :8090) pour éviter les soucis CORS.
      // Le client PB de l'app 5173 pointe sur '/pb' (voir src/app/data/pbClient.ts).
      '/pb': {
        target: 'http://127.0.0.1:8090',
        changeOrigin: true,
        rewrite: (p) => p.replace(/^\/pb/, ''),
      },
    },
  },
})
