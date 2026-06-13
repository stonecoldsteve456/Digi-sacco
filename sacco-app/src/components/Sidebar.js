import React, { useState } from "react";
import {
  FiBarChart2,
  FiBriefcase,
  FiChevronDown,
  FiCreditCard,
  FiDollarSign,
  FiFileText,
  FiLayers,
  FiMenu,
  FiMessageSquare,
  FiPieChart,
  FiShield,
  FiTrendingUp,
  FiUsers,
  FiX,
} from "react-icons/fi";
import "./Sidebar.css";

function Sidebar({ onSelect, activeView, userRole }) {
  const [isOpen, setIsOpen] = useState(true);
  const [tempOpen, setTempOpen] = useState(false);
  const [openMenu, setOpenMenu] = useState(null);


  const rolePermissions = {
    chairperson: [ 
      "summary", "transactions", "membership", "roles", "loans", 
      "expenses", "income", "assets", "groupmanagers",
      "deposits", "withdrawals", "checkoffs"
    ],
    treasurer: [ 
      "summary", "transactions", "loans", 
      "expenses", "income", "assets", "groupmanagers",
      "deposits", "withdrawals", "checkoffs"
    ],
    secretary: [
      "summary", "membership", "roles", "communication",
      "transactions", "deposits", "withdrawals", "checkoffs", "loans"
    ],
    member: [ 
      "summary", "transactions", "deposits", "withdrawals", "checkoffs", "loans" 
    ]
  };


  const allowedViews = rolePermissions[userRole] || rolePermissions.member;

  const isViewAccessible = (view) => allowedViews.includes(view);
  const canSeeTransactions = ["checkoffs", "deposits", "withdrawals"].some(isViewAccessible);
  const canSeeMembership = ["groupops", "investments", "communication"].some(isViewAccessible);

  const toggleMenu = (menu) => {
    setOpenMenu(openMenu === menu ? null : menu);
  };

  const handleSelect = (view) => {
    
    if (isViewAccessible(view)) {
      if (!isOpen) setTempOpen(true);
      if (onSelect) onSelect(view);
      setOpenMenu(null);
    }
  
  };

  const isOpenActual = isOpen || tempOpen;

  return (
    <>
      <button
        className="mobile-hamburger"
        aria-label="Toggle menu"
        onClick={() => setIsOpen((value) => !value)}
      >
        <FiMenu />
      </button>
      <aside
        className={`sidebar ${isOpenActual ? "open" : "closed"}`}
        onMouseEnter={() => setTempOpen(true)}
        onMouseLeave={() => setTempOpen(false)}
      >
        <button
          className="toggle-btn"
          onClick={() => setIsOpen(!isOpen)}
          aria-label="Collapse sidebar"
        >
          {isOpen ? <FiX /> : <FiMenu />}
        </button>
        <h2 className="logo">
          <span className="logo-mark">DS</span>
          {isOpenActual && <span>DIGI SACCO</span>}
        </h2>
        <ul>
          <li
            className={activeView === "summary" ? "active" : ""}
            onClick={() => handleSelect("summary")}
          >
            <FiBarChart2 />
            <span>Dashboard</span>
          </li>

          {canSeeTransactions && (
            <li onClick={() => toggleMenu("transactions")}>
              <FiCreditCard />
              <span>Transactions</span>
              <FiChevronDown className="menu-caret" />
              {openMenu === "transactions" && (
                <ul className="submenu">
                  {isViewAccessible("checkoffs") && (
                    <li
                      className={activeView === "checkoffs" ? "active" : ""}
                      onClick={(event) => {
                        event.stopPropagation();
                        handleSelect("checkoffs");
                      }}
                    >
                      <FiShield />
                      <span>Check Offs</span>
                    </li>
                  )}
                  {isViewAccessible("deposits") && (
                    <li
                      className={activeView === "deposits" ? "active" : ""}
                      onClick={(event) => {
                        event.stopPropagation();
                        handleSelect("deposits");
                      }}
                    >
                      <FiDollarSign />
                      <span>Deposits</span>
                    </li>
                  )}
                  {isViewAccessible("withdrawals") && (
                    <li
                      className={activeView === "withdrawals" ? "active" : ""}
                      onClick={(event) => {
                        event.stopPropagation();
                        handleSelect("withdrawals");
                      }}
                    >
                      <FiTrendingUp />
                      <span>Withdrawals</span>
                    </li>
                  )}
                </ul>
              )}
            </li>
          )}

          {canSeeMembership && (
            <li onClick={() => toggleMenu("membership")}>
              <FiUsers />
              <span>Membership Management</span>
              <FiChevronDown className="menu-caret" />
              {openMenu === "membership" && (
                <ul className="submenu">
                  {isViewAccessible("groupops") && (
                    <li
                      className={activeView === "groupops" ? "active" : ""}
                      onClick={(event) => {
                        event.stopPropagation();
                        handleSelect("groupops");
                      }}
                    >
                      <FiBriefcase />
                      <span>Group Operations</span>
                    </li>
                  )}
                  {isViewAccessible("investments") && (
                    <li
                      className={activeView === "investments" ? "active" : ""}
                      onClick={(event) => {
                        event.stopPropagation();
                        handleSelect("investments");
                      }}
                    >
                      <FiPieChart />
                      <span>Group Investments</span>
                    </li>
                  )}
                  {isViewAccessible("communication") && (
                    <li
                      className={activeView === "communication" ? "active" : ""}
                      onClick={(event) => {
                        event.stopPropagation();
                        handleSelect("communication");
                      }}
                    >
                      <FiMessageSquare />
                      <span>Communication</span>
                    </li>
                  )}
                </ul>
              )}
            </li>
          )}

          {isViewAccessible("roles") && (
            <li
              className={activeView === "roles" ? "active" : ""}
              onClick={() => handleSelect("roles")}
            >
              <FiShield />
              <span>Group Roles</span>
            </li>
          )}
          {isViewAccessible("loans") && (
            <li
              className={activeView === "loans" ? "active" : ""}
              onClick={() => handleSelect("loans")}
            >
              <FiFileText />
              <span>Loan Types</span>
            </li>
          )}
          {isViewAccessible("expenses") && (
            <li
              className={activeView === "expenses" ? "active" : ""}
              onClick={() => handleSelect("expenses")}
            >
              <FiCreditCard />
              <span>Expense Categories</span>
            </li>
          )}
          {isViewAccessible("income") && (
            <li
              className={activeView === "income" ? "active" : ""}
              onClick={() => handleSelect("income")}
            >
              <FiDollarSign />
              <span>Income Categories</span>
            </li>
          )}
          {isViewAccessible("assets") && (
            <li
              className={activeView === "assets" ? "active" : ""}
              onClick={() => handleSelect("assets")}
            >
              <FiLayers />
              <span>Asset Categories</span>
            </li>
          )}
          {isViewAccessible("groupmanagers") && (
            <li
              className={activeView === "groupmanagers" ? "active" : ""}
              onClick={() => handleSelect("groupmanagers")}
            >
              <FiUsers />
              <span>Group Account Managers</span>
            </li>
          )}
        </ul>
      </aside>
      <div
        className={`sidebar-overlay ${isOpenActual ? "visible" : ""}`}
        onClick={() => {
          setIsOpen(false);
          setTempOpen(false);
        }}
      />
    </>
  );
}

export default Sidebar;
