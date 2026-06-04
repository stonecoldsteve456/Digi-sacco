import React, { useEffect, useState } from "react";
import { addTransaction, formatKes, getCurrentUser, getTransactions } from "../utils/financeStore";

function Deposits() {
  const currentUser = getCurrentUser();
  const [records, setRecords] = useState([]);
  const [form, setForm] = useState({
    memberName: currentUser.name || "",
    amount: "",
    description: "Member deposit",
  });

  const loadRecords = () => {
    setRecords(getTransactions().filter((record) => record.type === "deposit"));
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
      alert("Please enter the member name and deposit amount.");
      return;
    }

    addTransaction({ ...form, type: "deposit" });
    setForm((prev) => ({ ...prev, amount: "", description: "Member deposit" }));
    loadRecords();
  };

  const total = records.reduce((sum, record) => sum + Number(record.amount || 0), 0);

  return (
    <section className="section-shell">
      <div className="section-header">
        <h1>Member Deposits</h1>
        <p>Record member cash or mobile-money deposits and track the total on the dashboard.</p>
      </div>

      <div className="data-panel transaction-form-panel">
        <form className="field-grid" onSubmit={handleSubmit}>
          <label>
            Member Name
            <input value={form.memberName} onChange={handleChange("memberName")} />
          </label>
          <label>
            Deposit Amount
            <input type="number" min="0" value={form.amount} onChange={handleChange("amount")} />
          </label>
          <label>
            Description
            <input value={form.description} onChange={handleChange("description")} />
          </label>
          <button className="primary" type="submit">Record Deposit</button>
        </form>
      </div>

      <div className="data-panel">
        <h3>Total Deposits: {formatKes(total)}</h3>
        {records.length === 0 ? (
          <p>No deposits recorded yet.</p>
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

export default Deposits;
