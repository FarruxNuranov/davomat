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

// Сильный пароль без неоднозначных символов.
function genPassword(len = 12) {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789@#$%";
  const rnd = crypto.getRandomValues(new Uint32Array(len));
  let p = "";
  for (let i = 0; i < len; i++) p += chars[rnd[i] % chars.length];
  return p;
}

function CredRow({ label, value }) {
  const [copied, setCopied] = useState(false);
  const copy = async () => {
    try {
      await navigator.clipboard.writeText(value);
      setCopied(true);
      setTimeout(() => setCopied(false), 1200);
    } catch {
      /* буфер недоступен */
    }
  };
  return (
    <div className="cred-row">
      <div className="cred-text">
        <span className="cred-label">{label}</span>
        <span className="cred-value">{value}</span>
      </div>
      <button type="button" className="cred-copy" onClick={copy}>
        {copied ? "✓" : "Копировать"}
      </button>
    </div>
  );
}

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
  const [creds, setCreds] = useState(null); // листок с данными для входа

  const onChange = (e) => setForm({ ...form, [e.target.name]: e.target.value });

  // При вводе email впервые — авто-генерируем пароль.
  const onLoginEmailChange = (e) => {
    const value = e.target.value;
    setForm((f) => ({
      ...f,
      loginEmail: value,
      loginPassword: value && !f.loginPassword ? genPassword() : f.loginPassword,
    }));
  };

  const regenerate = () => setForm((f) => ({ ...f, loginPassword: genPassword() }));

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
      const payload = {
        firstName: form.firstName,
        lastName: form.lastName,
        phoneNumber: form.phoneNumber,
        position: form.position,
        workStartTime: toApiTime(form.workStartTime),
        workEndTime: toApiTime(form.workEndTime),
        loginEmail: form.loginEmail.trim() || null,
        loginPassword: form.loginPassword.trim() || null,
      };
      await onSubmit(payload);

      // Если задали логин с паролем — показываем листок для копирования.
      if (payload.loginEmail && payload.loginPassword) {
        setCreds({
          name: `${form.firstName} ${form.lastName}`.trim(),
          email: payload.loginEmail,
          password: payload.loginPassword,
        });
      } else {
        onClose();
      }
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

  const copyAll = async () => {
    const text = `Сотрудник: ${creds.name}\nЛогин: ${creds.email}\nПароль: ${creds.password}`;
    try {
      await navigator.clipboard.writeText(text);
    } catch {
      /* буфер недоступен */
    }
  };

  // ===== Листок с данными для входа =====
  if (creds) {
    return (
      <div className="modal-backdrop" onClick={onClose}>
        <div className="modal" onClick={(e) => e.stopPropagation()}>
          <h2>Данные для входа</h2>
          <p className="modal-hint">Передайте сотруднику. Пароль больше не будет показан — скопируйте сейчас.</p>

          <CredRow label="Сотрудник" value={creds.name} />
          <CredRow label="Логин (email)" value={creds.email} />
          <CredRow label="Пароль" value={creds.password} />

          <button type="button" className="cred-copy-all" onClick={copyAll}>Скопировать всё</button>

          <div className="modal-actions">
            <button type="button" onClick={onClose}>Готово</button>
          </div>
        </div>
      </div>
    );
  }

  // ===== Форма сотрудника =====
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
          onChange={onLoginEmailChange}
          placeholder="email для входа"
          autoComplete="off"
        />
        <div className="modal-time-row">
          <input
            type="text"
            value={form.loginPassword}
            readOnly
            placeholder={employee?.hasLogin ? "пароль не меняется" : "появится после ввода email"}
          />
          <button type="button" className="row-btn" onClick={regenerate} title="Сгенерировать пароль">🎲</button>
        </div>
        <p className="modal-hint">
          Пароль генерируется автоматически. После сохранения покажем листок с логином и паролем.
        </p>

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
