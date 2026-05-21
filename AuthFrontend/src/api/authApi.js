import axios from "axios";

const baseURL = "https://localhost:7052/api";

const api = axios.create({ baseURL });

export const setAccessToken = (token) => {
  if (token) localStorage.setItem("accessToken", token);
};

export const clearSession = () => {
  localStorage.removeItem("accessToken");
  localStorage.removeItem("user");
};

api.interceptors.request.use((config) => {
  const token = localStorage.getItem("accessToken");
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

api.interceptors.response.use(
  (res) => res,
  (error) => {
    if (error.response?.status === 401) {
      clearSession();
      if (!window.location.pathname.startsWith("/login")) {
        window.location.href = "/login";
      }
    }
    return Promise.reject(error);
  }
);

export const login = (data) => api.post("/auth/login", data);
export const getMe = () => api.get("/users/me");

export const getEmployees = () => api.get("/employees");
export const getEmployee = (id) => api.get(`/employees/${id}`);
export const createEmployee = (data) => api.post("/employees", data);
export const updateEmployee = (id, data) => api.put(`/employees/${id}`, data);
export const deleteEmployee = (id) => api.delete(`/employees/${id}`);

// Давомат (учёт посещаемости)
export const getAttendanceByDate = (date) =>
  api.get("/attendance", { params: { date } });
export const getAttendanceRange = (from, to) =>
  api.get("/attendance/range", { params: { from, to } });
export const getEmployeeAttendance = (employeeId, params) =>
  api.get(`/attendance/employee/${employeeId}`, { params });
export const markAttendance = (data) => api.put("/attendance", data);
export const deleteAttendance = (id) => api.delete(`/attendance/${id}`);

// Портал сотрудника
export const getMyAttendance = (from, to) =>
  api.get("/attendance/my", { params: { from, to } });
export const fulfillAttendance = (id, formData) =>
  api.post(`/attendance/${id}/fulfill`, formData);
export const getScreenshotBlob = (id) =>
  api.get(`/attendance/screenshot/${id}`, { responseType: "blob" });

// Настройки рабочего графика
export const getWorkSchedule = () => api.get("/settings/work-schedule");
export const updateWorkSchedule = (data) => api.put("/settings/work-schedule", data);

// Настройки интеграций (ИИ, Telegram)
export const getIntegrations = () => api.get("/settings/integrations");
export const updateIntegrations = (data) => api.put("/settings/integrations", data);

// ИИ-аналитика давомата
export const getAttendanceAnalysis = (year, month) =>
  api.get("/analysis/attendance", { params: { year, month }, timeout: 120000 });

// Отправка отчёта по давомату в Telegram (по умолчанию — за сегодня)
export const sendTelegramReport = (date) =>
  api.post("/telegram/send-report", null, { params: date ? { date } : {} });

export default api;
