import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  server: {
    // Autorise kanban.local et toutes les autres adresses pour l'atelier
    allowedHosts: true,
    // Indispensable pour être vu sur le réseau
    host: true,
    port: 5173
  }
})