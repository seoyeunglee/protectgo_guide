import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// protect-go-react에 이미 설치된 패키지 경로를 재사용
const PG_MODS = 'C:/Users/idb/refs/protect-go-react/protect-go-react/node_modules'
const DS = `${PG_MODS}/@idbrnd/design-system`

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: [
      // style.css 서브패스를 먼저 처리 (더 구체적인 규칙 우선)
      {
        find: /^@idbrnd\/design-system\/style\.css$/,
        replacement: `${DS}/dist/style.css`,
      },
      {
        find: /^@idbrnd\/design-system$/,
        replacement: `${DS}/dist/index.js`,
      },
      {
        find: /^@tanstack\/react-table$/,
        replacement: `${PG_MODS}/@tanstack/react-table/build/lib/index.esm.js`,
      },
    ],
  },
})
