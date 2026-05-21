import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  getEmployees,
  getAttendanceRange,
  getAttendanceAnalysis,
  sendTelegramReport,
} from "../../api/authApi";
import { statusMeta, toInputTime, STATUS } from "../../constants/attendance";
import AttendanceCellModal from "./AttendanceCellModal";
import Dropdown from "../../components/Dropdown";
import "./Attendance.css";

const MONTHS = [
  "Январь", "Февраль", "Март", "Апрель", "Май", "Июнь",
  "Июль", "Август", "Сентябрь", "Октябрь", "Ноябрь", "Декабрь",
];
const WEEKDAYS = ["Вс", "Пн", "Вт", "Ср", "Чт", "Пт", "Сб"];

const pad = (n) => String(n).padStart(2, "0");
const dateStr = (y, m, d) => `${y}-${pad(m + 1)}-${pad(d)}`;

// Короткое содержимое ячейки по статусу.
function cellText(rec) {
  switch (rec.status) {
    case "OnTime":
    case "Late":
      return toInputTime(rec.arrivalTime) || "✓";
    case "Excused":
      return "Отпр.";
    case "Absent":
      return "Нет";
    case "LeftEarly":
      return "Раньше";
    case "DayOff":
      return "Вых";
    case "Worked":
      return "Отраб.";
    case "ToWork":
      return rec.assignedHours ? `${rec.assignedHours}ч` : "Долж.";
    default:
      return "";
  }
}

