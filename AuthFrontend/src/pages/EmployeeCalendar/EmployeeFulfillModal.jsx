import { useState } from "react";
import { fulfillAttendance, getScreenshotBlob } from "../../api/authApi";
import { statusMeta } from "../../constants/attendance";

const MAX = 5;

export default function EmployeeFulfillModal({ record, onClose, onDone }) {
  const editable = record.status === "ToWork";
  const existing = record.screenshots || [];
  const [files, setFiles] = useState([]);
  const [tasks, setTasks] = useState(record.taskNames || "");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  const slotsLeft = MAX - existing.length - files.length;

  const onPick = (e) => {
    const picked = Array.from(e.target.files || []).filter((f) => f.type.startsWith("image/"));
    setFiles((prev) => [...prev, ...picked].slice(0, MAX - existing.length));
    e.target.value = "";
  };

  const removeFile = (i) => setFiles((prev) => prev.filter((_, idx) => idx !== i));

  const openShot = async (id) => {
    try {
      const { data } = await getScreenshotBlob(id);
      window.open(URL.createObjectURL(data), "_blank", "noopener");
    } catch {
      setError("Не удалось открыть файл.");
    }
  };

  const submit = async () => {
    setError("");
    setBusy(true);
    try {
      const fd = new FormData();
      fd.append("taskNames", tasks);
      for (const f of files) fd.append("files", f);
      await fulfillAttendance(record.id, fd);
      await onDone();
      onClose();
    } catch (err) {
      setError(err.response?.data?.message || "Не удалось сохранить.");
      setBusy(false);
    }
  };

  const meta = statusMeta(record.status);

  return (
    <div className="empc-modal-backdrop" onClick={onClose}>
      <div className="empc-modal" onClick={(e) => e.stopPropagation()}>
        <div className="empc-modal-head">
          <h3>{new Date(record.date).toLocaleDateString("ru-RU", { day: "2-digit", month: "long", year: "numeric" })}</h3>
          <span className="status-badge" style={{ color: meta.color, background: meta.bg }}>{meta.label}</span>
        </div>

        {record.assignedHours != null && (
          <p className="empc-hours">Нужно отработать: <b>{record.assignedHours} ч</b></p>
        )}

        {editable ? (
          <>
            <label className="empc-label">Названия задач (Jira / YouTrack)</label>
            <textarea
              className="empc-textarea"
              rows={3}
              value={tasks}
              placeholder="PROJ-123 Сверстать форму&#10;PROJ-130 Починить баг"
              onChange={(e) => setTasks(e.target.value)}
            />

            <label className="empc-label">Скриншоты (до {MAX})</label>
            <div className="empc-thumbs">
              {existing.map((s) => (
                <button type="button" key={`e${s.id}`} className="empc-thumb existing" onClick={() => openShot(s.id)} title={s.originalName}>
                  📎
                </button>
              ))}
              {files.map((f, i) => (
                <div key={`f${i}`} className="empc-thumb">
                  <img src={URL.createObjectURL(f)} alt="" />
                  <button type="button" className="empc-thumb-x" onClick={() => removeFile(i)} aria-label="Убрать">✕</button>
                </div>
              ))}
              {slotsLeft > 0 && (
                <label className="empc-thumb empc-add">
                  +
                  <input type="file" accept="image/*" multiple hidden onChange={onPick} />
                </label>
              )}
            </div>

            {error && <p className="empc-error">{error}</p>}

            <div className="empc-actions">
              <button type="button" className="empc-btn-secondary" onClick={onClose} disabled={busy}>Отмена</button>
              <button type="button" className="empc-btn-primary" onClick={submit} disabled={busy}>
                {busy ? "Сохранение..." : "Готово"}
              </button>
            </div>
          </>
        ) : (
          <>
            {record.taskNames && (
              <>
                <label className="empc-label">Задачи</label>
                <p className="empc-tasks">{record.taskNames}</p>
              </>
            )}
            <label className="empc-label">Скриншоты</label>
            <div className="empc-thumbs">
              {existing.length === 0 && <span className="empc-empty">Нет</span>}
              {existing.map((s) => (
                <button type="button" key={s.id} className="empc-thumb existing" onClick={() => openShot(s.id)} title={s.originalName}>
                  📎
                </button>
              ))}
            </div>
            {error && <p className="empc-error">{error}</p>}
            <div className="empc-actions">
              <button type="button" className="empc-btn-primary" onClick={onClose}>Закрыть</button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
