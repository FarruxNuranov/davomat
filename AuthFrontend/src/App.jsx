import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import Login from "./pages/Login/Login";
import Dashboard from "./pages/Dashboard/Dashboard";
import Profile from "./pages/Profile/Profile";
import Employees from "./pages/Employees/Employees";
import EmployeeDetail from "./pages/Employees/EmployeeDetail";
import Attendance from "./pages/Attendance/Attendance";
import Summary from "./pages/Summary/Summary";
import Settings from "./pages/Settings/Settings";
import EmployeeCalendar from "./pages/EmployeeCalendar/EmployeeCalendar";
import DashboardLayout from "./layouts/DashboardLayout/DashboardLayout";

const role = () => JSON.parse(localStorage.getItem("user") || "{}").role;

// Админские страницы недоступны сотруднику.
function AdminOnly({ children }) {
  return role() === "Employee" ? <Navigate to="/dashboard/my" replace /> : children;
}

// Главная: админ — дашборд, сотрудник — свой календарь.
function Home() {
  return role() === "Employee" ? <Navigate to="/dashboard/my" replace /> : <Dashboard />;
}

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Navigate to="/login" replace />} />
        <Route path="/login" element={<Login />} />

        <Route path="/dashboard" element={<DashboardLayout />}>
          <Route index element={<Home />} />
          <Route path="employees" element={<AdminOnly><Employees /></AdminOnly>} />
          <Route path="employees/:id" element={<AdminOnly><EmployeeDetail /></AdminOnly>} />
          <Route path="attendance" element={<AdminOnly><Attendance /></AdminOnly>} />
          <Route path="summary" element={<AdminOnly><Summary /></AdminOnly>} />
          <Route path="settings" element={<AdminOnly><Settings /></AdminOnly>} />
          <Route path="my" element={<EmployeeCalendar />} />
          <Route path="profile" element={<Profile />} />
        </Route>

        <Route path="*" element={<Navigate to="/login" replace />} />
      </Routes>
    </BrowserRouter>
  );
}
