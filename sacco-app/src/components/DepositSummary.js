import React, { useEffect, useState } from "react";
import { formatKes, getFinanceSummary } from "../utils/financeStore";

function DepositSummary() {
  const [summary, setSummary] = useState(getFinanceSummary());

  useEffect(() => {
    const refreshSummary = () => setSummary(getFinanceSummary());

    refreshSummary();
    window.addEventListener("digi-finance-updated", refreshSummary);
    return () => window.removeEventListener("digi-finance-updated", refreshSummary);
  }, []);

  return (
    <div className="deposit-summary">
      <div className="summary-card">
        <span>Contribution Payments</span>
        <strong>{formatKes(summary.contributionPayments)}</strong>
      </div>
      <div className="summary-card">
        <span>Checkoff Payments</span>
        <strong>{formatKes(summary.checkoffPayments)}</strong>
      </div>
      <div className="summary-card">
        <span>Withdrawals</span>
        <strong>{formatKes(summary.withdrawals)}</strong>
      </div>
    </div>
  );
}

export default DepositSummary;
