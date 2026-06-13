import React, { useCallback, useState, useEffect } from "react";
import { apiRequest, getSessionPayload } from "../utils/api";
import { getCurrentSaccoId, getCurrentUser } from "../utils/financeStore";

function Communication({ mode = "manage" }) {
  const readOnly = mode === "read";
  const currentUser = getCurrentUser();

  const [communications, setCommunications] = useState([]);
  const [form, setForm] = useState({
    subject: "",
    audience: "All members",
    channel: "Notice",
    message: "",
    targetMemberId: null,
    targetMemberName: "",
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [members, setMembers] = useState([]);

  const fetchData = useCallback(async () => {
    setError("");
    try {
      const messagePath =
        readOnly && currentUser.email
          ? `/communications?email=${encodeURIComponent(currentUser.email)}`
          : "/communications";
      const comms = await apiRequest(messagePath);
      setCommunications(comms);

      if (!getCurrentSaccoId()) {
        setMembers([]);
        return;
      }

      const membersResponse = await apiRequest("/members");
      setMembers(membersResponse);
    } catch (err) {
      setError(err.message);
    }
  }, [currentUser.email, readOnly]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleChange = (field) => (event) => {
    const value = event.target.value;
    if (field === "audience") {
      setForm((prev) => ({
        ...prev,
        audience: value,
        targetMemberId: value === "All members" ? null : prev.targetMemberId,
        targetMemberName: value === "All members" ? "" : prev.targetMemberName,
      }));
      return;
    }

    if (field === "targetMemberName") {
      const typedName = value.trim().toLowerCase();
      const matchedMember = members.find((member) => {
        const name = (member.name || "").trim().toLowerCase();
        const email = (member.email || "").trim().toLowerCase();
        return name === typedName || email === typedName;
      });

      setForm((prev) => ({
        ...prev,
        audience: value ? "Individual member" : "All members",
        targetMemberName: value,
        targetMemberId: matchedMember?.id || null,
      }));
    } else {
      setForm(prev => ({ ...prev, [field]: value }));
    }
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setError("");
    setLoading(true);
    try {
       const subject = form.subject.trim();
       const message = form.message.trim();

       if (!subject) {
         throw new Error("Subject is required.");
       }

       if (!message) {
         throw new Error("Message is required.");
       }

       let matchedMember = null;
       if (form.targetMemberId) {
         matchedMember = members.find(m => Number(m.id) === Number(form.targetMemberId));
       }
       if (!matchedMember && form.targetMemberName) {
         const typedTarget = form.targetMemberName.trim().toLowerCase();
         matchedMember = members.find(m => {
           const name = (m.name || "").trim().toLowerCase();
           const email = (m.email || "").trim().toLowerCase();
           return name === typedTarget || email === typedTarget;
         });
       }

       if (form.audience === "Individual member" && !matchedMember) {
         throw new Error("Member is required.");
       }

       const payload = {
         ...form,
         subject,
         message,
         audience: matchedMember ? "Individual member" : "All members",
         targetUserId: matchedMember?.id || null,
       };
      await apiRequest("/communications", {
        method: "POST",
        body: JSON.stringify(getSessionPayload(payload)),
      });
      fetchData();
      setForm({
        subject: "",
        audience: "All members",
        channel: "Notice",
        message: "",
        targetMemberId: null,
        targetMemberName: "",
      });
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  if (readOnly) {
    return (
      <div className="communication-monitor-page">
        <h2>SACCO Announcements</h2>
        {error && <p className="form-error">{error}</p>}
        <div className="data-table-wrap">
          <table className="data-table monitor-data-table">
            <thead>
              <tr>
                <th>Subject</th>
                <th>Audience</th>
                <th>Channel</th>
                <th>Message</th>
              </tr>
            </thead>
            <tbody>
              {communications.map((comm) => (
                <tr key={comm.id}>
                  <td>{comm.subject}</td>
                  <td>{comm.audience}</td>
                  <td>{comm.channel}</td>
                  <td>{comm.message}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    );
  }

  return (
    <section className="communication-monitor-page">
      <h2>Create Communication</h2>
      {error && <p className="form-error">{error}</p>}
      <form onSubmit={handleSubmit} className="field-grid">
        <label>
          Subject
          <input
            type="text"
            value={form.subject}
            onChange={handleChange("subject")}
            placeholder="Annual meeting notice"
          />
        </label>

        <label>
          Audience
          <select value={form.audience} onChange={handleChange("audience")}>
            <option value="All members">All members</option>
            <option value="Individual member">Individual member</option>
          </select>
        </label>

        <label>
          Channel
          <select value={form.channel} onChange={handleChange("channel")}>
            <option value="Notice">Notice</option>
            <option value="SMS">SMS</option>
            <option value="Email">Email</option>
            <option value="WhatsApp">WhatsApp</option>
          </select>
        </label>

        <label>
          Message
          <textarea
            rows="3"
            value={form.message}
            onChange={handleChange("message")}
            placeholder="Your message here"
          />
        </label>

        <label>
          Target Member
          <input
            type="text"
            value={form.targetMemberName}
            onChange={handleChange("targetMemberName")}
            list="communication-members"
            disabled={form.audience === "All members"}
            placeholder={form.audience === "All members" ? "All members" : "Type member name or email"}
          />
          <datalist id="communication-members">
            {members.map(member => (
              <option key={member.id} value={member.email || member.name}>
                {member.name}
              </option>
            ))}
          </datalist>
        </label>

        <button type="submit" disabled={loading}>
          {loading ? "Saving..." : "Save"}
        </button>
      </form>
    </section>
  );
}

export default Communication;
