import { useState } from "react";
import { Navigate, Outlet } from "react-router-dom";
import Sidebar from "../../components/Sidebar";
import Navbar from "../../components/Navbar";
import "./DashboardLayout.css";

export default function DashboardLayout() {
  const token = localStorage.getItem("accessToken");
  const [open, setOpen] = useState(false);

  if (!token) return <Navigate to="/login" replace />;

  return (
    <div className="dashboard-layout">
      <Sidebar open={open} onClose={() => setOpen(false)} />
      <div className="dashboard-main">
        <Navbar onBurger={() => setOpen(true)} />
        <main className="dashboard-content">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
