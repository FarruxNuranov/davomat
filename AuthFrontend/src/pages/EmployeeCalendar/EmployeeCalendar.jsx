import { useCallback, useEffect, useState } from "react";
import { getMyAttendance } from "../../api/authApi";
import { statusMeta } from "../../constants/attendance";
import Dropdown from "../../components/Dropdown";
import EmployeeFulfillModal from "./EmployeeFulfillModal";
import "./EmployeeCalendar.css";

const MONTHS = [
  "Январь", "Февраль", "Март", "Апрель", "Май", "Июнь",
  "Июль", "Август", "Сентябрь", "Октябрь", "Ноябрь", "Декабрь",
];
const WEEKDAYS = ["Вс", "Пн", "Вт", "Ср", "Чт", "Пт", "Сб"];
const pad = (n) => String(n).padStart(2, "0");
const dateStr = (y, m, d) => `${y}-${pad(m + 1)}-${pad(d)}`;

export default function EmployeeCalendar() {
  const [year, setYear] = useState(() => new Date().getFullYear());
  const [month, setMonth] = useState(() => new Date().getMonth());
  const [byDate, setByDate] = useState({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [active, setActive] = useState(null);

  const currentYear = new Date().getFullYear();
  const years = [currentYear - 2, currentYear - 1, currentYear, currentYear + 1];

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const from = dateStr(year, month, 1);
      const to = dateStr(year, month, new Date(year, month + 1, 0).getDate());
      const { data } = await getMyAttendance(from, to);
      const map = {};
      for (const r of data) map[r.date] = r;
      setByDate(map);
    } catch (err) {
      setError(err.response?.data?.message || "Не удалось загрузить календарь");
    } finally {
      setLoading(false);
    }
  }, [year, month]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    load();
  }, [load]);

  const todayStr = dateStr(new Date().getFullYear(), new Date().getMonth(), new Date().getDate());
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const days = Array.from({ length: daysInMonth }, (_, i) => {
    const day = i + 1;
    const dow = new Date(year, month, day).getDay();
    return { day, dow, ds: dateStr(year, month, day) };
  });

  return (
    <div className="empc-page">
      <div className="empc-header">
        <h1>Мой календарь</h1>
        <div className="empc-controls">
          <Dropdown ariaLabel="Месяц" value={month} onChange={setMonth} options={MONTHS.map((m, i) => ({ value: i, label: m }))} />
          <Dropdown ariaLabel="Год" value={year} onChange={setYear} options={years.map((y) => ({ value: y, label: String(y) }))} />
        </div>
      </div>

      {error && <p className="empc-page-error">{error}</p>}

      {loading ? (
        <p>Загрузка...</p>
      ) : (
        <div className="empc-list">
          {days.map((d) => {
            const rec = byDate[d.ds];
            const meta = rec ? statusMeta(rec.status) : null;
            const isToWork = rec?.status === "ToWork";
            const clickable = rec && (isToWork || rec.status === "Worked");
            const cls = [
              "empc-row",
              d.dow === 0 ? "sunday" : d.dow === 6 ? "weekend" : "",
              d.ds === todayStr ? "today" : "",
              isToWork ? "towork" : "",
              clickable ? "clickable" : "",
            ].join(" ").trim();

            return (
              <div
                key={d.ds}
                className={cls}
                onClick={clickable ? () => setActive(rec) : undefined}
              >
                <div className="empc-date">
                  <span className="empc-daynum">{pad(d.day)}</span>
                  <span className="empc-dow">{WEEKDAYS[d.dow]}</span>
                </div>

                <div className="empc-status">
                  {rec ? (
                    <>
                      <span className="status-badge" style={{ color: meta.color, background: meta.bg }}>
                        {meta.label}
                      </span>
                      {rec.assignedHours != null && <span className="empc-hours-tag">{rec.assignedHours} ч</span>}
                      {rec.arrivalTime && <span className="empc-arr">приход {rec.arrivalTime.slice(0, 5)}</span>}
                    </>
                  ) : (
                    <span className="empc-none">—</span>
                  )}
                </div>

                {isToWork && <span className="empc-cta">Выполнить →</span>}
                {rec?.status === "Worked" && <span className="empc-cta done">Открыть</span>}
              </div>
            );
          })}
        </div>
      )}

      {active && (
        <EmployeeFulfillModal record={active} onClose={() => setActive(null)} onDone={load} />
      )}
    </div>
  );
}
