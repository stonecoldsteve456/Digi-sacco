import React from "react";
import LiveEntityPage from "./LiveEntityPage";

function Communication() {
  return (
    <LiveEntityPage
      title="Communication"
      description="Create and review announcements sent to SACCO members."
      endpoint="/communications"
      fields={[
        { name: "subject", label: "Subject", placeholder: "Annual meeting notice" },
        { name: "audience", label: "Audience", placeholder: "All members", defaultValue: "All members" },
        { name: "channel", label: "Channel", type: "select", options: ["Notice", "SMS", "Email", "WhatsApp"], defaultValue: "Notice" },
        { name: "message", label: "Message", type: "textarea" },
      ]}
      columns={[
        { key: "subject", label: "Subject" },
        { key: "audience", label: "Audience" },
        { key: "channel", label: "Channel" },
        { key: "message", label: "Message" },
        { key: "createdBy", label: "Created By" },
      ]}
    />
  );
}

export default Communication;
