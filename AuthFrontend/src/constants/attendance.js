// Статусы давомата. Значения совпадают с enum AttendanceStatus на бэкенде
// (сериализуются как строки благодаря JsonStringEnumConverter).

export const STATUS = {
  OnTime: { label: "Вовремя", color: "#15803d", bg: "rgba(34,197,94,0.12)" },
  Late: { label: "Опоздал", color: "#b45309", bg: "rgba(245,158,11,0.14)" },
  Excused: { label: "Отпросился", color: "#0369a1", bg: "rgba(14,165,233,0.12)" },
  Absent: { label: "Отсутствовал", color: "#b91c1c", bg: "rgba(239,68,68,0.10)" },
  LeftEarly: { label: "Ушёл раньше", color: "#6d28d9", bg: "rgba(139,92,246,0.12)" },
  DayOff: { label: "Выходной", color: "#475569", bg: "rgba(100,116,139,0.12)" },
  Worked: { label: "Отработано", color: "#0d9488", bg: "rgba(13,148,136,0.12)" },
  ToWork: { label: "Должен отработать", color: "#ca8a04", bg: "rgba(234,179,8,0.16)" },
};

// Статусы, которые проставляются вручную (не вычисляются по времени прихода).
export const MANUAL_STATUSES = ["Excused", "Absent", "LeftEarly"];

export const NOT_MARKED = { label: "Не отмечен", color: "#64748b", bg: "rgba(100,116,139,0.12)" };

export const statusMeta = (status) => STATUS[status] ?? NOT_MARKED;

// Перевод "HH:mm" из <input type="time"> в "HH:mm:ss" для API (TimeOnly).
export const toApiTime = (hhmm) => (hhmm ? `${hhmm}:00` : null);

// Перевод "HH:mm:ss" из API в "HH:mm" для <input type="time"> и отображения.
export const toInputTime = (apiTime) => (apiTime ? apiTime.slice(0, 5) : "");
