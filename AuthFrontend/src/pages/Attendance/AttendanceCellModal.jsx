import { useState } from "react";
import { markAttendance, deleteAttendance, getScreenshotBlob } from "../../api/authApi";
import { toApiTime, toInputTime, STATUS } from "../../constants/attendance";

// instant — сохраняется одним нажатием; иначе раскрывается доп. поле.
const BUTTONS = [
  { status: "OnTime", instant: true },
  { status: "Worked", instant: true },
  { status: "Late", instant: false },
  { status: "Excused", instant: false },
  { status: "ToWork", instant: false },
  { status: "DayOff", instant: true },
];

const REVEAL = ["Late", "Excused", "ToWork"];

export default function AttendanceCellModal({ cell, onClose, onSaved }) {
  const rec = cell.record;
  const [mode, setMode] = useState(REVEAL.includes(rec?.status) ? rec.status : null);
  const [arrivalTime, setArrivalTime] = useState(toInputTime(rec?.arrivalTime));
  const [comment, setComment] = useState(rec?.comment || "");
  const [hours, setHours] = useState(rec?.assignedHours != null ? String(rec.assignedHours) : "");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  const submit = async (payload) => {
    setError("");
    setBusy(true);
    try {
      await markAttendance({ employeeId: cell.employeeId, date: cell.date, ...payload });
      await onSaved();
      onClose();
    } catch (err) {
      setError(err.response?.data?.message || "Не удалось сохранить.");
      setBusy(false);
    }
  };

  const clear = async () => {
    if (!rec) return onClose();
    setBusy(true);
    try {
      await deleteAttendance(rec.id);
      await onSaved();
      onClose();
    } catch (err) {
      setError(err.response?.data?.message || "Не удалось очистить.");
      setBusy(false);
    }
  };

  const onButton = (btn) => {
    if (busy) return;
    if (btn.instant) {
      submit({ status: btn.status, comment: null });
    } else {
      setMode(btn.status);
      setError("");
    }
  };

  const saveMode = () => {
    if (mode === "Late" && !arrivalTime) {
      setError("Укажите время прихода (опоздание).");
      return;
    }
    if (mode === "ToWork") {
      const h = Number(hours);
      if (!h || h <= 0) {
        setError("Укажите количество часов.");
        return;
      }
      submit({ status: "ToWork", assignedHours: h });
      return;
    }
    submit({
      status: mode,
      arrivalTime: arrivalTime ? toApiTime(arrivalTime) : null,
      comment: comment || null,
    });
  };

  const openShot = async (id) => {
    try {
      const { data } = await getScreenshotBlob(id);
      window.open(URL.createObjectURL(data), "_blank", "noopener");
    } catch {
      setError("Не удалось открыть скриншот.");
    }
  };

  const isActive = (btn) =>
    btn.instant ? mode === null && rec?.status === btn.status : mode === btn.status;

  const hasReport = rec && (rec.taskNames || (rec.screenshots && rec.screenshots.length > 0));

  return (
    <div className="att-modal-backdrop" onClick={onClose}>
      <div className="att-modal" onClick={(e) => e.stopPropagation()}>
        <h3>{cell.employeeName}</h3>
        <div className="att-modal-date">{cell.dateLabel}</div>

        {hasReport && (
          <div className="att-report">
            <div className="att-report-title">Отчёт сотрудника</div>
            {rec.taskNames && <p className="att-report-tasks">{rec.taskNames}</p>}
            {rec.screenshots?.length > 0 && (
              <div className="att-report-shots">
                {rec.screenshots.map((s) => (
                  <button type="button" key={s.id} className="att-shot" onClick={() => openShot(s.id)} title={s.originalName}>
                    📎 {s.originalName.length > 14 ? s.originalName.slice(0, 12) + "…" : s.originalName}
                  </button>
                ))}
              </div>
            )}
          </div>
        )}

        <div className="att-btn-grid">
          {BUTTONS.map((btn) => {
            const meta = STATUS[btn.status];
            const active = isActive(btn);
            return (
              <button
                key={btn.status}
                type="button"
                className={`att-status-btn${active ? " active" : ""}`}
                disabled={busy}
                onClick={() => onButton(btn)}
                style={{
                  borderColor: meta.color,
                  background: active ? meta.bg : "transparent",
                  color: meta.color,
                }}
              >
                {meta.label}
              </button>
            );
          })}
        </div>

        {mode === "Late" && (
          <div className="att-mode-fields">
            <label>Время прихода (опоздание)</label>
            <input type="time" value={arrivalTime} onChange={(e) => setArrivalTime(e.target.value)} autoFocus />
          </div>
        )}

        {mode === "Excused" && (
          <div className="att-mode-fields">
            <label>Время прихода (если был)</label>
            <input type="time" value={arrivalTime} onChange={(e) => setArrivalTime(e.target.value)} />
            <label>Причина</label>
            <input type="text" value={comment} placeholder="напр. к врачу" onChange={(e) => setComment(e.target.value)} />
          </div>
        )}

        {mode === "ToWork" && (
          <div className="att-mode-fields">
            <label>Сколько часов нужно отработать</label>
            <input
              type="number"
              min="1"
              max="24"
              value={hours}
              placeholder="напр. 8"
              onChange={(e) => setHours(e.target.value)}
              autoFocus
            />
          </div>
        )}

        {error && <p className="att-modal-error">{error}</p>}

        <div className="att-modal-actions">
          {rec && (
            <button className="att-btn-clear" onClick={clear} disabled={busy}>Очистить</button>
          )}
          <div className="att-modal-actions-right">
            <button className="att-btn-secondary" onClick={onClose} disabled={busy}>Отмена</button>
            {mode && (
              <button className="att-btn-primary" onClick={saveMode} disabled={busy}>
                {busy ? "..." : "Сохранить"}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
