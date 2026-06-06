import React from "react";
import TransactionPage from "./TransactionPage";

function CheckOffs() {
  return (
    <TransactionPage
      type="checkoff"
      title="Check Offs"
      description="Record payroll deductions. Checkoffs count as contribution payments on the dashboard."
      amountLabel="Checkoff Amount"
      defaultDescription="Payroll checkoff"
      submitLabel="Record Checkoff"
    />
  );
}

export default CheckOffs;
