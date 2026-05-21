import https from "node:https";
import axios from "axios";

const baseURL = process.env.API_BASE_URL || "https://localhost:7052/api";

// Для локальной разработки бэкенд на https с самоподписанным сертификатом —
// при API_INSECURE_TLS=true разрешаем его (только для dev!).
const insecure = process.env.API_INSECURE_TLS === "true";

export const api = axios.create({
  baseURL,
  timeout: 15000,
  httpsAgent: insecure ? new https.Agent({ rejectUnauthorized: false }) : undefined,
});
