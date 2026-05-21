import { useEffect, useState } from "react";
import { getMe } from "../../api/authApi";

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

  useEffect(() => {
    getMe()
      .then(({ data }) => setUser(data))
      .catch((err) => setError(err.response?.status === 401 ? "Не авторизован" : "Не удалось загрузить"))
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <p>Загрузка...</p>;
  if (error) return <p style={{ color: "#dc2626" }}>{error}</p>;

  return (
    <div>
      <h1 style={{ fontSize: 26, fontWeight: 700, letterSpacing: "-0.5px", margin: "0 0 18px" }}>Профиль</h1>
      <div style={cardStyle}>
        <Row label="ID" value={user.id} />
        <Row label="Имя" value={user.firstName} />
        <Row label="Фамилия" value={user.lastName} />
        <Row label="Телефон" value={user.phoneNumber} />
        <Row label="Email" value={user.email} />
        <Row label="Создан" value={new Date(user.createdAt).toLocaleString()} />
      </div>
    </div>
  );
}
