import React from "react";
import LiveEntityPage from "./LiveEntityPage";
import { formatKes } from "../utils/financeStore";

function GroupInvestments() {
  return (
    <LiveEntityPage
      title="Group Investments"
      description="Track investment projects, committed amounts, returns, and status."
      endpoint="/investments"
      fields={[
        { name: "name", label: "Investment", placeholder: "Treasury bills" },
        { name: "amount", label: "Amount", type: "number", placeholder: "0" },
        { name: "expectedReturn", label: "Expected Return", type: "number", placeholder: "0" },
        { name: "status", label: "Status", type: "select", options: ["Active", "Maturing", "Closed"], defaultValue: "Active" },
        { name: "description", label: "Description", type: "textarea" },
      ]}
      columns={[
        { key: "name", label: "Investment" },
        { key: "amount", label: "Amount", render: (record) => formatKes(record.amount) },
        { key: "expectedReturn", label: "Expected Return", render: (record) => formatKes(record.expectedReturn) },
        { key: "status", label: "Status" },
        { key: "description", label: "Description" },
      ]}
    />
  );
}

export default GroupInvestments;
