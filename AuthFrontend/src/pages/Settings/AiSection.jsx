import { useEffect, useState } from "react";
import { getIntegrations, updateIntegrations } from "../../api/authApi";
import Dropdown from "../../components/Dropdown";

const MODELS = [
  { value: "claude-opus-4-7", label: "Claude Opus 4.7 — умнее" },
  { value: "claude-sonnet-4-6", label: "Claude Sonnet 4.6 — баланс" },
  { value: "claude-haiku-4-5", label: "Claude Haiku 4.5 — дешевле" },
];

export default function AiSection() {
  const [data, setData] = useState(null);
  const [apiKey, setApiKey] = useState("");
  const [model, setModel] = useState("claude-opus-4-7");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState(null);

  useEffect(() => {
    getIntegrations()
      .then(({ data }) => {
        setData(data);
        setModel(data.anthropicModel || "claude-opus-4-7");
      })
      .catch(() => setMsg({ ok: false, text: "Не удалось загрузить настройки." }))
      .finally(() => setLoading(false));
  }, []);

  const save = async (e) => {
    e.preventDefault();
    setMsg(null);
    setSaving(true);
    try {
      const payload = { anthropicModel: model };
      if (apiKey.trim()) payload.anthropicApiKey = apiKey.trim();
      const { data: updated } = await updateIntegrations(payload);
      setData(updated);
      setApiKey("");
      setMsg({ ok: true, text: "Сохранено ✓" });
    } catch (err) {
      setMsg({ ok: false, text: err.response?.data?.message || "Не удалось сохранить." });
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <p>Загрузка...</p>;

  return (
    <form className="settings-card" onSubmit={save}>
      <div className="settings-section-head">
        <h2>ИИ-интеграция</h2>
        <span className={data.anthropicConfigured ? "settings-badge ok" : "settings-badge off"}>
          {data.anthropicConfigured ? "Настроено" : "Не настроено"}
        </span>
      </div>
      <p className="settings-sub">Ключ Anthropic (Claude) для ИИ-анализа давомата.</p>

      <div className="settings-field">
        <label>API-ключ</label>
        <input
          type="password"
          value={apiKey}
          autoComplete="off"
          onChange={(e) => setApiKey(e.target.value)}
          placeholder={
            data.anthropicConfigured
              ? `Сейчас: ${data.anthropicKeyMasked} · оставьте пустым, чтобы не менять`
              : "sk-ant-..."
          }
        />
      </div>

      <div className="settings-field">
        <label>Модель</label>
        <Dropdown value={model} onChange={setModel} options={MODELS} ariaLabel="Модель" />
      </div>

      {msg && <p className={msg.ok ? "settings-ok" : "settings-error"}>{msg.text}</p>}

      <button type="submit" disabled={saving}>{saving ? "Сохранение..." : "Сохранить"}</button>
    </form>
  );
}
