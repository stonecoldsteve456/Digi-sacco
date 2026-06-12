import React, { useCallback, useEffect, useState } from "react";
import {
  FiArrowUpRight,
  FiBell,
  FiCreditCard,
  FiDownload,
  FiPieChart,
  FiRefreshCw,
  FiTrendingUp,
  FiUser,
} from "react-icons/fi";
import { formatKes, getCurrentSaccoId, getFinanceSummary } from "../utils/financeStore";
import { apiRequest, withSacco } from "../utils/api";
import Sidebar from "./Sidebar";
import SearchBar from "./SearchBar";
import DepositSummary from "./DepositSummary";
import Deposits from "./Deposits";
import BarChart from "./BarChart";
import Withdrawals from "./Withdrawals";
import CheckOffs from "./CheckOffs";
import MembershipManagement from "./MembershipManagement";
import GroupOperations from "./GroupOperations";
import GroupInvestments from "./GroupInvestments";
import Communication from "./Communication";
import GroupRoles from "./GroupRoles";
import ExpensesCategory from "./ExpensesCategory";
import IncomeCategories from "./IncomeCategories";
import AssetCategories from "./AssetCategories";
import GroupAccountManagers from "./GroupAccountManagers";
import LoanTypes from "./LoanTypes";

const MESSAGE_READ_KEY_PREFIX = "digiCommunicationLastViewed";

