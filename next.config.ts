import type { NextConfig } from "next";

export const worldMapHeaders = [
  { key: "Access-Control-Allow-Origin", value: "*" },
  { key: "Cross-Origin-Resource-Policy", value: "cross-origin" },
  { key: "Referrer-Policy", value: "no-referrer" },
  // Enforced even when the core URL is opened directly; no Nexus cookies/storage/parent DOM.
  { key: "Content-Security-Policy", value: "sandbox allow-scripts allow-downloads allow-modals allow-pointer-lock; default-src 'self' data: blob:; script-src 'self' 'unsafe-inline' 'unsafe-eval'; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; font-src 'self' data: https://fonts.gstatic.com; img-src 'self' data: blob:; connect-src 'self' blob: data: https://fonts.googleapis.com https://fonts.gstatic.com; worker-src blob:; frame-src 'none'; object-src 'none'; base-uri 'self'; form-action 'none'" },
];
const nextConfig: NextConfig = {
  async headers() { return [{ source: "/world-map/core/:path*", headers: worldMapHeaders }]; },
};
export default nextConfig;
