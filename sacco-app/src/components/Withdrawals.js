import React, { useEffect, useState } from "react";
import { addTransaction, formatKes, getCurrentUser, getTransactions } from "../utils/financeStore";

function Withdrawals() {
  const currentUser = getCurrentUser();
  const [records, setRecords] = useState([]);
  const [form, setForm] = useState({
    memberName: currentUser.name || "",
    amount: "",
    description: "Member withdrawal",
  });

  const loadRecords = () => {
    setRecords(getTransactions().filter((record) => record.type === "withdrawal"));
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
      alert("Please enter the member name and withdrawal amount.");
      return;
    }

    addTransaction({ ...form, type: "withdrawal" });
    setForm((prev) => ({ ...prev, amount: "", description: "Member withdrawal" }));
    loadRecords();
  };

  const total = records.reduce((sum, record) => sum + Number(record.amount || 0), 0);

  return (
    <section className="section-shell">
      <div className="section-header">
        <h1>Withdrawals</h1>
        <p>Record member withdrawals and watch the dashboard withdrawal total update.</p>
      </div>

      <div className="data-panel transaction-form-panel">
        <form className="field-grid" onSubmit={handleSubmit}>
          <label>
            Member Name
            <input value={form.memberName} onChange={handleChange("memberName")} />
          </label>
          <label>
            Withdrawal Amount
            <input type="number" min="0" value={form.amount} onChange={handleChange("amount")} />
          </label>
          <label>
            Description
            <input value={form.description} onChange={handleChange("description")} />
          </label>
          <button className="primary" type="submit">Record Withdrawal</button>
        </form>
      </div>

      <div className="data-panel">
        <h3>Total Withdrawals: {formatKes(total)}</h3>
        {records.length === 0 ? (
          <p>No withdrawals recorded yet.</p>
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

export default Withdrawals;
