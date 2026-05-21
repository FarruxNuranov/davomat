import { NavLink } from "react-router-dom";
import "./Sidebar.css";

export default function Sidebar({ open, onClose }) {
  const user = JSON.parse(localStorage.getItem("user") || "{}");
  const isEmployee = user.role === "Employee";

  return (
    <>
      <div
        className={`sidebar-backdrop${open ? " show" : ""}`}
        onClick={onClose}
        aria-hidden="true"
      />
      <aside className={`sidebar${open ? " open" : ""}`}>
        <div className="sidebar-head">
          <span className="sidebar-logo">AuthApp</span>
          <button className="sidebar-close" onClick={onClose} aria-label="Закрыть меню">
            ✕
          </button>
        </div>
        <nav className="sidebar-nav" onClick={onClose}>
          {isEmployee ? (
            <NavLink to="/dashboard/my">Мой календарь</NavLink>
          ) : (
            <>
              <NavLink to="/dashboard" end>Главная</NavLink>
              <NavLink to="/dashboard/employees">Сотрудники</NavLink>
              <NavLink to="/dashboard/attendance">Давомат</NavLink>
              <NavLink to="/dashboard/summary">Итоги</NavLink>
              <NavLink to="/dashboard/settings">Настройки</NavLink>
            </>
          )}
        </nav>
      </aside>
    </>
  );
}
