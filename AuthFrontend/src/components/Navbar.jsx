import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { clearSession } from "../api/authApi";
import "./Navbar.css";

export default function Navbar({ onBurger }) {
  const navigate = useNavigate();
  const [menuOpen, setMenuOpen] = useState(false);
  const user = JSON.parse(localStorage.getItem("user") || "{}");
  const displayName = [user.firstName, user.lastName].filter(Boolean).join(" ") || user.email;

  const initials =
    [user.firstName, user.lastName]
      .filter(Boolean)
      .map((s) => s[0])
      .join("")
      .toUpperCase() || (user.email ? user.email[0].toUpperCase() : "U");

  const goProfile = () => {
    setMenuOpen(false);
    navigate("/dashboard/profile");
  };

  const handleLogout = () => {
    clearSession();
    navigate("/login");
  };

  return (
    <header className="navbar">
      <div className="navbar-left">
        <button className="navbar-burger" onClick={onBurger} aria-label="Открыть меню">
          <span></span>
          <span></span>
          <span></span>
        </button>
        <div className="navbar-title">Панель управления</div>
      </div>

      <div className="navbar-right">
        <button
          className={`navbar-profile${menuOpen ? " open" : ""}`}
          onClick={() => setMenuOpen((o) => !o)}
        >
          <span className="navbar-avatar">{initials}</span>
          <span className="navbar-user">{displayName}</span>
        </button>

        {menuOpen && (
          <>
            <div className="navbar-menu-backdrop" onClick={() => setMenuOpen(false)} />
            <div className="navbar-menu" role="menu">
              <button className="navbar-menu-item" onClick={goProfile}>
                Профиль
              </button>
              <button className="navbar-menu-item danger" onClick={handleLogout}>
                Выйти
              </button>
            </div>
          </>
        )}
      </div>
    </header>
  );
}
