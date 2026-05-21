import { useEffect, useState } from "react";
import { getIntegrations, updateIntegrations, sendTelegramReport } from "../../api/authApi";

export default function TelegramSection() {
  const [data, setData] = useState(null);
  const [token, setToken] = useState("");
  const [chatId, setChatId] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [testing, setTesting] = useState(false);
  const [msg, setMsg] = useState(null);

  useEffect(() => {
    getIntegrations()
      .then(({ data }) => {
        setData(data);
        setChatId(data.telegramChatId || "");
      })
      .catch(() => setMsg({ ok: false, text: "Не удалось загрузить настройки." }))
      .finally(() => setLoading(false));
  }, []);

  const save = async (e) => {
    e.preventDefault();
    setMsg(null);
    setSaving(true);
    try {
      const payload = { telegramChatId: chatId };
      if (token.trim()) payload.telegramBotToken = token.trim();
      const { data: updated } = await updateIntegrations(payload);
      setData(updated);
      setToken("");
      setMsg({ ok: true, text: "Сохранено ✓" });
    } catch (err) {
      setMsg({ ok: false, text: err.response?.data?.message || "Не удалось сохранить." });
    } finally {
      setSaving(false);
    }
  };

  const sendTest = async () => {
    setMsg(null);
    setTesting(true);
    try {
      const { data: res } = await sendTelegramReport();
      setMsg({ ok: true, text: res.message || "Отправлено ✓" });
    } catch (err) {
      setMsg({ ok: false, text: err.response?.data?.message || "Не удалось отправить." });
    } finally {
      setTesting(false);
    }
  };

  if (loading) return <p>Загрузка...</p>;

  return (
    <form className="settings-card" onSubmit={save}>
      <div className="settings-section-head">
        <h2>Telegram</h2>
        <span className={data.telegramConfigured ? "settings-badge ok" : "settings-badge off"}>
          {data.telegramConfigured ? "Настроено" : "Не настроено"}
        </span>
      </div>
      <p className="settings-sub">
        Бот для отчётов по давомату. Токен — у @BotFather, ID чата — у @userinfobot.
      </p>

      <div className="settings-field">
        <label>Токен бота</label>
        <input
          type="password"
          value={token}
          autoComplete="off"
          onChange={(e) => setToken(e.target.value)}
          placeholder={
            data.telegramConfigured
              ? `Сейчас: ${data.telegramTokenMasked} · оставьте пустым, чтобы не менять`
              : "123456:ABC-DEF..."
          }
        />
      </div>

      <div className="settings-field">
        <label>ID чата</label>
        <input type="text" value={chatId} onChange={(e) => setChatId(e.target.value)} placeholder="987654321" />
      </div>

      {msg && <p className={msg.ok ? "settings-ok" : "settings-error"}>{msg.text}</p>}

      <div className="settings-actions">
        <button type="submit" disabled={saving}>{saving ? "Сохранение..." : "Сохранить"}</button>
        <button
          type="button"
          className="settings-btn-secondary"
          onClick={sendTest}
          disabled={testing || !data.telegramConfigured}
          title={data.telegramConfigured ? "Отправить отчёт за сегодня" : "Сначала сохраните токен и ID чата"}
        >
          {testing ? "Отправка..." : "Отправить тест"}
        </button>
      </div>
    </form>
  );
}
