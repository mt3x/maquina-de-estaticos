import path from "node:path";
import type { NextConfig } from "next";
// Raiz explícita: há outro package-lock.json acima desta pasta e o Next avisava que "adivinhou" a raiz.
const config: NextConfig = { serverExternalPackages: ["sharp", "archiver", "mammoth"], turbopack: { root: path.resolve(".") } };
export default config;
