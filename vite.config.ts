import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// Yahoo Finance is great and free, but its endpoints don't allow CORS from the
// browser. In dev we proxy /yf -> https://query1.finance.yahoo.com so the
// browser can call it without errors. For production you'll need to either:
//   - deploy behind a small backend that does the same proxy, or
//   - use a public CORS proxy (less reliable), or
//   - swap to an API that supports browser CORS (e.g. Finnhub, Alpha Vantage).
export default defineConfig({
  plugins: [react()],
  server: {
    proxy: {
      "/yf": {
        target: "https://query1.finance.yahoo.com",
        changeOrigin: true,
        secure: true,
        rewrite: (path) => path.replace(/^\/yf/, ""),
        headers: {
          // Yahoo sometimes 401s requests without a UA
          "User-Agent":
            "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124 Safari/537.36",
        },
      },
    },
  },
});
