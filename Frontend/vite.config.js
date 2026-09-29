import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'
import tailwind from "@tailwindcss/vite"

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), tailwind()],
})
