import React, { useEffect, useState } from "react";
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
import { formatKes, getFinanceSummary } from "../utils/financeStore";
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
  });

  const handleLogout = () => {
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

    fetch("http://localhost:5000/api/dashboard/summary")
      .then((response) => response.json())
      .then((data) => {
        if (data) {
          setSummary((prev) => ({
            ...prev,
            pendingApprovals: data.pendingApprovals || prev.pendingApprovals,
          }));
        }
      })
      .catch((err) => console.log("Failed to load dashboard summary:", err));

    return () => window.removeEventListener("digi-finance-updated", refreshFinanceSummary);
  }, []);

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

    async function handleDeleteAccount() {
  const authData = JSON.parse(localStorage.getItem("digiAuth"));
  if (!authData || !authData.id) {
    alert("No account found to delete.");
    return;
  }

  if (!window.confirm("Are you sure you want to delete your account?")) return;

  try {
    const response = await fetch(`http://localhost:5000/api/auth/delete/${authData.id}`, {
      method: "DELETE",
    });
    const data = await response.json();

    if (data.error) {
      alert(data.error);
      return;
    }

    alert("Account deleted successfully.");
    localStorage.removeItem("digiAuth");
    setIsLoggedIn(false);
    setActivePage("login");
  } catch (err) {
    console.error("Delete failed:", err);
    alert("Server error. Could not delete account.");
  }
}


  return (
    <div className="app-shell">
      <Sidebar onSelect={setCurrentSection} activeView={currentSection} />
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
              <button className="icon-btn" aria-label="Notifications">
                <FiBell />
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
                  <span>Checkoff Payments</span>
                </div>
                <strong>{formatKes(summary.checkoffPayments)}</strong>
                <p>Payroll deductions recorded</p>
              </article>
              <article className="summary-card">
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
                <div className="small-card">
                  <div className="small-card-heading">
                    <FiBell />
                    <span>Pending Approvals</span>
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
        {currentSection === "communication" && <Communication />}
        {currentSection === "roles" && <GroupRoles />}
        {currentSection === "expenses" && <ExpensesCategory />}
        {currentSection === "income" && <IncomeCategories />}
        {currentSection === "assets" && <AssetCategories />}
        {currentSection === "groupmanagers" && <GroupAccountManagers />}
        {currentSection === "loans" && <LoanTypes />}

        <div className="dashboard-actions">
  <button className="logout-btn" onClick={handleLogout}>
    Logout
  </button>
  <button className="delete-btn" onClick={handleDeleteAccount}>
    Delete Account
  </button>
</div>


        <button className="logout-btn" onClick={handleLogout}>
          Logout
        </button>
      </main>
    </div>
  );
}

export default Dashboard;
