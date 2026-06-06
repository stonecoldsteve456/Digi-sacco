import React from "react";
import LiveEntityPage from "./LiveEntityPage";

function ExpensesCategory() {
  return (
    <LiveEntityPage
      title="Expense Categories"
      description="Manage expense categories and budget classifications."
      endpoint="/categories?type=expense"
      initialForm={{ type: "expense" }}
      fields={[
        { name: "name", label: "Category", placeholder: "Staff Costs" },
        { name: "description", label: "Description", type: "textarea" },
      ]}
      columns={[
        { key: "name", label: "Category" },
        { key: "description", label: "Description" },
      ]}
    />
  );
}

export default ExpensesCategory;
