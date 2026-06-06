import React from "react";
import LiveEntityPage from "./LiveEntityPage";

function GroupRoles() {
  return (
    <LiveEntityPage
      title="Group Roles"
      description="Define and manage live SACCO roles and permissions."
      endpoint="/roles"
      fields={[
        { name: "title", label: "Role Title", placeholder: "Treasurer" },
        { name: "permissions", label: "Permissions", placeholder: "Deposits, withdrawals, reports" },
        { name: "description", label: "Description", type: "textarea" },
      ]}
      columns={[
        { key: "title", label: "Role" },
        { key: "permissions", label: "Permissions" },
        { key: "description", label: "Description" },
      ]}
    />
  );
}

export default GroupRoles;
