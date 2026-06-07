import React, { useEffect, useState, useCallback } from "react";
import { FiCheckCircle, FiX, FiLoader, FiUsers, FiUpload } from "react-icons/fi";
import { apiRequest, getSessionPayload, withSacco } from "../utils/api";
import {
  addTransaction,
  formatKes,
  getCurrentUser,
  getTransactions,
} from "../utils/financeStore";
import "./CheckOffs.css";

function CheckOffs() {
  const currentUser = getCurrentUser();
  const [records, setRecords] = useState([]);
  const [pendingApprovals, setPendingApprovals] = useState([]);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({
    memberName: currentUser.name || "",
    amount: "",
    description: "Payroll checkoff",
  });

  // Load regular transactions (for member view or history)
  const loadRecords = useCallback(() => {
    setLoading(true);
    setError("");
    
    apiRequest(withSacco(`/transactions?email=${encodeURIComponent(currentUser.email || "")}`))
      .then((data) => {
        setRecords((Array.isArray(data) ? data : []).filter((record) => record.type === "checkoff"));
      })
      .catch((err) => {
        setError("Showing local records because live data could not load: " + err.message);
        setRecords(getTransactions().filter((record) => record.type === "checkoff"));
      })
      .finally(() => setLoading(false));
  }, [currentUser]);

  // Load pending checkoff approvals (for chairperson view)
  const loadPendingApprovals = useCallback(() => {
    if (currentUser.role !== "chairperson") return;
    
    setLoading(true);
    setError("");
    
    // In a real app, this would be a specific endpoint for pending approvals
    // For now, we'll filter transactions that need approval
    apiRequest(withSacco(`/transactions?email=${encodeURIComponent(currentUser.email || "")}`))
      .then((data) => {
        const allTransactions = Array.isArray(data) ? data : [];
        // For demonstration, we'll consider recent checkoffs as pending approvals
        // In reality, you'd have a specific status field or separate endpoint
        const recentCheckoffs = allTransactions
          .filter(record => record.type === "checkoff")
          .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
          .slice(0, 10); // Show last 10 as "pending" for demo
        
        setPendingApprovals(recentCheckoffs);
      })
      .catch((err) => {
        setError("Could not load pending approvals: " + err.message);
        const allTransactions = getTransactions();
        const recentCheckoffs = allTransactions
          .filter(record => record.type === "checkoff")
          .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
          .slice(0, 10);
        setPendingApprovals(recentCheckoffs);
      })
      .finally(() => setLoading(false));
  }, [currentUser]);

  useEffect(() => {
    loadRecords();
    if (currentUser.role === "chairperson") {
      loadPendingApprovals();
    }
    
    const handleUpdate = () => {
      loadRecords();
      if (currentUser.role === "chairperson") {
        loadPendingApprovals();
      }
    };
    
    window.addEventListener("digi-finance-updated", handleUpdate);
    return () => window.removeEventListener("digi-finance-updated", handleUpdate);
  }, [loadRecords, loadPendingApprovals]);

  const handleChange = (field) => (event) => {
    setForm((prev) => ({ ...prev, [field]: event.target.value }));
  };

  const handleSubmit = (event) => {
    event.preventDefault();
    
    if (!form.memberName || !form.amount) {
      alert("Please enter the member name and checkoff amount.");
      return;
    }

    setLoading(true);
    
    const payload = getSessionPayload({ 
      ...form, 
      amount: Number(form.amount),
      type: "checkoff"
    });

    apiRequest("/transactions", {
      method: "POST",
      body: JSON.stringify(payload),
    })
      .then((data) => {
        addTransaction(data.transaction || payload);
        setForm((prev) => ({ ...prev, amount: "", description: "Payroll checkoff" }));
        loadRecords();
        if (isChairperson) {
          loadPendingApprovals();
        }
      })
      .catch((err) => {
        addTransaction(payload);
        setError("Saved locally because live save failed: " + err.message);
        setForm((prev) => ({ ...prev, amount: "", description: "Payroll checkoff" }));
        loadRecords();
        if (isChairperson) {
          loadPendingApprovals();
        }
      });
  };

  const handleApprove = async (transactionId) => {
    try {
      // In a real implementation, this would update the transaction status
      // For now, we'll just show a success message and refresh
      setLoading(true);
      
      // Simulate approval by updating the transaction (in real app, this would be a PATCH/PUT to update status)
      await apiRequest(`/transactions/${transactionId}`, {
        method: "PUT",
        body: JSON.stringify({ status: "approved" })
      });
      
      // Refresh data
      loadRecords();
      loadPendingApprovals();
      
      alert("Checkoff approved successfully.");
    } catch (err) {
      setError("Failed to approve checkoff: " + err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleReject = async (transactionId) => {
    if (!window.confirm("Are you sure you want to reject this checkoff request?")) return;
    
    try {
      setLoading(true);
      
      // Simulate rejection by updating the transaction status
      await apiRequest(`/transactions/${transactionId}`, {
        method: "PUT",
        body: JSON.stringify({ status: "rejected" })
      });
      
      // Refresh data
      loadRecords();
      loadPendingApprovals();
      
      alert("Checkoff rejected.");
    } catch (err) {
      setError("Failed to reject checkoff: " + err.message);
    } finally {
      setLoading(false);
    }
  };

   // Calculate totals
   const personalTotal = records.reduce((sum, record) => {
     const isCurrentUser =
       record.userEmail === currentUser.email ||
       (record.memberName || "").trim().toLowerCase() === (currentUser.name || "").trim().toLowerCase();
     return isCurrentUser ? sum + Number(record.amount || 0) : sum;
   }, 0);

  return (
    <section className="section-shell">
      <div className="section-header">
        <h1>Check Offs</h1>
        <p>
          {isChairperson 
            ? "Review and approve payroll deduction requests from members." 
            : "Record your payroll deduction payments. These count as contribution payments."}
        </p>
      </div>

      {isChairperson ? (
        // Chairperson View: Approval Interface
        <>
          <div className="data-panel approval-panel">
            <h3>Pending Checkoff Approvals</h3>
            {loading && pendingApprovals.length === 0 ? (
              <p>Loading pending approvals...</p>
            ) : (
              pendingApprovals.length === 0 ? (
                <p>No pending checkoff approvals.</p>
              ) : (
                <table className="data-table">
                  <thead>
                    <tr>
                      <th>Member</th>
                      <th>Amount</th>
                      <th>Description</th>
                      <th>Date</th>
                      <th>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {pendingApprovals.map((record) => (
                      <tr key={record.id}>
                        <td>{record.memberName || record.userEmail}</td>
                        <td>{formatKes(record.amount)}</td>
                        <td>{record.description}</td>
                        <td>{new Date(record.createdAt).toLocaleDateString()}</td>
                        <td>
                          <div className="action-buttons">
                            <button
                              className="small-btn approve-btn"
                              onClick={() => handleApprove(record.id)}
                              disabled={loading}
                            >
                              {loading ? "Approving..." : "Approve"}
                            </button>
                            <button
                              className="small-btn reject-btn"
                              onClick={() => handleReject(record.id)}
                              disabled={loading}
                              style={{ marginLeft: "8px" }}
                            >
                              Reject
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )
            )}
          </div>
          
          <div className="data-panel">
            <h3>Approval History</h3>
            {records.length === 0 ? (
              <p>No checkoff transactions recorded yet.</p>
            ) : (
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Member</th>
                    <th>Amount</th>
                    <th>Description</th>
                    <th>Date</th>
                    <th>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {records.map((record) => (
                    <tr key={record.id}>
                      <td>{record.memberName || record.userEmail}</td>
                      <td>{formatKes(record.amount)}</td>
                      <td>{record.description}</td>
                      <td>{new Date(record.createdAt).toLocaleDateString()}</td>
                      <td>
                        <span className={record.status === "approved" ? "status-approved" : 
                               record.status === "rejected" ? "status-rejected" : "status-pending"}>
                          {record.status || "approved"}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </>
      ) : (
        // Member View: Transaction Recording
        <>
          <div className="data-panel transaction-form-panel">
            <form className="field-grid" onSubmit={handleSubmit}>
              <label>
                Member Name
                <input 
                  value={form.memberName} 
                  onChange={handleChange("memberName")} 
                  readOnly 
                />
              </label>
              <label>
                Checkoff Amount
                <input
                  type="number"
                  min="0"
                  value={form.amount}
                  onChange={handleChange("amount")}
                  placeholder="KES 0.00"
                />
              </label>
              <label>
                Description
                <input 
                  value={form.description} 
                  onChange={handleChange("description")} 
                />
              </label>
              <button className="primary" type="submit" disabled={loading}>
                {loading ? "Recording..." : "Record Checkoff"}
              </button>
            </form>
            {error && <p className="form-error">{error}</p>}
          </div>
          
          <div className="data-panel">
            <h3>Your Checkoff History</h3>
            {records.length === 0 ? (
              <p>No checkoff transactions recorded yet.</p>
            ) : (
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Amount</th>
                    <th>Description</th>
                    <th>Date</th>
                  </tr>
                </thead>
                <tbody>
                  {records.map((record) => {
                    const isCurrentUserRecord =
                      record.userEmail === currentUser.email ||
                      (record.memberName || "").trim().toLowerCase() === (currentUser.name || "").trim().toLowerCase();
                    
                    if (!isCurrentUserRecord) return null; // Only show user's own transactions
                    
                    return (
                      <tr key={record.id}>
                        <td>{formatKes(record.amount)}</td>
                        <td>{record.description}</td>
                        <td>{new Date(record.createdAt).toLocaleDateString()}</td>
                      </tr>
                    );
                  }).filter(Boolean)} {/* Remove null values */}
                </tbody>
              </table>
            )}
            
            <p className="muted-copy">
              Your total checkoff contributions: <strong>{formatKes(personalTotal)}</strong>
            </p>
          </div>
        </>
      )}
    </section>
  );
}

export default CheckOffs;