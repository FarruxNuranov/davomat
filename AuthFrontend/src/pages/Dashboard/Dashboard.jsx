import { useEffect, useState } from "react";
import { getEmployees, getAttendanceByDate, getAttendanceRange } from "../../api/authApi";
import { STATUS } from "../../constants/attendance";
import Dropdown from "../../components/Dropdown";
import "./Dashboard.css";

const MONTHS = [
  "Январь", "Февраль", "Март", "Апрель", "Май", "Июнь",
  "Июль", "Август", "Сентябрь", "Октябрь", "Ноябрь", "Декабрь",
];
const pad = (n) => String(n).padStart(2, "0");
const dateStr = (y, m, d) => `${y}-${pad(m + 1)}-${pad(d)}`;
const todayLocal = () => {
  const d = new Date();
  return new Date(d.getTime() - d.getTimezoneOffset() * 60000).toISOString().slice(0, 10);
};

const STATUS_KEYS = Object.keys(STATUS);

function countByStatus(items) {
  const c = {};
  for (const k of STATUS_KEYS) c[k] = 0;
  for (const it of items) if (it.status && it.status in c) c[it.status]++;
  return c;
}

function Bars({ counts }) {
  const max = Math.max(1, ...STATUS_KEYS.map((k) => counts[k] || 0));
  return (
    <div className="dash-bars">
      {STATUS_KEYS.map((k) => (
        <div className="dash-bar-row" key={k}>
          <span className="dash-bar-label">{STATUS[k].label}</span>
          <div className="dash-bar-track">
            <div
              className="dash-bar-fill"
              style={{ width: `${((counts[k] || 0) / max) * 100}%`, background: STATUS[k].color }}
            />
          </div>
          <span className="dash-bar-num">{counts[k] || 0}</span>
        </div>
      ))}
    </div>
  );
}

export default function Dashboard() {
  const user = JSON.parse(localStorage.getItem("user") || "{}");
  const name = [user.firstName, user.lastName].filter(Boolean).join(" ") || "пользователь";

  const now = new Date();
  const [year, setYear] = useState(now.getFullYear());
  const [month, setMonth] = useState(now.getMonth());
  const [employees, setEmployees] = useState([]);
  const [today, setToday] = useState([]);
  const [monthRecords, setMonthRecords] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const years = [now.getFullYear() - 2, now.getFullYear() - 1, now.getFullYear(), now.getFullYear() + 1];

  useEffect(() => {
    let active = true;
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setLoading(true);
    (async () => {
      try {
        const from = dateStr(year, month, 1);
        const to = dateStr(year, month, new Date(year, month + 1, 0).getDate());
        const [emp, day, range] = await Promise.all([
          getEmployees(),
          getAttendanceByDate(todayLocal()),
          getAttendanceRange(from, to),
        ]);
        if (!active) return;
        setEmployees(emp.data);
        setToday(day.data);
        setMonthRecords(range.data);
        setError("");
      } catch (err) {
        if (active) setError(err.response?.data?.message || "Не удалось загрузить статистику");
      } finally {
        if (active) setLoading(false);
      }
    })();
    return () => {
      active = false;
    };
  }, [year, month]);

  const total = employees.length;
  const todayCounts = countByStatus(today);
  const todayMarked = today.filter((r) => r.status).length;
  const monthCounts = countByStatus(monthRecords);

  // Топ опаздывающих за месяц.
  const lateByEmp = {};
  for (const r of monthRecords) if (r.status === "Late") lateByEmp[r.employeeId] = (lateByEmp[r.employeeId] || 0) + 1;
  const empName = (id) => {
    const e = employees.find((x) => x.id === id);
    return e ? `${e.lastName} ${e.firstName}`.trim() : `#${id}`;
  };
  const topLate = Object.entries(lateByEmp)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5);

  return (
    <div className="dash">
      <div className="dash-hero">
        <h1>Добро пожаловать, {name}</h1>
        <p>Вы вошли как {user.email}</p>
      </div>

      {error && <p className="dash-error">{error}</p>}

      <div className="dash-kpis">
        <div className="dash-kpi">
          <span className="dash-kpi-value">{total}</span>
          <span className="dash-kpi-label">Сотрудников</span>
        </div>
        <div className="dash-kpi">
          <span className="dash-kpi-value">{todayMarked}<span className="dash-kpi-sub">/{total}</span></span>
          <span className="dash-kpi-label">Отмечено сегодня</span>
        </div>
        <div className="dash-kpi">
          <span className="dash-kpi-value" style={{ color: "#b45309" }}>{todayCounts.Late || 0}</span>
          <span className="dash-kpi-label">Опоздали сегодня</span>
        </div>
        <div className="dash-kpi">
          <span className="dash-kpi-value" style={{ color: "#b91c1c" }}>{monthCounts.Absent || 0}</span>
          <span className="dash-kpi-label">Прогулов за месяц</span>
        </div>
      </div>

      <div className="dash-controls">
        <span className="dash-controls-label">Статистика за месяц:</span>
        <Dropdown ariaLabel="Месяц" value={month} onChange={setMonth} options={MONTHS.map((m, i) => ({ value: i, label: m }))} />
        <Dropdown ariaLabel="Год" value={year} onChange={setYear} options={years.map((y) => ({ value: y, label: String(y) }))} />
      </div>

      {loading ? (
        <p>Загрузка...</p>
      ) : (
        <div className="dash-grid">
          <div className="dash-card">
            <h2>Сегодня</h2>
            <Bars counts={todayCounts} />
            <p className="dash-note">Не отмечено: {total - todayMarked}</p>
          </div>

          <div className="dash-card">
            <h2>За {MONTHS[month]} {year}</h2>
            <Bars counts={monthCounts} />
          </div>

          <div className="dash-card">
            <h2>Топ опаздывающих за месяц</h2>
            {topLate.length === 0 ? (
              <p className="dash-note">Опозданий нет 🎉</p>
            ) : (
              <ol className="dash-top">
                {topLate.map(([id, cnt]) => (
                  <li key={id}>
                    <span>{empName(Number(id))}</span>
                    <span className="dash-top-cnt">{cnt}</span>
                  </li>
                ))}
              </ol>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
