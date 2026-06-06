import React from "react";
import TransactionPage from "./TransactionPage";

function Deposits() {
  return (
    <TransactionPage
      type="deposit"
      title="Member Deposits"
      description="Record member cash or mobile-money deposits and track the total on the dashboard."
      amountLabel="Deposit Amount"
      defaultDescription="Member deposit"
      submitLabel="Record Deposit"
    />
  );
}

export default Deposits;
