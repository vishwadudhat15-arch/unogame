import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vitejs.dev/config/
export default defineConfig(async () => {
  const plugins = [react()]
  
  try {
    const { viteSingleFile } = await import('vite-plugin-singlefile')
    plugins.push(viteSingleFile())
  } catch (e) {
    console.warn('vite-plugin-singlefile not found. Single file build will be disabled until you run npm install.')
  }

  return {
    base: './',
    plugins,
    build: {
      assetsInlineLimit: 4096,
    },
    server: {
      port: 5178,
      host: true,
    }
  }
})
