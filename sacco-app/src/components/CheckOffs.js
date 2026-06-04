import React, { useEffect, useState } from "react";
import { addTransaction, formatKes, getCurrentUser, getTransactions } from "../utils/financeStore";

function CheckOffs() {
  const currentUser = getCurrentUser();
  const [records, setRecords] = useState([]);
  const [form, setForm] = useState({
    memberName: currentUser.name || "",
    amount: "",
    description: "Payroll checkoff",
  });

  const loadRecords = () => {
    setRecords(getTransactions().filter((record) => record.type === "checkoff"));
  };

  useEffect(() => {
    loadRecords();
    window.addEventListener("digi-finance-updated", loadRecords);
    return () => window.removeEventListener("digi-finance-updated", loadRecords);
  }, []);

  const handleChange = (field) => (event) => {
    setForm((prev) => ({ ...prev, [field]: event.target.value }));
  };

  const handleSubmit = (event) => {
    event.preventDefault();
    if (!form.memberName || !form.amount) {
      alert("Please enter the member name and checkoff amount.");
      return;
    }

    addTransaction({ ...form, type: "checkoff" });
    setForm((prev) => ({ ...prev, amount: "", description: "Payroll checkoff" }));
    loadRecords();
  };

  const total = records.reduce((sum, record) => sum + Number(record.amount || 0), 0);

  return (
    <section className="section-shell">
      <div className="section-header">
        <h1>Check Offs</h1>
        <p>Record payroll deductions. Checkoffs count as contribution payments on the dashboard.</p>
      </div>

      <div className="data-panel transaction-form-panel">
        <form className="field-grid" onSubmit={handleSubmit}>
          <label>
            Member Name
            <input value={form.memberName} onChange={handleChange("memberName")} />
          </label>
          <label>
            Checkoff Amount
            <input type="number" min="0" value={form.amount} onChange={handleChange("amount")} />
          </label>
          <label>
            Description
            <input value={form.description} onChange={handleChange("description")} />
          </label>
          <button className="primary" type="submit">Record Checkoff</button>
        </form>
      </div>

      <div className="data-panel">
        <h3>Total Checkoffs: {formatKes(total)}</h3>
        {records.length === 0 ? (
          <p>No checkoffs recorded yet.</p>
        ) : (
          <table className="data-table">
            <thead>
              <tr>
                <th>Member</th>
                <th>Amount</th>
                <th>Description</th>
                <th>Date</th>
              </tr>
            </thead>
            <tbody>
              {records.map((record) => (
                <tr key={record.id}>
                  <td>{record.memberName}</td>
                  <td>{formatKes(record.amount)}</td>
                  <td>{record.description}</td>
                  <td>{new Date(record.createdAt).toLocaleDateString()}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </section>
  );
}

export default CheckOffs;
