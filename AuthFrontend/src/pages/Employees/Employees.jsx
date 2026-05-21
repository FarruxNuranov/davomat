import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import {
  getEmployees,
  createEmployee,
  updateEmployee,
  deleteEmployee,
} from "../../api/authApi";
import { toInputTime } from "../../constants/attendance";
import EmployeeModal from "./EmployeeModal";
import "./Employees.css";

export default function Employees() {
  const [employees, setEmployees] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [modalEmployee, setModalEmployee] = useState(null);
  const [modalOpen, setModalOpen] = useState(false);

  const load = async () => {
    setLoading(true);
    setError("");
    try {
      const { data } = await getEmployees();
      setEmployees(data);
    } catch (err) {
      setError(err.response?.data?.message || "Не удалось загрузить сотрудников");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    // Намеренная загрузка списка при монтировании.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    load();
  }, []);

  const openCreate = () => {
    setModalEmployee(null);
    setModalOpen(true);
  };

  const openEdit = (employee) => {
    setModalEmployee(employee);
    setModalOpen(true);
  };

  const handleSubmit = async (payload) => {
    if (modalEmployee) {
      await updateEmployee(modalEmployee.id, payload);
    } else {
      await createEmployee(payload);
    }
    await load();
  };

  const handleDelete = async (employee) => {
    if (!window.confirm(`Удалить сотрудника ${employee.firstName} ${employee.lastName}?`)) return;
    try {
      await deleteEmployee(employee.id);
      await load();
    } catch (err) {
      alert(err.response?.data?.message || "Не удалось удалить");
    }
  };

  const schedule = (e) =>
    e.workStartTime && e.workEndTime
      ? `${toInputTime(e.workStartTime)}–${toInputTime(e.workEndTime)}`
      : "по умолчанию";

  return (
    <div className="employees-page">
      <div className="employees-header">
        <h1>Сотрудники</h1>
        <button className="employees-create-btn" onClick={openCreate}>+ Добавить</button>
      </div>

      {error && <p className="employees-error">{error}</p>}

      <div className="employees-table-wrapper">
        <table className="employees-table">
          <thead>
            <tr>
              <th>Имя</th>
              <th>Фамилия</th>
              <th>Телефон</th>
              <th>Должность</th>
              <th>График</th>
              <th>Добавлен</th>
              <th style={{ textAlign: "right" }}>Действия</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={7} className="employees-empty">Загрузка...</td></tr>
            ) : employees.length === 0 ? (
              <tr><td colSpan={7} className="employees-empty">Сотрудников пока нет</td></tr>
            ) : (
              employees.map((e) => (
                <tr key={e.id}>
                  <td>
                    <Link className="employees-link" to={`/dashboard/employees/${e.id}`}>
                      {e.firstName}
                    </Link>
                  </td>
                  <td>{e.lastName}</td>
                  <td>{e.phoneNumber}</td>
                  <td>{e.position}</td>
                  <td>{schedule(e)}</td>
                  <td>{new Date(e.createdAt).toLocaleDateString()}</td>
                  <td style={{ textAlign: "right" }}>
                    <button className="row-btn" onClick={() => openEdit(e)}>Изменить</button>
                    <button
                      className="row-btn row-btn-danger"
                      onClick={() => handleDelete(e)}
                    >
                      Удалить
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {modalOpen && (
        <EmployeeModal
          employee={modalEmployee}
          onClose={() => setModalOpen(false)}
          onSubmit={handleSubmit}
        />
      )}
    </div>
  );
}
