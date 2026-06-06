import React from "react";
import LiveEntityPage from "./LiveEntityPage";

function AssetCategories() {
  return (
    <LiveEntityPage
      title="Asset Categories"
      description="Track and manage asset categories for your SACCO portfolio."
      endpoint="/categories?type=asset"
      initialForm={{ type: "asset" }}
      fields={[
        { name: "name", label: "Category", placeholder: "Cash Reserves" },
        { name: "description", label: "Description", type: "textarea" },
        { name: "activeItems", label: "Active Items", type: "number", defaultValue: "0" },
        { name: "allocation", label: "Allocation", placeholder: "24%" },
      ]}
      columns={[
        { key: "name", label: "Category" },
        { key: "description", label: "Description" },
        { key: "activeItems", label: "Active Items" },
        { key: "allocation", label: "Allocation" },
      ]}
    />
  );
}

export default AssetCategories;
