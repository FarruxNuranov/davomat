import { useState } from "react";
import ScheduleSection from "./ScheduleSection";
import AiSection from "./AiSection";
import TelegramSection from "./TelegramSection";
import "./Settings.css";

const TABS = [
  { key: "schedule", label: "Рабочий график" },
  { key: "ai", label: "ИИ-интеграция" },
  { key: "telegram", label: "Telegram" },
];

export default function Settings() {
  const [tab, setTab] = useState("schedule");

  return (
    <div className="settings-page">
      <h1>Настройки</h1>
      <div className="settings-layout">
        <nav className="settings-nav">
          {TABS.map((t) => (
            <button
              key={t.key}
              className={`settings-nav-item${tab === t.key ? " active" : ""}`}
              onClick={() => setTab(t.key)}
            >
              {t.label}
            </button>
          ))}
        </nav>
        <div className="settings-content">
          {tab === "schedule" && <ScheduleSection />}
          {tab === "ai" && <AiSection />}
          {tab === "telegram" && <TelegramSection />}
        </div>
      </div>
    </div>
  );
}
