export default function Dashboard() {
  const user = JSON.parse(localStorage.getItem("user") || "{}");
  const name = [user.firstName, user.lastName].filter(Boolean).join(" ") || "пользователь";

  return (
    <div>
      <div
        style={{
          background: "var(--accent-grad)",
          borderRadius: 18,
          padding: "34px 30px",
          color: "#fff",
          boxShadow: "0 12px 32px rgba(37,99,235,.26)",
        }}
      >
        <h1 style={{ margin: 0, fontSize: 28, fontWeight: 800, letterSpacing: "-0.5px" }}>
          Добро пожаловать, {name}
        </h1>
        <p style={{ margin: "8px 0 0", opacity: 0.92, fontSize: 15 }}>
          Вы вошли как {user.email}
        </p>
      </div>
    </div>
  );
}
