import React, { useEffect, useState } from "react";
import {
  addLoanApplication,
  addTransaction,
  formatKes,
  getCurrentUser,
  getLoanApplications,
  saveLoanApplications,
} from "../utils/financeStore";

// Enhanced loan options with approval limits
const loanOptions = [
  {
    name: "Personal Loan",
    interestRate: 12,
    repaymentPeriod: "12 months",
    eligibility: "Active member for 6+ months",
    description: "A personal loan for household and individual needs.",
    maxAmount: 50000, // KES 50,000
    minApprovalLevel: "teller", // Can be approved by teller
  },
  {
    name: "Business Loan",
    interestRate: 14,
    repaymentPeriod: "18 months",
    eligibility: "Business plan and member savings history",
    description: "A loan to finance business growth or inventory.",
    maxAmount: 500000, // KES 500,000
    minApprovalLevel: "chairperson", // Requires chairperson approval
  },
  {
    name: "Emergency Loan",
    interestRate: 10,
    repaymentPeriod: "6 months",
    eligibility: "Immediate personal emergency support.",
    description: "Quick access to funds for urgent needs.",
    maxAmount: 20000, // KES 20,000
    minApprovalLevel: "teller",
  },
  {
    name: "Education Loan",
    interestRate: 8,
    repaymentPeriod: "24 months",
    eligibility: "School fees and training support.",
    description: "Support members paying for education and training.",
    maxAmount: 100000, // KES 100,000
    minApprovalLevel: "supervisor",
  },
  {
    name: "Development Loan",
    interestRate: 11,
    repaymentPeriod: "20 months",
    eligibility: "Project-based financing for members.",
    description: "Loans for larger development projects.",
    maxAmount: 1000000, // KES 1,000,000
    minApprovalLevel: "board", // Requires board approval
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
  const [auditLogs, setAuditLogs] = useState([]);
  const [showReport, setShowReport] = useState(false);
  const [reportType, setReportType] = useState("loan-portfolio");
  
  // User role hierarchy for approvals
  const roleHierarchy = {
    "member": 0,
    "teller": 1,
    "supervisor": 2,
    "chairperson": 3,
    "board": 4
  };
  
  const userRole = currentUser.role || "member";
  const userRoleLevel = roleHierarchy[userRole] || 0;

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

  const calculateRepaymentSchedule = (principal, annualInterestRate, repaymentPeriodStr) => {
    // Convert repayment period string to months (e.g., "12 months" -> 12)
    const months = parseInt(repaymentPeriodStr);
    if (isNaN(months) || months <= 0) return [];

    // Convert annual interest rate to monthly
    const monthlyRate = annualInterestRate / 100 / 12;
    
    // Calculate monthly payment using amortization formula
    // Payment = P * r * (1 + r)^n / ((1 + r)^n - 1)
    let monthlyPayment;
    if (monthlyRate === 0) {
      monthlyPayment = principal / months;
    } else {
      monthlyPayment = principal * monthlyRate * Math.pow(1 + monthlyRate, months) / (Math.pow(1 + monthlyRate, months) - 1);
    }
    
    const schedule = [];
    let remainingBalance = principal;
    
    for (let i = 1; i <= months; i++) {
      const interestPayment = remainingBalance * monthlyRate;
      const principalPayment = monthlyPayment - interestPayment;
      remainingBalance -= principalPayment;
      
      // Ensure we don't go negative due to rounding
      if (remainingBalance < 0) {
        remainingBalance = 0;
      }
      
      // Calculate due date (assuming monthly payments starting from next month)
      const dueDate = new Date();
      dueDate.setMonth(dueDate.getMonth() + i);
      
      schedule.push({
        installmentNumber: i,
        dueDate: dueDate.toISOString().split('T')[0], // YYYY-MM-DD format
        amountDue: Math.round(monthlyPayment * 100) / 100, // Round to 2 decimal places
        principalPayment: Math.round(principalPayment * 100) / 100,
        interestPayment: Math.round(interestPayment * 100) / 100,
        remainingBalance: Math.round(remainingBalance * 100) / 100,
        paid: false,
        paymentDate: null,
        paymentAmount: 0
      });
    }
    
    return schedule;
  };

  const handleSubmit = () => {
    if (!formData.memberName || !formData.amount || !formData.purpose) {
      alert("Please complete all fields before submitting.");
      return;
    }

    // Calculate repayment schedule based on loan terms
    const repaymentSchedule = calculateRepaymentSchedule(
      Number(formData.amount),
      selectedLoan.interestRate,
      selectedLoan.repaymentPeriod
    );
    
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
      approvalStatus: "Pending",
      approvedBy: null,
      approvedAt: null,
      disbursementStatus: "Pending", // Pending, Disbursed, Cancelled
      disbursedAt: null,
      disbursedBy: null,
      repaymentSchedule: repaymentSchedule,
      totalRepaymentAmount: repaymentSchedule.reduce((sum, installment) => sum + installment.amountDue, 0),
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
      
      // Update repayment schedule with this payment
      const updatedSchedule = [...(application.repaymentSchedule || [])];
      let remainingPayment = paymentAmount;
      
      // Apply payment to installments in order (oldest first)
      for (let i = 0; i < updatedSchedule.length && remainingPayment > 0; i++) {
        const installment = updatedSchedule[i];
        if (!installment.paid) {
          const amountToApply = Math.min(remainingPayment, installment.amountDue);
          installment.paid = true;
          installment.paymentDate = new Date().toISOString().split('T')[0];
          installment.paymentAmount = amountToApply;
          remainingPayment -= amountToApply;
        }
      }
      
      return {
        ...application,
        amountPaid: nextPaid,
        repayments: [repaymentRecord, ...(application.repayments || [])],
        status: nextPaid >= Number(application.amount) ? "Paid" : application.status,
        repaymentSchedule: updatedSchedule,
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

  const handleDisburseLoan = (loan) => {
    const updatedApplications = applications.map((application) => {
      if (application.id !== loan.id) return application;
      
      // Only allow disbursement if approved
      if (application.approvalStatus !== "Approved") {
        alert("Loan must be approved before disbursement.");
        return application;
      }
      
      return {
        ...application,
        disbursementStatus: "Disbursed",
        disbursedAt: new Date().toISOString(),
        disbursedBy: currentUser.name,
        // Update nextDue to reflect first payment date if schedule exists
        nextDue: application.repaymentSchedule && application.repaymentSchedule.length > 0 
          ? application.repaymentSchedule[0].dueDate 
          : "In 30 days"
      };
    });
    
    setApplications(updatedApplications);
    saveLoanApplications(updatedApplications);
    addNotification(`Loan for ${loan.memberName} disbursed by ${currentUser.name}.`);
  };

  const handleApprove = (loan) => {
    const updatedApplications = applications.map((application) => {
      if (application.id !== loan.id) return application;
      return {
        ...application,
        approvalStatus: "Approved",
        approvedBy: currentUser.name,
        approvedAt: new Date().toISOString(),
      };
    });
    setApplications(updatedApplications);
    saveLoanApplications(updatedApplications);
    addNotification(`Loan for ${loan.memberName} approved by ${currentUser.name}.`);
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
                       <th>Approval</th>
                       <th>Disbursement</th>
                       <th>Approved By</th>
                       <th>Next Due</th>
                       <th>Repayment</th>
                       <th>Actions</th>
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
                          <td>
                            {isChairperson && app.approvalStatus === "Pending" ? (
                              <button className="small-btn" onClick={() => handleApprove(app)}>
                                Approve
                              </button>
                            ) : (
                              <span>{app.approvalStatus}</span>
                            )}
                          </td>
                          <td>
                            {isChairperson && app.approvalStatus === "Approved" && app.disbursementStatus === "Pending" ? (
                              <button className="small-btn" onClick={() => handleDisburseLoan(app)}>
                                Disburse
                              </button>
                            ) : (
                              <span>{app.disbursementStatus}</span>
                            )}
                          </td>
                          <td>{app.approvedBy || "-"}</td>
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
                          <td>
                            {isChairperson && app.approvalStatus === "Approved" && app.repaymentSchedule ? (
                              <button 
                                className="small-btn" 
                                onClick={() => showRepaymentSchedule(app)}
                              >
                                Schedule
                              </button>
                            ) : null}
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
