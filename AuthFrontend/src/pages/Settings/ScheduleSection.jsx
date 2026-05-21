import { useEffect, useState } from "react";
import { getWorkSchedule, updateWorkSchedule } from "../../api/authApi";
import { toApiTime, toInputTime } from "../../constants/attendance";

export default function ScheduleSection() {
  const [form, setForm] = useState({ workStartTime: "", workEndTime: "", lateAfterMinutes: 0 });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    getWorkSchedule()
      .then(({ data }) =>
        setForm({
          workStartTime: toInputTime(data.workStartTime),
          workEndTime: toInputTime(data.workEndTime),
          lateAfterMinutes: data.lateAfterMinutes,
        })
      )
      .catch(() => setError("Не удалось загрузить настройки"))
      .finally(() => setLoading(false));
  }, []);

  const onChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value });
    setSaved(false);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    if (form.workEndTime <= form.workStartTime) {
      setError("Конец рабочего дня должен быть позже начала.");
      return;
    }
    setSaving(true);
    try {
      const { data } = await updateWorkSchedule({
        workStartTime: toApiTime(form.workStartTime),
        workEndTime: toApiTime(form.workEndTime),
        lateAfterMinutes: Number(form.lateAfterMinutes) || 0,
      });
      setForm({
        workStartTime: toInputTime(data.workStartTime),
        workEndTime: toInputTime(data.workEndTime),
        lateAfterMinutes: data.lateAfterMinutes,
      });
      setSaved(true);
    } catch (err) {
      setError(err.response?.data?.message || "Не удалось сохранить настройки");
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <p>Загрузка...</p>;

  return (
    <form className="settings-card" onSubmit={handleSubmit}>
      <div className="settings-section-head">
        <h2>Рабочий график</h2>
      </div>
      <p className="settings-sub">Стандартный график. Применяется к сотрудникам без индивидуального.</p>

      <div className="settings-field">
        <label>Начало рабочего дня</label>
        <input type="time" name="workStartTime" value={form.workStartTime} onChange={onChange} required />
      </div>

      <div className="settings-field">
        <label>Конец рабочего дня</label>
        <input type="time" name="workEndTime" value={form.workEndTime} onChange={onChange} required />
      </div>

      <div className="settings-field">
        <label>Допустимое опоздание, мин.</label>
        <input
          type="number"
          name="lateAfterMinutes"
          min="0"
          max="240"
          value={form.lateAfterMinutes}
          onChange={onChange}
          required
        />
        <span className="settings-hint">Приход в пределах этого времени после начала ещё «вовремя».</span>
      </div>

      {error && <p className="settings-error">{error}</p>}
      {saved && <p className="settings-ok">Сохранено ✓</p>}

      <button type="submit" disabled={saving}>{saving ? "Сохранение..." : "Сохранить"}</button>
    </form>
  );
}
