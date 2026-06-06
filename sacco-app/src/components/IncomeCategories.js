import React from "react";
import LiveEntityPage from "./LiveEntityPage";

function IncomeCategories() {
  return (
    <LiveEntityPage
      title="Income Categories"
      description="View and configure income categories for your SACCO."
      endpoint="/categories?type=income"
      initialForm={{ type: "income" }}
      fields={[
        { name: "name", label: "Category", placeholder: "Loan Interest" },
        { name: "description", label: "Description", type: "textarea" },
      ]}
      columns={[
        { key: "name", label: "Category" },
        { key: "description", label: "Description" },
      ]}
    />
  );
}

export default IncomeCategories;
