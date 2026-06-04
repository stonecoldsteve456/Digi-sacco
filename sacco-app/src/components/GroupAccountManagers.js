import React, { useEffect, useState } from "react";
import { FiUsers, FiUserCheck, FiList, FiSearch, FiPlusCircle } from "react-icons/fi";
import "./GroupAccountManagers.css";

function GroupAccountManagers() {
  const [managers, setManagers] = useState([]);
  const [form, setForm] = useState({ name: "", groupName: "", email: "", phone: "", status: "Active" });
  const [searchText, setSearchText] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const activeCount = managers.filter((manager) => manager.status?.toLowerCase() === "active").length;
  const groupCount = new Set(managers.map((manager) => manager.groupName?.trim().toLowerCase()).filter(Boolean)).size;
  const filteredManagers = managers.filter((manager) => {
    const query = searchText.trim().toLowerCase();
    if (!query) return true;
    return [manager.name, manager.groupName, manager.email, manager.phone, manager.status]
      .some((value) => value?.toLowerCase().includes(query));
  });

  const loadManagers = () => {
    setLoading(true);
    setError("");

    fetch("http://localhost:5000/api/group-managers")
      .then((r) => r.json())
      .then((data) => {
        setManagers(Array.isArray(data) ? data : []);
      })
      .catch((err) => setError("Failed to load managers: " + err.message))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    loadManagers();
  }, []);

  const handleChange = (field) => (e) => setForm((prev) => ({ ...prev, [field]: e.target.value }));

  const handleAdd = () => {
    if (!form.name || !form.groupName || !form.email) {
      alert("Please provide a name, group, and email for the manager.");
      return;
    }

    setError("");
    setLoading(true);

    fetch("http://localhost:5000/api/group-managers", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
    })
      .then((r) => r.json())
      .then((data) => {
        if (data && data.error) {
          setError("Could not add manager: " + data.error);
          return;
        }
        setForm({ name: "", groupName: "", email: "", phone: "", status: "Active" });
        loadManagers();
      })
      .catch((err) => setError("Failed to add manager: " + err.message))
      .finally(() => setLoading(false));
  };

  return (
    <div className="section-shell">
      <div className="section-header">
        <h1>Group Account Managers</h1>
        <p>Review and assign managers for each group account in the SACCO.</p>
      </div>

      <div className="manager-summary-cards">
        <div className="manager-summary-card">
          <div className="summary-icon">
            <FiUsers />
          </div>
          <div className="summary-text">
            <p>Total Managers</p>
            <strong>{managers.length}</strong>
          </div>
        </div>

        <div className="manager-summary-card">
          <div className="summary-icon">
            <FiUserCheck />
          </div>
          <div className="summary-text">
            <p>Active Managers</p>
            <strong>{activeCount}</strong>
          </div>
        </div>

        <div className="manager-summary-card">
          <div className="summary-icon">
            <FiList />
          </div>
          <div className="summary-text">
            <p>Groups Covered</p>
            <strong>{groupCount}</strong>
          </div>
        </div>
      </div>

      <div className="data-panel manager-grid">
        <div className="manager-card">
          <div className="panel-header">
            <FiPlusCircle />
            <div className="panel-title">
              <h3>Add Group Manager</h3>
              <span>Quickly create a new manager profile for group accounts.</span>
            </div>
          </div>

          <div className="field-grid">
            <label>
              Name
              <input value={form.name} onChange={handleChange("name")} placeholder="Manager name" />
            </label>
            <label>
              Group
              <input value={form.groupName} onChange={handleChange("groupName")} placeholder="Group name" />
            </label>
            <label>
              Email
              <input type="email" value={form.email} onChange={handleChange("email")} placeholder="email@example.com" />
            </label>
            <label>
              Phone
              <input type="tel" value={form.phone} onChange={handleChange("phone")} placeholder="Optional phone" />
            </label>
            <label>
              Status
              <select value={form.status} onChange={handleChange("status")}> 
                <option>Active</option>
                <option>Inactive</option>
              </select>
            </label>
          </div>

          <div style={{ marginTop: 12 }}>
            <button className="primary" disabled={loading} onClick={handleAdd}>
              {loading ? "Saving..." : "Add Manager"}
            </button>
          </div>

          {error && <div className="error-message" style={{ marginTop: 12 }}>{error}</div>}
        </div>

        <div className="manager-card">
          <div className="panel-header">
            <FiList />
            <div className="panel-title">
              <h3>Manager Directory</h3>
              <span>Search, filter and review assigned group managers.</span>
            </div>
          </div>

          <div className="manager-search-row">
            <div className="manager-search">
              <FiSearch />
              <input
                value={searchText}
                onChange={(e) => setSearchText(e.target.value)}
                placeholder="Search managers..."
              />
            </div>
          </div>

          <div className="manager-table-wrapper">
            {loading && !managers.length ? (
              <div className="manager-empty">Loading managers...</div>
            ) : (
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Name</th>
                    <th>Group</th>
                    <th>Email</th>
                    <th>Phone</th>
                    <th>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredManagers.length === 0 ? (
                    <tr>
                      <td colSpan="5" className="manager-empty">
                        No managers match that query.
                      </td>
                    </tr>
                  ) : (
                    filteredManagers.map((manager, index) => (
                      <tr key={manager.id ?? manager._id ?? index}>
                        <td>{manager.name}</td>
                        <td>{manager.groupName}</td>
                        <td>{manager.email}</td>
                        <td>{manager.phone || "—"}</td>
                        <td>{manager.status}</td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

export default GroupAccountManagers;
