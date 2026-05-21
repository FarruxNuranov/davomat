import { useState } from "react";
import { toApiTime, toInputTime } from "../../constants/attendance";

const empty = {
  firstName: "",
  lastName: "",
  phoneNumber: "",
  position: "",
  workStartTime: "",
  workEndTime: "",
  loginEmail: "",
  loginPassword: "",
};

export default function EmployeeModal({ employee, onClose, onSubmit }) {
  const isEdit = Boolean(employee);
  const [form, setForm] = useState(
    isEdit
      ? {
          firstName: employee.firstName,
          lastName: employee.lastName,
          phoneNumber: employee.phoneNumber,
          position: employee.position,
          workStartTime: toInputTime(employee.workStartTime),
          workEndTime: toInputTime(employee.workEndTime),
          loginEmail: employee.loginEmail || "",
          loginPassword: "",
        }
      : empty
  );
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const onChange = (e) => setForm({ ...form, [e.target.name]: e.target.value });

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");

    if ((form.workStartTime && !form.workEndTime) || (!form.workStartTime && form.workEndTime)) {
      setError("Укажите и начало, и конец индивидуального графика — либо оставьте оба пустыми.");
      return;
    }
    if (form.workStartTime && form.workEndTime && form.workEndTime <= form.workStartTime) {
      setError("Конец рабочего дня должен быть позже начала.");
      return;
    }

    setSubmitting(true);
    try {
      await onSubmit({
        firstName: form.firstName,
        lastName: form.lastName,
        phoneNumber: form.phoneNumber,
        position: form.position,
        workStartTime: toApiTime(form.workStartTime),
        workEndTime: toApiTime(form.workEndTime),
        loginEmail: form.loginEmail.trim() || null,
        loginPassword: form.loginPassword.trim() || null,
      });
      onClose();
    } catch (err) {
      const status = err.response?.status;
      setError(
        err.response?.data?.message ||
          (status === 409 ? "Конфликт данных" : status === 400 ? "Проверьте корректность данных" : "Не удалось сохранить")
      );
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <form className="modal" onClick={(e) => e.stopPropagation()} onSubmit={handleSubmit}>
        <h2>{isEdit ? "Редактировать сотрудника" : "Новый сотрудник"}</h2>

        <label>Имя</label>
        <input name="firstName" value={form.firstName} onChange={onChange} required />

        <label>Фамилия</label>
        <input name="lastName" value={form.lastName} onChange={onChange} required />

        <label>Телефон</label>
        <input name="phoneNumber" value={form.phoneNumber} onChange={onChange} required placeholder="+998 90 123 45 67" />

        <label>Должность</label>
        <input name="position" value={form.position} onChange={onChange} required placeholder="Менеджер, разработчик..." />

        <label>Индивидуальный график (необязательно)</label>
        <div className="modal-time-row">
          <input type="time" name="workStartTime" value={form.workStartTime} onChange={onChange} />
          <span>—</span>
          <input type="time" name="workEndTime" value={form.workEndTime} onChange={onChange} />
        </div>
        <p className="modal-hint">Если не задано — используется график из настроек.</p>

        <label>Вход сотрудника (необязательно)</label>
        <input
          type="email"
          name="loginEmail"
          value={form.loginEmail}
          onChange={onChange}
          placeholder="email для входа"
          autoComplete="off"
        />
        <input
          type="password"
          name="loginPassword"
          value={form.loginPassword}
          onChange={onChange}
          placeholder={employee?.hasLogin ? "пароль · пусто = не менять" : "пароль (мин. 8 символов)"}
          autoComplete="new-password"
        />
        <p className="modal-hint">Сотрудник войдёт с этим email/паролем и увидит только свой календарь.</p>

        {error && <p className="modal-error">{error}</p>}

        <div className="modal-actions">
          <button type="button" className="btn-secondary" onClick={onClose} disabled={submitting}>Отмена</button>
          <button type="submit" disabled={submitting}>
            {submitting ? "Сохранение..." : isEdit ? "Сохранить" : "Создать"}
          </button>
        </div>
      </form>
    </div>
  );
}
