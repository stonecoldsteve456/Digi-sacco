import React from "react";
import LiveEntityPage from "./LiveEntityPage";

function GroupOperations() {
  return (
    <LiveEntityPage
      title="Group Operations"
      description="Track SACCO activities, owners, deadlines, and status."
      endpoint="/operations"
      fields={[
        { name: "name", label: "Operation", placeholder: "Monthly reconciliation" },
        { name: "owner", label: "Owner", placeholder: "Secretary" },
        { name: "status", label: "Status", type: "select", options: ["Open", "In Progress", "Done"], defaultValue: "Open" },
        { name: "dueDate", label: "Due Date", type: "date" },
        { name: "description", label: "Description", type: "textarea" },
      ]}
      columns={[
        { key: "name", label: "Operation" },
        { key: "owner", label: "Owner" },
        { key: "status", label: "Status" },
        { key: "dueDate", label: "Due" },
        { key: "description", label: "Description" },
      ]}
    />
  );
}

export default GroupOperations;
