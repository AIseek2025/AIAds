import { defineConfig } from 'vitest/config'
// @ts-ignore - 忽略插件类型冲突
import react from '@vitejs/plugin-react'

export default defineConfig({
  // @ts-ignore
  plugins: [react()],
  test: {
    globals: true,
    environment: 'jsdom',
  },
})
