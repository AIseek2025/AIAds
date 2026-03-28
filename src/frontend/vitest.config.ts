import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'

export default defineConfig({
  // @ts-expect-error — @vitejs/plugin-react 与 vitest 内嵌 Vite 的 PluginOption 类型不完全一致
  plugins: [react()],
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: ['./src/test/setup.ts'],
  },
})
