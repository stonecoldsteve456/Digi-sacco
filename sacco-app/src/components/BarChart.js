import React, { useState } from "react";

function BarChart() {
  const [data] = useState([
    { label: "Jan", value: 200000 },
    { label: "Feb", value: 300000 },
    { label: "Mar", value: 150000 },
    { label: "Apr", value: 400000 },
    { label: "May", value: 350000 },
  ]);

  return (
    <div className="bar-chart">
      {data.map((item, index) => (
        <div key={index} className="bar">
          <div
            className="bar-fill"
            style={{ height: `${item.value / 5000}px` }}
          ></div>
          <span>{item.label}</span>
        </div>
      ))}
    </div>
  );
}

export default BarChart;
