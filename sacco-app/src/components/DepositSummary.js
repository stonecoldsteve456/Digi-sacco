import React, { useEffect, useState } from "react";
import { formatKes, getFinanceSummary } from "../utils/financeStore";
import { apiRequest, withSacco } from "../utils/api";

function DepositSummary() {
  const [summary, setSummary] = useState(getFinanceSummary());

  useEffect(() => {
    const refreshSummary = () => {
      setSummary(getFinanceSummary());
      let auth = {};
      try {
        auth = JSON.parse(window.localStorage.getItem("digiAuth") || "{}");
      } catch (error) {
        auth = {};
      }
      apiRequest(withSacco(`/dashboard/summary?email=${encodeURIComponent(auth.email || "")}`))
        .then((data) => {
          setSummary((prev) => ({ ...prev, ...data }));
        })
        .catch(() => {});
    };

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
        <span>Pooled Sacco Fund</span>
        <strong>{formatKes(summary.pooledFund)}</strong>
      </div>
      <div className="summary-card">
        <span>My Contributions</span>
        <strong>{formatKes(summary.personalContributions)}</strong>
      </div>
      <div className="summary-card">
        <span>Fixed Contribution</span>
        <strong>{formatKes(summary.fixedContributionAmount)}</strong>
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
