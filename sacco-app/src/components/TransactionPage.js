import React, { useCallback, useEffect, useState } from "react";
import { apiRequest, getSessionPayload, withSacco } from "../utils/api";
import {
  addTransaction,
  formatKes,
  getContributionSettings,
  getCurrentUser,
  getTransactions,
} from "../utils/financeStore";

function TransactionPage({ type, title, description, amountLabel, defaultDescription, submitLabel }) {
  const currentUser = getCurrentUser();
  const [records, setRecords] = useState([]);
  const [error, setError] = useState("");
  const [contributionSettings, setContributionSettings] = useState(getContributionSettings());
  const [form, setForm] = useState({
    memberName: currentUser.name || "",
    amount: "",
    description: defaultDescription,
  });

  const loadRecords = useCallback(() => {
    setError("");
    apiRequest(withSacco(`/transactions?email=${encodeURIComponent(currentUser.email || "")}`))
      .then((data) => setRecords((Array.isArray(data) ? data : []).filter((record) => record.type === type)))
      .catch((err) => {
        setError("Showing local records because live data could not load: " + err.message);
        setRecords(getTransactions().filter((record) => record.type === type));
      });
    apiRequest(withSacco(`/dashboard/summary?email=${encodeURIComponent(currentUser.email || "")}`))
      .then((data) => {
        setContributionSettings({
          contributionAmount: data.fixedContributionAmount,
          contributionFrequency: data.contributionFrequency,
          contributionDescription: data.contributionDescription,
        });
      })
      .catch(() => {});
  }, [currentUser.email, type]);

  useEffect(() => {
    loadRecords();
    window.addEventListener("digi-finance-updated", loadRecords);
    return () => window.removeEventListener("digi-finance-updated", loadRecords);
  }, [loadRecords]);

  const handleChange = (field) => (event) => {
    setForm((prev) => ({ ...prev, [field]: event.target.value }));
  };

  const handleSubmit = (event) => {
    event.preventDefault();
    const fixedContributionAmount = Number(contributionSettings.contributionAmount) || 0;
    const usesFixedContribution = ["deposit", "checkoff"].includes(type) && fixedContributionAmount > 0;
    const submittedAmount = usesFixedContribution ? fixedContributionAmount : form.amount;

    if (!form.memberName || !submittedAmount) {
      alert(`Please enter the member name and ${amountLabel.toLowerCase()}.`);
      return;
    }

    const payload = getSessionPayload({ ...form, amount: submittedAmount, type });
    apiRequest("/transactions", {
      method: "POST",
      body: JSON.stringify(payload),
    })
      .then((data) => {
        addTransaction(data.transaction || payload);
        setForm((prev) => ({ ...prev, amount: "", description: defaultDescription }));
        loadRecords();
      })
      .catch((err) => {
        addTransaction(payload);
        setError("Saved locally because live save failed: " + err.message);
        setForm((prev) => ({ ...prev, amount: "", description: defaultDescription }));
        loadRecords();
      });
  };

  const total = records.reduce((sum, record) => sum + Number(record.amount || 0), 0);
  const personalTotal = records.reduce((sum, record) => {
    const isCurrentUser =
      record.userEmail === currentUser.email ||
      (record.memberName || "").trim().toLowerCase() === (currentUser.name || "").trim().toLowerCase();
    return isCurrentUser ? sum + Number(record.amount || 0) : sum;
  }, 0);
  const fixedContributionAmount = Number(contributionSettings.contributionAmount) || 0;
  const usesFixedContribution = ["deposit", "checkoff"].includes(type) && fixedContributionAmount > 0;

  return (
    <section className="section-shell">
      <div className="section-header">
        <h1>{title}</h1>
        <p>{description}</p>
      </div>

      <div className="data-panel transaction-form-panel">
        <form className="field-grid" onSubmit={handleSubmit}>
          <label>
            Member Name
            <input value={form.memberName} onChange={handleChange("memberName")} />
          </label>
          <label>
            {amountLabel}
            <input
              type="number"
              min="0"
              value={usesFixedContribution ? fixedContributionAmount : form.amount}
              onChange={handleChange("amount")}
              readOnly={usesFixedContribution}
            />
          </label>
          <label>
            Description
            <input value={form.description} onChange={handleChange("description")} />
          </label>
          <button className="primary" type="submit">
            {submitLabel}
          </button>
        </form>
        {error && <p className="form-error">{error}</p>}
      </div>

      <div className="data-panel">
        <h3>Total: {formatKes(total)}</h3>
        {usesFixedContribution && (
          <p className="muted-copy">
            Fixed {contributionSettings.contributionFrequency || "Monthly"} contribution:{" "}
            {formatKes(fixedContributionAmount)} for chairperson and members.
          </p>
        )}
        <p className="muted-copy">Personal contribution record: {formatKes(personalTotal)}</p>
        {records.length === 0 ? (
          <p>No records yet.</p>
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
                  <td>{record.memberName || record.userEmail}</td>
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

export default TransactionPage;
