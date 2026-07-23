import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

export default defineConfig({
  plugins: [react(), tailwindcss()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  server: {
    port: 5175,
    strictPort: true,
    open: true,
    // Cho phép truy cập qua tunnel Cloudflare khi demo trên điện thoại (cần HTTPS để
    // browser bật camera quét barcode). Dấu chấm đầu = mọi subdomain trycloudflare.com.
    allowedHosts: ['.trycloudflare.com'],
    proxy: {
      // FE gọi /api/* → backend chạy ở localhost:4313
      '/api': {
        target: 'http://localhost:4313',
        changeOrigin: true,
        configure: (proxy) => {
          // BE chỉ whitelist origin localhost/127.0.0.1 (SecurityConfig.corsConfigurationSource).
          // Khi mở dev server qua IP LAN để test trên điện thoại, browser gửi
          // Origin: http://<ip-lan>:5175 → Spring trả 403 "Invalid CORS request".
          // Request qua proxy này vốn same-origin với trang nên bỏ Origin là an toàn,
          // BE xử lý như request thường. Không phải nới CORS ở BE.
          proxy.on('proxyReq', (proxyReq) => {
            proxyReq.removeHeader('origin');
          });
        },
      },
    },
  },
});