export default function Attendance() {
  const now = new Date();
  const [year, setYear] = useState(now.getFullYear());
  const [month, setMonth] = useState(now.getMonth());
  const [employees, setEmployees] = useState([]);
  const [recordMap, setRecordMap] = useState({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [cell, setCell] = useState(null);

  const [analysis, setAnalysis] = useState("");
  const [aiLoading, setAiLoading] = useState(false);
  const [aiError, setAiError] = useState("");

  const [tgLoading, setTgLoading] = useState(false);
  const [tgMsg, setTgMsg] = useState(null); // { ok: boolean, text: string }

  const wrapperRef = useRef(null);
  const todayRowRef = useRef(null);
  const positionedRef = useRef(null);
  const programmaticRef = useRef(false);

  const years = useMemo(() => {
    const c = now.getFullYear();
    return [c - 2, c - 1, c, c + 1];
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const days = useMemo(() => {
    const count = new Date(year, month + 1, 0).getDate();
    return Array.from({ length: count }, (_, i) => {
      const day = i + 1;
      const dow = new Date(year, month, day).getDay();
      return { day, dow, weekend: dow === 0 || dow === 6, ds: dateStr(year, month, day) };
    });
  }, [year, month]);

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const from = dateStr(year, month, 1);
      const to = dateStr(year, month, new Date(year, month + 1, 0).getDate());
      const [emp, att] = await Promise.all([getEmployees(), getAttendanceRange(from, to)]);
      setEmployees(emp.data);
      const map = {};
      for (const r of att.data) map[`${r.employeeId}_${r.date}`] = r;
      setRecordMap(map);
    } catch (err) {
      setError(err.response?.data?.message || "Не удалось загрузить давомат");
    } finally {
      setLoading(false);
    }
  }, [year, month]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    load();
  }, [load]);

  const todayStr = dateStr(now.getFullYear(), now.getMonth(), now.getDate());

  // Скролл запоминается на каждый месяц (только ручная прокрутка).
  const scrollKey = `att-scroll-v2-${year}-${month}`;

  // Позиционируем один раз на каждый месяц: если есть сохранённая ручная
  // прокрутка — восстанавливаем её, иначе по умолчанию встаём на сегодня.
  // Действия (отметки) месяц не меняют → текущий скролл сохраняется.
  useEffect(() => {
    if (loading) return;
    const el = wrapperRef.current;
    if (!el || positionedRef.current === scrollKey) return;
    positionedRef.current = scrollKey;

    programmaticRef.current = true;
    const saved = sessionStorage.getItem(scrollKey);
    if (saved !== null) {
      el.scrollTop = Number(saved);
    } else if (todayRowRef.current) {
      const delta =
        todayRowRef.current.getBoundingClientRect().top - el.getBoundingClientRect().top;
      el.scrollTop = Math.max(0, el.scrollTop + delta - 52);
    } else {
      el.scrollTop = 0;
    }
  }, [loading, scrollKey]);

  // Сохраняем только ручную прокрутку (программную к «сегодня» — пропускаем).
  const onScroll = (e) => {
    if (programmaticRef.current) {
      programmaticRef.current = false;
      return;
    }
    sessionStorage.setItem(scrollKey, String(e.currentTarget.scrollTop));
  };

  // Итоги месяца: счётчики статусов по каждому сотруднику.
  const summary = useMemo(() => {
    const byEmp = {};
    for (const e of employees) {
      byEmp[e.id] = { OnTime: 0, Late: 0, Excused: 0, Absent: 0, LeftEarly: 0, DayOff: 0 };
    }
    for (const key in recordMap) {
      const r = recordMap[key];
      if (byEmp[r.employeeId] && r.status in byEmp[r.employeeId]) byEmp[r.employeeId][r.status]++;
    }
    return byEmp;
  }, [employees, recordMap]);

  // Экспорт табеля за месяц в CSV (открывается в Excel).
  const exportCsv = () => {
    const cellLabel = (rec) => {
      if (!rec) return "";
      const label = STATUS[rec.status]?.label || rec.status;
      const time = rec.arrivalTime ? " " + toInputTime(rec.arrivalTime) : "";
      return label + time;
    };
    const header = ["Дата", ...employees.map((e) => `${e.lastName} ${e.firstName}`.trim())];
    const dayRows = days.map((d) => [
      `${pad(d.day)}.${pad(month + 1)} ${WEEKDAYS[d.dow]}`,
      ...employees.map((e) => cellLabel(recordMap[`${e.id}_${d.ds}`])),
    ]);
    const statusKeys = Object.keys(STATUS);
    const totalRows = statusKeys.map((k) => [
      STATUS[k].label,
      ...employees.map((e) => summary[e.id]?.[k] || 0),
    ]);
    const matrix = [header, ...dayRows, [], ["ИТОГО за месяц"], ...totalRows];
    const csv =
      "﻿" +
      matrix
        .map((row) => row.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(";"))
        .join("\r\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `davomat-${year}-${pad(month + 1)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const runAnalysis = async () => {
    setAiError("");
    setAnalysis("");
    setAiLoading(true);
    try {
      const { data } = await getAttendanceAnalysis(year, month + 1);
      setAnalysis(data.analysis);
    } catch (err) {
      setAiError(
        err.response?.data?.message ||
          (err.code === "ECONNABORTED" ? "Анализ занял слишком долго." : "Не удалось получить анализ.")
      );
    } finally {
      setAiLoading(false);
    }
  };

  const sendToTelegram = async () => {
    setTgMsg(null);
    setTgLoading(true);
    try {
      const { data } = await sendTelegramReport();
      setTgMsg({ ok: true, text: data.message || "Отчёт отправлен в Telegram." });
    } catch (err) {
      setTgMsg({ ok: false, text: err.response?.data?.message || "Не удалось отправить отчёт." });
    } finally {
      setTgLoading(false);
    }
  };

  const openCell = (employee, d) => {
    const rec = recordMap[`${employee.id}_${d.ds}`] || null;
    setCell({
      employeeId: employee.id,
      employeeName: `${employee.lastName} ${employee.firstName}`,
      date: d.ds,
      dateLabel: `${pad(d.day)} ${MONTHS[month]} ${year}, ${WEEKDAYS[d.dow]}`,
      record: rec,
    });
  };

  return (
    <div className="att-page">
      <div className="att-header">
        <h1>Давомат</h1>
        <div className="att-controls">
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
          <button
            className="att-ai-btn"
            onClick={runAnalysis}
            disabled={employees.length === 0 || aiLoading}
            title="ИИ-сводка по давомату за месяц"
          >
            {aiLoading ? "Анализирую..." : "✨ ИИ-анализ"}
          </button>
          <button
            className="att-tg-btn"
            onClick={sendToTelegram}
            disabled={tgLoading}
            title="Отправить отчёт за сегодня в Telegram"
          >
            {tgLoading ? "Отправка..." : "📨 В Telegram"}
          </button>
          <button
            className="att-export-btn"
            onClick={exportCsv}
            disabled={employees.length === 0}
            title="Скачать табель за месяц (CSV для Excel)"
          >
            Экспорт
          </button>
        </div>
      </div>

      {(aiError || analysis) && (
        <div className="ai-panel">
          <div className="ai-panel-head">
            <span className="ai-panel-title">✨ ИИ-анализ · {MONTHS[month]} {year}</span>
            <button
              className="ai-panel-close"
              onClick={() => {
                setAnalysis("");
                setAiError("");
              }}
              aria-label="Закрыть"
            >
              ✕
            </button>
          </div>
          {aiError ? (
            <p className="ai-panel-error">{aiError}</p>
          ) : (
            <pre className="ai-panel-body">{analysis}</pre>
          )}
        </div>
      )}

      {error && <p className="att-error">{error}</p>}
      {tgMsg && (
        <p className={tgMsg.ok ? "att-tg-ok" : "att-error"}>{tgMsg.text}</p>
      )}

      {loading && employees.length === 0 ? (
        <p>Загрузка...</p>
      ) : employees.length === 0 ? (
        <p className="att-empty">Сотрудников нет — добавьте их в разделе «Сотрудники».</p>
      ) : (
        <div className="att-cal-wrapper" ref={wrapperRef} onScroll={onScroll}>
          <table className="att-cal">
            <thead>
              <tr>
                <th className="att-corner">Дата</th>
                {employees.map((e) => (
                  <th key={e.id} className="att-name" title={`${e.lastName} ${e.firstName} — ${e.position}`}>
                    {e.lastName}<br />
                    <span className="att-name-first">{e.firstName}</span>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {days.map((d) => (
                <tr
                  key={d.ds}
                  ref={d.ds === todayStr ? todayRowRef : null}
                  className={d.dow === 0 ? "att-sunday" : d.dow === 6 ? "att-weekend" : ""}
                >
                  <td className={`att-daycell${d.ds === todayStr ? " att-today" : ""}`}>
                    <span className="att-daynum">{pad(d.day)}</span>
                    <span className="att-dow">{WEEKDAYS[d.dow]}</span>
                  </td>
                  {employees.map((e) => {
                    const rec = recordMap[`${e.id}_${d.ds}`];
                    const meta = rec ? statusMeta(rec.status) : null;
                    return (
                      <td
                        key={e.id}
                        className="att-cell"
                        onClick={() => openCell(e, d)}
                        title={rec ? meta.label + (rec.comment ? ` · ${rec.comment}` : "") : "Отметить"}
                        style={rec ? { background: meta.bg, color: meta.color } : undefined}
                      >
                        {rec ? cellText(rec) : ""}
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {cell && (
        <AttendanceCellModal cell={cell} onClose={() => setCell(null)} onSaved={load} />
      )}
    </div>
  );
}
