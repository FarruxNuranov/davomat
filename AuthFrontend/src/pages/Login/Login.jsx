import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { login, setAccessToken } from "../../api/authApi";
import "./Login.css";

export default function Login() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const { data } = await login({ email, password });
      setAccessToken(data.accessToken);
      localStorage.setItem("user", JSON.stringify({
        userId: data.userId,
        email: data.email,
        firstName: data.firstName,
        lastName: data.lastName,
        phoneNumber: data.phoneNumber,
        role: data.role,
        employeeId: data.employeeId,
      }));
      navigate(data.role === "Employee" ? "/dashboard/my" : "/dashboard");
    } catch (err) {
      const status = err.response?.status;
      if (status === 429) setError("Слишком много попыток. Повторите через минуту.");
      else setError(err.response?.data?.message || "Не удалось войти");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="login-wrapper">
      <form className="login-card" onSubmit={handleSubmit}>
        <div className="login-brand">
          <span className="login-logo">AuthApp</span>
          <p className="login-sub">Система учёта давомата</p>
        </div>

        <label>Email</label>
        <input
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="you@company.uz"
          required
        />

        <label>Пароль</label>
        <input
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder="••••••••"
          required
          minLength={8}
        />

        {error && <p className="login-error">{error}</p>}

        <button type="submit" disabled={loading}>
          {loading ? "Вход..." : "Войти"}
        </button>
      </form>
    </div>
  );
}
