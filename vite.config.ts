import path from "path";
import { defineConfig, loadEnv } from "vite";

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, ".", "");

  const portFromEnv =
    Number(process.env.PORT) && !Number.isNaN(Number(process.env.PORT))
      ? Number(process.env.PORT)
      : 4173;

  return {
    // Nếu deploy dưới subpath có thể đặt BASE ở biến môi trường
    base: env.VITE_BASE || "/",

    define: {
      "process.env.API_KEY": JSON.stringify(env.GEMINI_API_KEY),
      "process.env.GEMINI_API_KEY": JSON.stringify(env.GEMINI_API_KEY)
    },

    resolve: {
      alias: {
        "@": path.resolve(__dirname, ".")
      }
    },

    // Hữu ích nếu bạn thỉnh thoảng chạy `vite` dev trong container
    server: {
      host: true,                // tương đương 0.0.0.0
      port: 5173,
      strictPort: false,
      cors: true,
      // Cho phép mọi host để tránh lỗi "Blocked request. This host (...) is not allowed."
      // (Nếu muốn siết chặt, thay true bằng mảng whitelist)
      allowedHosts: true
    },

    // Cực kỳ quan trọng cho môi trường production khi dùng `vite preview`
    preview: {
      host: true,                // bind 0.0.0.0
      port: portFromEnv,         // nhận từ PORT của platform
      strictPort: true,          // fail sớm nếu port xung đột
      cors: true,
      allowedHosts: true         // bỏ chặn hostname reverse proxy
    },

    // Tùy chọn build (để mặc định cũng ổn)
    build: {
      outDir: "dist",
      sourcemap: false,
      target: "es2020"
    }
  };
});
