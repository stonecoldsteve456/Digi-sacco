import React from "react";
import TransactionPage from "./TransactionPage";

function Withdrawals() {
  return (
    <TransactionPage
      type="withdrawal"
      title="Withdrawals"
      description="Record member withdrawals and watch the dashboard withdrawal total update."
      amountLabel="Withdrawal Amount"
      defaultDescription="Member withdrawal"
      submitLabel="Record Withdrawal"
    />
  );
}

export default Withdrawals;
