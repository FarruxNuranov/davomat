import { useEffect, useState } from "react";
import {
  getMe,
  changePassword,
  webauthnRegisterBegin,
  webauthnRegisterComplete,
  webauthnStatus,
  webauthnRemove,
} from "../../api/authApi";
import { supportsWebAuthn, createCredential } from "../../utils/webauthn";

const cardStyle = {
  background: "var(--surface)",
  border: "1px solid var(--border)",
  borderRadius: 14,
  padding: 26,
  boxShadow: "var(--shadow-sm)",
  maxWidth: 480,
  display: "grid",
  gap: 14,
};

const inputStyle = {
  padding: "10px 12px",
  border: "1px solid var(--border-strong)",
  background: "var(--surface-2)",
  color: "var(--text)",
  borderRadius: 10,
  fontSize: 14,
  fontFamily: "inherit",
  outline: "none",
};

const primaryBtn = {
  background: "var(--accent-grad)",
  color: "#fff",
  border: "none",
  borderRadius: 10,
  padding: "11px 18px",
  fontWeight: 600,
  fontSize: 14,
  fontFamily: "inherit",
  cursor: "pointer",
  width: "fit-content",
  boxShadow: "0 5px 14px rgba(37,99,235,.24)",
};

function Row({ label, value }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
      <span style={{ fontSize: 11, textTransform: "uppercase", letterSpacing: "0.6px", color: "var(--text-3)", fontWeight: 600 }}>
        {label}
      </span>
      <b style={{ fontSize: 15, color: "var(--text)", fontWeight: 600 }}>{value}</b>
    </div>
  );
}

