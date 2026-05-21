import { useEffect, useState } from "react";
import { getEmployees, getAttendanceRange } from "../../api/authApi";
import { STATUS } from "../../constants/attendance";
import Dropdown from "../../components/Dropdown";
import "./Summary.css";

const MONTHS = [
  "Январь", "Февраль", "Март", "Апрель", "Май", "Июнь",
  "Июль", "Август", "Сентябрь", "Октябрь", "Ноябрь", "Декабрь",
];

const pad = (n) => String(n).padStart(2, "0");
const dateStr = (y, m, d) => `${y}-${pad(m + 1)}-${pad(d)}`;

const emptyCounts = () => ({
  OnTime: 0, Late: 0, Excused: 0, Absent: 0, LeftEarly: 0, DayOff: 0, Worked: 0,
});

export default function Summary() {
  const [year, setYear] = useState(() => new Date().getFullYear());
  const [month, setMonth] = useState(() => new Date().getMonth());
  const [employees, setEmployees] = useState([]);
  const [records, setRecords] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const currentYear = new Date().getFullYear();
  const years = [currentYear - 2, currentYear - 1, currentYear, currentYear + 1];

  useEffect(() => {
    let active = true;
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setLoading(true);
    (async () => {
      try {
        const from = dateStr(year, month, 1);
        const to = dateStr(year, month, new Date(year, month + 1, 0).getDate());
        const [emp, att] = await Promise.all([getEmployees(), getAttendanceRange(from, to)]);
        if (!active) return;
        setEmployees(emp.data);
        setRecords(att.data);
        setError("");
      } catch (err) {
        if (active) setError(err.response?.data?.message || "Не удалось загрузить итоги");
      } finally {
        if (active) setLoading(false);
      }
    })();
    return () => {
      active = false;
    };
  }, [year, month]);

  const summary = {};
  for (const e of employees) summary[e.id] = emptyCounts();
  for (const r of records) {
    const counts = summary[r.employeeId];
    if (counts && r.status in counts) counts[r.status] += 1;
  }

  return (
    <div className="sum-page">
      <div className="sum-header">
        <h1>Итоги за месяц</h1>
        <div className="sum-controls">
          <Dropdown
            ariaLabel="Месяц"
            value={month}
            onChange={setMonth}
            options={MONTHS.map((m, i) => ({ value: i, label: m }))}
          />
          <Dropdown
            ariaLabel="Год"
            value={year}
            onChange={setYear}
            options={years.map((y) => ({ value: y, label: String(y) }))}
          />
        </div>
      </div>

      {error && <p className="sum-error">{error}</p>}

      {loading ? (
        <p>Загрузка...</p>
      ) : employees.length === 0 ? (
        <p className="sum-empty">Сотрудников нет — добавьте их в разделе «Сотрудники».</p>
      ) : (
        <div className="sum-table-wrapper">
          <table className="sum-table">
            <thead>
              <tr>
                <th>Сотрудник</th>
                {Object.keys(STATUS).map((k) => (
                  <th key={k}>{STATUS[k].label}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {employees.map((e) => (
                <tr key={e.id}>
                  <td>{e.lastName} {e.firstName}</td>
                  {Object.keys(STATUS).map((k) => {
                    const n = summary[e.id]?.[k] || 0;
                    return (
                      <td
                        key={k}
                        style={{ color: n ? STATUS[k].color : "var(--text-3)", fontWeight: n ? 700 : 400 }}
                      >
                        {n}
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