function Dashboard({ setIsLoggedIn, setActivePage }) {
  const [currentSection, setCurrentSection] = useState("summary");
  const [searchText, setSearchText] = useState("");
  const [currentUser, setCurrentUser] = useState({
    name: "Member",
    role: "member",
    saccoName: "Digi Sacco",
  });
  const [summary, setSummary] = useState({
    contributionPayments: 0,
    checkoffPayments: 0,
    withdrawals: 0,
    loansApplied: 0,
    loanRepayments: 0,
    remainingLoanDebt: 0,
    loanApplications: 0,
    activeMembers: 0,
    pendingApprovals: 0,
    pooledFund: 0,
    personalContributions: 0,
    fixedContributionAmount: 0,
    contributionFrequency: "Monthly",
  });
  const [unreadMessages, setUnreadMessages] = useState(0);

  const getMessageReadKey = useCallback(() => {
    const saccoId = getCurrentSaccoId() || "all";
    const userKey = (currentUser.name || "member").trim().toLowerCase().replace(/\s+/g, "-");
    return `${MESSAGE_READ_KEY_PREFIX}:${saccoId}:${userKey}`;
  }, [currentUser.name]);

  const getLastViewedMessagesAt = useCallback(
    () => Number(window.localStorage.getItem(getMessageReadKey()) || 0),
    [getMessageReadKey]
  );

  const markMessagesViewed = useCallback(() => {
    window.localStorage.setItem(getMessageReadKey(), String(Date.now()));
    setUnreadMessages(0);
  }, [getMessageReadKey]);

  const loadUnreadMessages = useCallback(() => {
    apiRequest(withSacco("/communications"))
      .then((records) => {
        const lastViewedAt = getLastViewedMessagesAt();
        const unreadCount = (Array.isArray(records) ? records : []).filter((record) => {
          const createdAt = new Date(record.createdAt || record.created_at || 0).getTime();
          return createdAt > lastViewedAt;
        }).length;
        setUnreadMessages(unreadCount);
      })
      .catch((err) => console.log("Failed to load message notifications:", err));
  }, [getLastViewedMessagesAt]);

  const openMessages = () => {
    setCurrentSection("communication");
    markMessagesViewed();
  };

  const handleLogout = () => {
    window.localStorage.removeItem("digiAuth");
    window.localStorage.removeItem("digiCurrentSaccoId");
    window.dispatchEvent(new Event("digi-finance-updated"));
    window.dispatchEvent(new Event("digi-sacco-updated"));
    setIsLoggedIn(false);
    setActivePage("landing");
  };

  useEffect(() => {
    const storedAuth = window.localStorage.getItem("digiAuth");
    if (storedAuth) {
      try {
        const authData = JSON.parse(storedAuth);
        setCurrentUser({
          name: authData.name || "Member",
          role: authData.role || "member",
          saccoName: authData.saccoName || "Digi Sacco",
        });
      } catch (error) {
        console.log("Failed to read logged-in user:", error);
      }
    }

    const refreshFinanceSummary = () => {
      setSummary((prev) => ({
        ...prev,
        ...getFinanceSummary(),
      }));
    };

    refreshFinanceSummary();
    window.addEventListener("digi-finance-updated", refreshFinanceSummary);

    const authEmail = (() => {
      try {
        return JSON.parse(window.localStorage.getItem("digiAuth") || "{}").email || "";
      } catch (error) {
        return "";
      }
    })();
    const authRole = (() => {
      try {
        return JSON.parse(window.localStorage.getItem("digiAuth") || "{}").role || "member";
      } catch (error) {
        return "member";
      }
    })();
    const loanScope = authRole === "member" ? "&loanScope=member" : "";

    apiRequest(withSacco(`/dashboard/summary?email=${encodeURIComponent(authEmail)}${loanScope}`))
      .then((data) => {
        if (data) {
          setSummary((prev) => ({
            ...prev,
            ...data,
          }));
        }
      })
      .catch((err) => console.log("Failed to load dashboard summary:", err));

    return () => window.removeEventListener("digi-finance-updated", refreshFinanceSummary);
  }, []);

  useEffect(() => {
    if (currentSection === "communication") {
      markMessagesViewed();
      return undefined;
    }

    loadUnreadMessages();
    const refreshInterval = window.setInterval(loadUnreadMessages, 10000);
    const handleNewRecord = (event) => {
      if (event.detail?.endpoint === "/communications") {
        loadUnreadMessages();
      }
    };
    const handleStorage = (event) => {
      if (event.key === getMessageReadKey()) {
        loadUnreadMessages();
      }
    };

    window.addEventListener("digi-record-created", handleNewRecord);
    window.addEventListener("storage", handleStorage);

    return () => {
      window.clearInterval(refreshInterval);
      window.removeEventListener("digi-record-created", handleNewRecord);
      window.removeEventListener("storage", handleStorage);
    };
  }, [currentSection, currentUser.name, getMessageReadKey, loadUnreadMessages, markMessagesViewed]);

  const formatRole = (role) =>
    role
      .replace(/-/g, " ")
      .replace(/\b\w/g, (letter) => letter.toUpperCase());

  const initials = currentUser.name
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0])
    .join("")
    .toUpperCase() || "M";

   return (
     <div className="app-shell">
       <Sidebar onSelect={setCurrentSection} activeView={currentSection} userRole={currentUser.role} />
      <main className="main-content">
        <header className="dashboard-header">
          <div>
            <p className="eyebrow">{currentUser.saccoName}</p>
            <h1>Deposits Summary</h1>
            <p className="dashboard-copy">
              Monitor deposits, payments, and performance trends in one clean view.
            </p>
          </div>
          <div className="dashboard-actions">
            <SearchBar onSearch={setSearchText} />
            <div className="user-actions">
              <button
                className={`icon-btn notification-bell${unreadMessages > 0 ? " has-unread" : ""}`}
                aria-label={
                  unreadMessages > 0
                    ? `${unreadMessages} unread message${unreadMessages === 1 ? "" : "s"}`
                    : "No unread messages"
                }
                type="button"
                onClick={openMessages}
              >
                <FiBell />
                {unreadMessages > 0 && (
                  <span className="notification-badge" aria-hidden="true">
                    {unreadMessages > 99 ? "99+" : unreadMessages}
                  </span>
                )}
              </button>
              <button className="icon-btn" aria-label="Refresh dashboard">
                <FiRefreshCw />
              </button>
              <button className="profile-btn" type="button">
                <span className="avatar">{initials}</span>
                <span>{formatRole(currentUser.role)}</span>
              </button>
            </div>
          </div>
        </header>

        {currentSection === "summary" && (
          <>
            <nav className="dashboard-tabs" aria-label="Dashboard sections">
              <button className="active" type="button">
                Dashboard
              </button>
              <button type="button" onClick={() => setCurrentSection("deposits")}>
                Listing
              </button>
              <button type="button" onClick={() => setCurrentSection("withdrawals")}>
                Reconcile
              </button>
              <button type="button" onClick={() => setCurrentSection("checkoffs")}>
                Record Deposits
              </button>
            </nav>

            <section className="summary-cards">
              <article className="summary-card">
                <div className="card-meta">
                  <div className="card-icon">
                    <FiCreditCard />
                  </div>
                  <span>Contribution Payments</span>
                </div>
                <strong>{formatKes(summary.contributionPayments)}</strong>
                <p>Deposits plus checkoffs recorded</p>
              </article>
              <article className="summary-card">
                <div className="card-meta">
                  <div className="card-icon">
                    <FiPieChart />
                  </div>
                  <span>Pooled Sacco Fund</span>
                </div>
                <strong>{formatKes(summary.pooledFund)}</strong>
                <p>All member contributions aggregated</p>
              </article>
              <article className="summary-card">
                <div className="card-meta">
                  <div className="card-icon">
                    <FiUser />
                  </div>
                  <span>My Contributions</span>
                </div>
                <strong>{formatKes(summary.personalContributions)}</strong>
                <p>Personal contribution record</p>
              </article>
              <article className="summary-card">
                <div className="card-meta">
                  <div className="card-icon">
                    <FiCreditCard />
                  </div>
                  <span>Fixed Contribution</span>
                </div>
                <strong>{formatKes(summary.fixedContributionAmount)}</strong>
                <p>{summary.contributionFrequency} for every role</p>
              </article>
              <article className="summary-card">
                <div className="card-meta">
                  <div className="card-icon">
                    <FiPieChart />
                  </div>
                  <span>Checkoff Payments</span>
                </div>
                <strong>{formatKes(summary.checkoffPayments)}</strong>
                <p>Payroll deductions recorded</p>
              </article>
              <article
                className="summary-card clickable-card"
                role="button"
                tabIndex="0"
                onClick={() => setCurrentSection("loans")}
                onKeyDown={(event) => {
                  if (event.key === "Enter" || event.key === " ") setCurrentSection("loans");
                }}
              >
                <div className="card-meta">
                  <div className="card-icon">
                    <FiTrendingUp />
                  </div>
                  <span>Withdrawals</span>
                </div>
                <strong>{formatKes(summary.withdrawals)}</strong>
                <p>Member withdrawals recorded</p>
              </article>
              <article className="summary-card">
                <div className="card-meta">
                  <div className="card-icon">
                    <FiTrendingUp />
                  </div>
                  <span>Loans Applied</span>
                </div>
                <strong>{formatKes(summary.loansApplied)}</strong>
                <p>{summary.loanApplications.toLocaleString()} loan request(s)</p>
              </article>
              <article className="summary-card">
                <div className="card-meta">
                  <div className="card-icon">
                    <FiCreditCard />
                  </div>
                  <span>Loan Repayments</span>
                </div>
                <strong>{formatKes(summary.loanRepayments)}</strong>
                <p>Payments made against loans</p>
              </article>
              <article className="summary-card">
                <div className="card-meta">
                  <div className="card-icon">
                    <FiPieChart />
                  </div>
                  <span>Remaining Loan Debt</span>
                </div>
                <strong>{formatKes(summary.remainingLoanDebt)}</strong>
                <p>Outstanding member loan balance</p>
              </article>
            </section>

            <section className="chart-panel">
              <div className="chart-card">
                <div className="chart-card-header">
                  <div>
                    <h2>Deposit Trends</h2>
                    <p>Performance over the last 6 months</p>
                  </div>
                  <div className="chart-actions">
                    <button className="primary">
                      View Report <FiArrowUpRight />
                    </button>
                    <button className="secondary report-download" aria-label="Download report">
                      <FiDownload />
                    </button>
                  </div>
                </div>
                <BarChart />
              </div>

              <div className="side-cards">
                <div className="small-card">
                  <div className="small-card-heading">
                    <FiUser />
                    <span>Active Members</span>
                  </div>
                  <strong>{summary.activeMembers.toLocaleString()}</strong>
                </div>
                <div
                  className="small-card clickable-card"
                  role="button"
                  tabIndex="0"
                  onClick={() => setCurrentSection("loans")}
                  onKeyDown={(event) => {
                    if (event.key === "Enter" || event.key === " ") setCurrentSection("loans");
                  }}
                >
                  <div className="small-card-heading">
                    <FiBell />
                    <span>{currentUser.role === "chairperson" ? "Pending Loan Approvals" : "Pending Approvals"}</span>
                  </div>
                  <strong>{summary.pendingApprovals.toLocaleString()}</strong>
                </div>
              </div>
            </section>
          </>
        )}

        {currentSection === "deposits" && (
          <>
            {searchText && <p>Search Result: {searchText}</p>}
            <DepositSummary />
            <Deposits />
          </>
        )}

        {currentSection === "withdrawals" && <Withdrawals />}
        {currentSection === "checkoffs" && <CheckOffs />}
        {currentSection === "membership" && <MembershipManagement />}
        {currentSection === "groupops" && <GroupOperations />}
        {currentSection === "investments" && <GroupInvestments />}
        {currentSection === "communication" && (
          <Communication mode={currentUser.role === "secretary" ? "manage" : "read"} />
        )}
        {currentSection === "roles" && <GroupRoles />}
        {currentSection === "expenses" && <ExpensesCategory />}
        {currentSection === "income" && <IncomeCategories />}
        {currentSection === "assets" && <AssetCategories />}
        {currentSection === "groupmanagers" && <GroupAccountManagers />}
        {currentSection === "loans" && <LoanTypes />}

        <button className="logout-btn" onClick={handleLogout}>
          Logout
        </button>
      </main>
    </div>
  );
}

export default Dashboard;