export default function Profile() {
  const [user, setUser] = useState(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const [count, setCount] = useState(0);
  const [fpBusy, setFpBusy] = useState(false);
  const [fpMsg, setFpMsg] = useState(null);

  const [pw, setPw] = useState({ cur: "", nw: "", confirm: "" });
  const [pwBusy, setPwBusy] = useState(false);
  const [pwMsg, setPwMsg] = useState(null);

  const changePwd = async (e) => {
    e.preventDefault();
    setPwMsg(null);
    if (pw.nw.length < 8) {
      setPwMsg({ ok: false, text: "Новый пароль не короче 8 символов." });
      return;
    }
    if (pw.nw !== pw.confirm) {
      setPwMsg({ ok: false, text: "Пароли не совпадают." });
      return;
    }
    setPwBusy(true);
    try {
      await changePassword({ currentPassword: pw.cur, newPassword: pw.nw });
      setPw({ cur: "", nw: "", confirm: "" });
      setPwMsg({ ok: true, text: "Пароль изменён ✓" });
    } catch (err) {
      setPwMsg({ ok: false, text: err.response?.data?.message || "Не удалось сменить пароль." });
    } finally {
      setPwBusy(false);
    }
  };

  useEffect(() => {
    getMe()
      .then(({ data }) => {
        setUser(data);
        if (supportsWebAuthn()) {
          webauthnStatus().then(({ data: s }) => setCount(s.count)).catch(() => {});
        }
      })
      .catch((err) => setError(err.response?.status === 401 ? "Не авторизован" : "Не удалось загрузить"))
      .finally(() => setLoading(false));
  }, []);

  const addFingerprint = async () => {
    setFpMsg(null);
    setFpBusy(true);
    try {
      const { data: options } = await webauthnRegisterBegin();
      const att = await createCredential(options);
      await webauthnRegisterComplete(att);
      const { data: s } = await webauthnStatus();
      setCount(s.count);
      setFpMsg({ ok: true, text: "Отпечаток привязан ✓" });
    } catch (err) {
      if (err?.name !== "NotAllowedError" && err?.name !== "AbortError") {
        setFpMsg({ ok: false, text: err.response?.data?.message || "Не удалось привязать отпечаток." });
      }
    } finally {
      setFpBusy(false);
    }
  };

  const removeFingerprint = async () => {
    if (!window.confirm("Удалить все привязанные отпечатки?")) return;
    setFpBusy(true);
    setFpMsg(null);
    try {
      await webauthnRemove();
      setCount(0);
      setFpMsg({ ok: true, text: "Отпечатки удалены." });
    } catch {
      setFpMsg({ ok: false, text: "Не удалось удалить." });
    } finally {
      setFpBusy(false);
    }
  };

  if (loading) return <p>Загрузка...</p>;
  if (error) return <p style={{ color: "#dc2626" }}>{error}</p>;

  const showFp = supportsWebAuthn();

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
      <h1 style={{ fontSize: 26, fontWeight: 700, letterSpacing: "-0.5px", margin: 0 }}>Профиль</h1>

      <div style={cardStyle}>
        <Row label="ID" value={user.id} />
        <Row label="Имя" value={user.firstName} />
        <Row label="Фамилия" value={user.lastName} />
        <Row label="Телефон" value={user.phoneNumber} />
        <Row label="Email" value={user.email} />
        <Row label="Роль" value={user.role === "Admin" ? "Администратор" : "Сотрудник"} />
        <Row label="Создан" value={new Date(user.createdAt).toLocaleString()} />
      </div>

      <form style={cardStyle} onSubmit={changePwd}>
        <b style={{ fontSize: 16 }}>Сменить пароль</b>
        <input
          type="password"
          placeholder="Текущий пароль"
          value={pw.cur}
          onChange={(e) => setPw({ ...pw, cur: e.target.value })}
          required
          autoComplete="current-password"
          style={inputStyle}
        />
        <input
          type="password"
          placeholder="Новый пароль (мин. 8 символов)"
          value={pw.nw}
          onChange={(e) => setPw({ ...pw, nw: e.target.value })}
          required
          minLength={8}
          autoComplete="new-password"
          style={inputStyle}
        />
        <input
          type="password"
          placeholder="Повторите новый пароль"
          value={pw.confirm}
          onChange={(e) => setPw({ ...pw, confirm: e.target.value })}
          required
          autoComplete="new-password"
          style={inputStyle}
        />
        {pwMsg && <p style={{ margin: 0, fontSize: 14, color: pwMsg.ok ? "#15803d" : "#dc2626" }}>{pwMsg.text}</p>}
        <button type="submit" disabled={pwBusy} style={{ ...primaryBtn, opacity: pwBusy ? 0.6 : 1 }}>
          {pwBusy ? "..." : "Сменить пароль"}
        </button>
      </form>

      {showFp && (
        <div style={cardStyle}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12 }}>
            <b style={{ fontSize: 16 }}>🔑 Вход по отпечатку</b>
            <span
              style={{
                fontSize: 12,
                fontWeight: 600,
                padding: "4px 10px",
                borderRadius: 999,
                color: count > 0 ? "#15803d" : "var(--text-3)",
                background: count > 0 ? "rgba(34,197,94,0.12)" : "var(--surface-2)",
              }}
            >
              {count > 0 ? `Привязано: ${count}` : "Не привязано"}
            </span>
          </div>
          <p style={{ margin: 0, color: "var(--text-2)", fontSize: 14 }}>
            Привяжите Touch ID / отпечаток на этом устройстве, чтобы входить без пароля.
          </p>

          {fpMsg && (
            <p style={{ margin: 0, fontSize: 14, color: fpMsg.ok ? "#15803d" : "#dc2626" }}>{fpMsg.text}</p>
          )}

          <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
            <button
              onClick={addFingerprint}
              disabled={fpBusy}
              style={{
                background: "var(--accent-grad)",
                color: "#fff",
                border: "none",
                borderRadius: 10,
                padding: "11px 18px",
                fontWeight: 600,
                fontSize: 14,
                fontFamily: "inherit",
                cursor: fpBusy ? "not-allowed" : "pointer",
                opacity: fpBusy ? 0.6 : 1,
                boxShadow: "0 5px 14px rgba(37,99,235,.24)",
              }}
            >
              {fpBusy ? "..." : "Добавить отпечаток"}
            </button>
            {count > 0 && (
              <button
                onClick={removeFingerprint}
                disabled={fpBusy}
                style={{
                  background: "var(--surface)",
                  color: "#dc2626",
                  border: "1px solid #fecaca",
                  borderRadius: 10,
                  padding: "11px 18px",
                  fontWeight: 600,
                  fontSize: 14,
                  fontFamily: "inherit",
                  cursor: "pointer",
                }}
              >
                Удалить
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
