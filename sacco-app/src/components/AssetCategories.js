import React from "react";

const assetCategories = [
  {
    name: "Loan Portfolio",
    description: "Primary loans held by members.",
    activeItems: 124,
    allocation: "42%",
  },
  {
    name: "Cash Reserves",
    description: "Liquid cash and bank balances.",
    activeItems: 18,
    allocation: "24%",
  },
  {
    name: "Fixed Assets",
    description: "Office equipment, buildings, and vehicles.",
    activeItems: 33,
    allocation: "20%",
  },
  {
    name: "Investments",
    description: "Long-term investment instruments.",
    activeItems: 27,
    allocation: "14%",
  },
];

function AssetCategories() {
  return (
    <div className="section-shell">
      <div className="section-header">
        <h1>Asset Categories</h1>
        <p>Track and manage asset categories for your SACCO’s portfolio.</p>
      </div>

      <div className="data-panel">
        <table className="data-table">
          <thead>
            <tr>
              <th>Category</th>
              <th>Description</th>
              <th>Active Items</th>
              <th>Allocation</th>
            </tr>
          </thead>
          <tbody>
            {assetCategories.map((item) => (
              <tr key={item.name}>
                <td>{item.name}</td>
                <td>{item.description}</td>
                <td>{item.activeItems}</td>
                <td>{item.allocation}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

export default AssetCategories;
