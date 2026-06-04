import React, { useEffect, useState } from "react";
import {
  addLoanApplication,
  addTransaction,
  formatKes,
  getCurrentUser,
  getLoanApplications,
  saveLoanApplications,
} from "../utils/financeStore";

const loanOptions = [
  {
    name: "Personal Loan",
    interestRate: 12,
    repaymentPeriod: "12 months",
    eligibility: "Active member for 6+ months",
    description: "A personal loan for household and individual needs.",
  },
  {
    name: "Business Loan",
    interestRate: 14,
    repaymentPeriod: "18 months",
    eligibility: "Business plan and member savings history",
    description: "A loan to finance business growth or inventory.",
  },
  {
    name: "Emergency Loan",
    interestRate: 10,
    repaymentPeriod: "6 months",
    eligibility: "Immediate personal emergency support.",
    description: "Quick access to funds for urgent needs.",
  },
  {
    name: "Education Loan",
    interestRate: 8,
    repaymentPeriod: "24 months",
    eligibility: "School fees and training support.",
    description: "Support members paying for education and training.",
  },
  {
    name: "Development Loan",
    interestRate: 11,
    repaymentPeriod: "20 months",
    eligibility: "Project-based financing for members.",
    description: "Loans for larger development projects.",
  },
];

function LoanTypes() {
  const currentUser = getCurrentUser();
  const [selectedLoan, setSelectedLoan] = useState(loanOptions[0]);
  const [formData, setFormData] = useState({
    memberName: currentUser.name || "",
    amount: "",
    purpose: "",
    repaymentPeriod: loanOptions[0].repaymentPeriod,
  });
  const [applications, setApplications] = useState([]);
  const [notifications, setNotifications] = useState([]);
  const [activeTab, setActiveTab] = useState("apply");
  const [repayments, setRepayments] = useState({});

  useEffect(() => {
    setFormData((prev) => ({
      ...prev,
      repaymentPeriod: selectedLoan.repaymentPeriod,
    }));
  }, [selectedLoan]);

  const addNotification = (message) => {
    setNotifications((prev) => [
      { id: Date.now(), message, time: new Date().toLocaleTimeString() },
      ...prev,
    ]);
  };

  const handleChange = (field) => (event) => {
    setFormData((prev) => ({ ...prev, [field]: event.target.value }));
  };

  const handleSubmit = () => {
    if (!formData.memberName || !formData.amount || !formData.purpose) {
      alert("Please complete all fields before submitting.");
      return;
    }

    const record = {
      id: Date.now(),
      loanType: selectedLoan.name,
      memberName: formData.memberName,
      amount: Number(formData.amount),
      purpose: formData.purpose,
      repaymentPeriod: formData.repaymentPeriod,
      interestRate: selectedLoan.interestRate,
      status: "Pending",
      amountPaid: 0,
      repayments: [],
      submittedAt: new Date().toLocaleDateString(),
      nextDue: "In 30 days",
    };

    const savedRecord = addLoanApplication(record);
    setApplications((prev) => [savedRecord, ...prev]);
    addNotification(`Loan request for ${selectedLoan.name} submitted.`);
    setFormData({
      memberName: currentUser.name || "",
      amount: "",
      purpose: "",
      repaymentPeriod: selectedLoan.repaymentPeriod,
    });
  };

  // Load persisted applications on mount
  useEffect(() => {
    const stored = getLoanApplications();
    if (stored && Array.isArray(stored)) {
      setApplications(stored);
    }
  }, []);

  const handleRepaymentChange = (loanId) => (event) => {
    setRepayments((prev) => ({ ...prev, [loanId]: event.target.value }));
  };

  const handleRepayment = (loan) => {
    const paymentAmount = Number(repayments[loan.id]) || 0;
    const currentPaid = Number(loan.amountPaid) || 0;
    const balance = Math.max(Number(loan.amount) - currentPaid, 0);

    if (paymentAmount <= 0) {
      alert("Enter a repayment amount.");
      return;
    }

    if (paymentAmount > balance) {
      alert("Repayment cannot be more than the loan balance.");
      return;
    }

    const repaymentRecord = {
      id: Date.now(),
      amount: paymentAmount,
      paidAt: new Date().toISOString(),
    };

    const updatedApplications = applications.map((application) => {
      if (application.id !== loan.id) return application;

      const nextPaid = currentPaid + paymentAmount;
      return {
        ...application,
        amountPaid: nextPaid,
        repayments: [repaymentRecord, ...(application.repayments || [])],
        status: nextPaid >= Number(application.amount) ? "Paid" : application.status,
        nextDue: nextPaid >= Number(application.amount) ? "Cleared" : application.nextDue,
      };
    });

    setApplications(updatedApplications);
    saveLoanApplications(updatedApplications);
    addTransaction({
      type: "loan-repayment",
      memberName: loan.memberName,
      amount: paymentAmount,
      description: `${loan.loanType} repayment`,
    });
    setRepayments((prev) => ({ ...prev, [loan.id]: "" }));
    addNotification(`Repayment of ${formatKes(paymentAmount)} recorded for ${loan.loanType}.`);
  };

  return (
    <div className="loan-page">
      <div className="loan-hero">
        <div>
          <h2>Loan Dashboard</h2>
          <p>Choose a loan type, apply, and track your loan requests.</p>
        </div>
        <div className="loan-tabs">
          <button
            className={activeTab === "apply" ? "loan-tab active" : "loan-tab"}
            onClick={() => setActiveTab("apply")}
          >
            Apply Loan
          </button>
          <button
            className={activeTab === "my-loans" ? "loan-tab active" : "loan-tab"}
            onClick={() => setActiveTab("my-loans")}
          >
            My Loans
          </button>
        </div>
        <div className="loan-type-list">
          {loanOptions.map((loan) => (
            <button
              key={loan.name}
              className={loan.name === selectedLoan.name ? "loan-option active" : "loan-option"}
              onClick={() => setSelectedLoan(loan)}
            >
              <strong>{loan.name}</strong>
              <span>{loan.interestRate}% interest</span>
            </button>
          ))}
        </div>
      </div>

      {activeTab === "apply" ? (
        <section className="loan-grid">
          <div className="loan-form-card">
            <h3>Loan Application Form</h3>
            <div className="loan-summary">
              <p>{selectedLoan.description}</p>
              <div>
                <strong>Interest</strong>
                <span>{selectedLoan.interestRate}%</span>
              </div>
              <div>
                <strong>Repayment</strong>
                <span>{selectedLoan.repaymentPeriod}</span>
              </div>
              <div>
                <strong>Eligibility</strong>
                <span>{selectedLoan.eligibility}</span>
              </div>
            </div>

            <div className="field-grid">
              <label>
                Member Name
                <input
                  type="text"
                  value={formData.memberName}
                  onChange={handleChange("memberName")}
                  placeholder="name"
                />
              </label>
              <label>
                Loan Amount
                <input
                  type="number"
                  value={formData.amount}
                  onChange={handleChange("amount")}
                  placeholder="KES 0.00"
                />
              </label>
            </div>
            <div className="field-grid">
              <label>
                Purpose
                <input
                  type="text"
                  value={formData.purpose}
                  onChange={handleChange("purpose")}
                  placeholder=" Working capital"
                />
              </label>
              <label>
                Repayment Period
                <input type="text" value={formData.repaymentPeriod} readOnly />
              </label>
            </div>
            <button className="primary" onClick={handleSubmit}>
              Submit Loan Request
            </button>
          </div>

          <div className="loan-notice-card">
            <h3>Loan Notes</h3>
            <p>
              Members can choose the loan type that matches their needs. Once the request is submitted, it will appear in My Loans with a pending status.
            </p>
            <ul>
              <li>Loan details are prefilled based on the selected type.</li>
              <li>Repayment schedule is shown after approval.</li>
              <li>Notifications update you when the loan status changes.</li>
            </ul>
          </div>
        </section>
      ) : (
        <section className="loan-grid">
          <div className="loan-tracking-card full-width">
            <h3>My Loans</h3>
            {applications.length === 0 ? (
              <p>No loan requests have been submitted yet.</p>
            ) : (
              <table className="admin-table">
                <thead>
                  <tr>
                      <th>Loan</th>
                      <th>Member</th>
                      <th>Amount</th>
                      <th>Paid</th>
                      <th>Balance</th>
                      <th>Status</th>
                      <th>Next Due</th>
                      <th>Repayment</th>
                  </tr>
                </thead>
                <tbody>
                  {applications.map((app) => {
                    const amountPaid = Number(app.amountPaid) || 0;
                    const balance = Math.max(Number(app.amount) - amountPaid, 0);

                    return (
                      <tr key={app.id}>
                        <td>{app.loanType}</td>
                        <td>{app.memberName}</td>
                        <td>{formatKes(app.amount)}</td>
                        <td>{formatKes(amountPaid)}</td>
                        <td>{formatKes(balance)}</td>
                        <td>{app.status}</td>
                        <td>{app.nextDue}</td>
                        <td>
                          <div className="repayment-control">
                            <input
                              type="number"
                              min="0"
                              value={repayments[app.id] || ""}
                              onChange={handleRepaymentChange(app.id)}
                              placeholder="KES"
                              disabled={balance === 0}
                            />
                            <button
                              className="small-btn"
                              type="button"
                              onClick={() => handleRepayment(app)}
                              disabled={balance === 0}
                            >
                              Pay
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            )}
          </div>

          <div className="loan-notice-card">
            <h3>Notifications</h3>
            <div className="notifications-list">
              {notifications.length === 0 ? (
                <p>No notifications yet.</p>
              ) : (
                notifications.map((note) => (
                  <div key={note.id} className="notification-item">
                    <span>{note.message}</span>
                    <small>{note.time}</small>
                  </div>
                ))
              )}
            </div>
          </div>
        </section>
      )}
    </div>
  );
}

export default LoanTypes;
