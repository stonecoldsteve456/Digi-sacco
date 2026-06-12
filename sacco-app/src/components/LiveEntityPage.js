import React, { useCallback, useEffect, useMemo, useState } from "react";
import { apiRequest, getSessionPayload, withSacco } from "../utils/api";

function LiveEntityPage({
  title,
  description,
  endpoint,
  fields,
  columns,
  initialForm = {},
  className = "",
  tableClassName = "data-table",
  tableTitle = "",
  actionLabel = "Delete",
  readOnly = false,
}) {
  const emptyForm = useMemo(
    () =>
      fields.reduce(
        (next, field) => ({ ...next, [field.name]: field.defaultValue || "" }),
        initialForm
      ),
    [fields, initialForm]
  );
  const [records, setRecords] = useState([]);
  const [form, setForm] = useState(emptyForm);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const baseEndpoint = endpoint.split("?")[0];

  const loadRecords = useCallback(() => {
    setLoading(true);
    setError("");
    apiRequest(withSacco(endpoint))
      .then((data) => setRecords(Array.isArray(data) ? data : []))
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, [endpoint]);

  useEffect(() => {
    loadRecords();
  }, [loadRecords]);

  const handleChange = (field) => (event) => {
    setForm((prev) => ({ ...prev, [field]: event.target.value }));
  };

  const handleSubmit = (event) => {
    event.preventDefault();
    setError("");
    setLoading(true);
    apiRequest(endpoint, {
      method: "POST",
      body: JSON.stringify(getSessionPayload(form)),
    })
      .then(() => {
        setForm(emptyForm);
        window.dispatchEvent(
          new CustomEvent("digi-record-created", {
            detail: { endpoint: baseEndpoint },
          })
        );
        loadRecords();
      })
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  };

  const handleDelete = (id) => {
    if (!window.confirm("Delete this record?")) return;
    setError("");
    setLoading(true);
    apiRequest(`${baseEndpoint}/${id}`, { method: "DELETE" })
      .then(loadRecords)
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  };

  return (
    <section className={`section-shell ${className}`.trim()}>
      <div className="section-header">
        <h1>{title}</h1>
        <p>{description}</p>
      </div>

      {!readOnly && (
        <div className="data-panel transaction-form-panel">
          <form className="field-grid" onSubmit={handleSubmit}>
            {fields.map((field) => (
              <label key={field.name}>
                {field.label}
                {field.type === "select" ? (
                  <select value={form[field.name] || ""} onChange={handleChange(field.name)}>
                    {(field.options || []).map((option) => (
                      <option key={option} value={option}>
                        {option}
                      </option>
                    ))}
                  </select>
                ) : field.type === "textarea" ? (
                  <textarea
                    rows="3"
                    value={form[field.name] || ""}
                    onChange={handleChange(field.name)}
                    placeholder={field.placeholder || ""}
                  />
                ) : (
                  <input
                    type={field.type || "text"}
                    value={form[field.name] || ""}
                    onChange={handleChange(field.name)}
                    placeholder={field.placeholder || ""}
                  />
                )}
              </label>
            ))}
            <button className="primary" type="submit" disabled={loading}>
              {loading ? "Saving..." : "Save"}
            </button>
          </form>
          {error && <p className="form-error">{error}</p>}
        </div>
      )}

      <div className="data-panel">
        {tableTitle && <h2 className="data-panel-title">{tableTitle}</h2>}
        {loading && records.length === 0 ? (
          <p>Loading...</p>
        ) : records.length === 0 ? (
          <p>No records yet.</p>
        ) : (
          <div className="data-table-wrap">
            <table className={tableClassName}>
              <thead>
                <tr>
                  {columns.map((column) => (
                    <th key={column.key}>{column.label}</th>
                  ))}
                  {!readOnly && <th>Actions</th>}
                </tr>
              </thead>
              <tbody>
                {records.map((record) => (
                  <tr key={record.id}>
                    {columns.map((column) => (
                      <td key={column.key}>{column.render ? column.render(record) : record[column.key]}</td>
                    ))}
                    {!readOnly && (
                      <td>
                        <button className="small-btn reject" type="button" onClick={() => handleDelete(record.id)}>
                          {actionLabel}
                        </button>
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </section>
  );
}

export default LiveEntityPage;
