import { fileURLToPath, URL } from 'node:url'
import UnoCSS from 'unocss/vite'

import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import AutoImport from 'unplugin-auto-import/vite'
import Components from 'unplugin-vue-components/vite'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [
    vue({
      template: {
        compilerOptions: {
          // 所有以 mdui- 开头的标签名都是 mdui 组件
          isCustomElement: (tag) => tag.startsWith('mdui-')
        }
      }
    }),
    UnoCSS(),
    AutoImport({
      imports: ['vue']
    }),
    Components({
      extensions: ['vue', 'md']
    })
  ],
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url))
    }
  }
})
