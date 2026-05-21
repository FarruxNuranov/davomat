import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { getEmployee, getEmployeeAttendance } from "../../api/authApi";
import { statusMeta, toInputTime, STATUS } from "../../constants/attendance";
import "./EmployeeDetail.css";

function StatusBadge({ status }) {
  const meta = statusMeta(status);
  return (
    <span className="status-badge" style={{ color: meta.color, background: meta.bg }}>
      {meta.label}
    </span>
  );
}

export default function EmployeeDetail() {
  const { id } = useParams();
  const [employee, setEmployee] = useState(null);
  const [records, setRecords] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let active = true;
    // Намеренная загрузка данных сотрудника при монтировании / смене id.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setLoading(true);
    Promise.all([getEmployee(id), getEmployeeAttendance(id)])
      .then(([emp, att]) => {
        if (!active) return;
        setEmployee(emp.data);
        setRecords(att.data);
      })
      .catch((err) =>
        active && setError(err.response?.status === 404 ? "Сотрудник не найден" : "Не удалось загрузить данные")
      )
      .finally(() => active && setLoading(false));
    return () => {
      active = false;
    };
  }, [id]);

  if (loading) return <p>Загрузка...</p>;
  if (error) return <p style={{ color: "#f87171" }}>{error}</p>;

  const schedule =
    employee.workStartTime && employee.workEndTime
      ? `${toInputTime(employee.workStartTime)}–${toInputTime(employee.workEndTime)}`
      : "по умолчанию (из настроек)";

  const counts = records.reduce((acc, r) => {
    acc[r.status] = (acc[r.status] || 0) + 1;
    return acc;
  }, {});

  return (
    <div className="emp-detail">
      <Link className="emp-back" to="/dashboard/employees">← К списку сотрудников</Link>

      <div className="emp-card">
        <h1>{employee.firstName} {employee.lastName}</h1>
        <div className="emp-grid">
          <div><span>Должность</span><b>{employee.position}</b></div>
          <div><span>Телефон</span><b>{employee.phoneNumber}</b></div>
          <div><span>График</span><b>{schedule}</b></div>
          <div><span>Добавлен</span><b>{new Date(employee.createdAt).toLocaleDateString()}</b></div>
        </div>
      </div>

      <div className="emp-stats">
        {Object.keys(STATUS).map((key) => (
          <div className="emp-stat" key={key}>
            <span className="emp-stat-value" style={{ color: STATUS[key].color }}>{counts[key] || 0}</span>
            <span className="emp-stat-label">{STATUS[key].label}</span>
          </div>
        ))}
      </div>

      <h2 className="emp-history-title">История давомата</h2>
      <div className="employees-table-wrapper">
        <table className="employees-table">
          <thead>
            <tr>
              <th>Дата</th>
              <th>Время прихода</th>
              <th>Статус</th>
              <th>Комментарий</th>
            </tr>
          </thead>
          <tbody>
            {records.length === 0 ? (
              <tr><td colSpan={4} className="employees-empty">Отметок пока нет</td></tr>
            ) : (
              records.map((r) => (
                <tr key={r.id}>
                  <td>{new Date(r.date).toLocaleDateString()}</td>
                  <td>{r.arrivalTime ? toInputTime(r.arrivalTime) : "—"}</td>
                  <td><StatusBadge status={r.status} /></td>
                  <td>{r.comment || "—"}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
