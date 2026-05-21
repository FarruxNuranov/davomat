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

let token = null;

// Бот авторизуется в API под админом (читает данные давомата).
async function login() {
  const email = process.env.ADMIN_EMAIL;
  const password = process.env.ADMIN_PASSWORD;
  if (!email || !password) {
    throw new Error("ADMIN_EMAIL / ADMIN_PASSWORD не заданы в .env");
  }
  const { data } = await api.post("/auth/login", { email, password });
  token = data.accessToken;
  return token;
}

// GET с авторизацией; при 401 — перелогин и повтор.
export async function authedGet(path, params) {
  if (!token) await login();
  const cfg = () => ({ params, headers: { Authorization: `Bearer ${token}` } });
  try {
    return await api.get(path, cfg());
  } catch (err) {
    if (err.response?.status === 401) {
      await login();
      return api.get(path, cfg());
    }
    throw err;
  }
}
