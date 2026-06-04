const TRANSACTIONS_KEY = "digiTransactions";
const LOANS_KEY = "loanApplications";

export function getCurrentUser() {
  try {
    return JSON.parse(window.localStorage.getItem("digiAuth") || "{}");
  } catch (error) {
    return {};
  }
}

export function getTransactions() {
  try {
    const records = JSON.parse(window.localStorage.getItem(TRANSACTIONS_KEY) || "[]");
    return Array.isArray(records) ? records : [];
  } catch (error) {
    return [];
  }
}

export function saveTransactions(records) {
  window.localStorage.setItem(TRANSACTIONS_KEY, JSON.stringify(records));
  window.dispatchEvent(new Event("digi-finance-updated"));
}

export function addTransaction(record) {
  const user = getCurrentUser();
  const transactions = getTransactions();
  const nextRecord = {
    id: Date.now(),
    memberName: record.memberName || user.name || "Member",
    userEmail: record.userEmail || user.email || "",
    type: record.type,
    amount: Number(record.amount) || 0,
    description: record.description || "",
    createdAt: new Date().toISOString(),
  };

  saveTransactions([nextRecord, ...transactions]);
  return nextRecord;
}

export function getLoanApplications() {
  try {
    const records = JSON.parse(window.localStorage.getItem(LOANS_KEY) || "[]");
    return Array.isArray(records) ? records : [];
  } catch (error) {
    return [];
  }
}

export function saveLoanApplications(records) {
  window.localStorage.setItem(LOANS_KEY, JSON.stringify(records));
  window.dispatchEvent(new Event("digi-finance-updated"));
}

export function addLoanApplication(record) {
  const loans = getLoanApplications();
  const nextRecord = {
    ...record,
    amount: Number(record.amount) || 0,
  };

  saveLoanApplications([nextRecord, ...loans]);
  return nextRecord;
}

export function getFinanceSummary() {
  const transactions = getTransactions();
  const loans = getLoanApplications();
  const users = JSON.parse(window.localStorage.getItem("digiUsers") || "[]");
  const memberNames = new Set();

  users.forEach((user) => {
    if (user.name) memberNames.add(user.name.trim().toLowerCase());
  });
  transactions.forEach((transaction) => {
    if (transaction.memberName) memberNames.add(transaction.memberName.trim().toLowerCase());
  });
  loans.forEach((loan) => {
    if (loan.memberName) memberNames.add(loan.memberName.trim().toLowerCase());
  });

  const loansApplied = loans.reduce((total, loan) => total + (Number(loan.amount) || 0), 0);
  const loanRepaymentsFromLoans = loans.reduce(
    (total, loan) => total + (Number(loan.amountPaid) || 0),
    0
  );

  return transactions.reduce(
    (summary, transaction) => {
      const amount = Number(transaction.amount) || 0;

      if (transaction.type === "deposit") {
        summary.contributionPayments += amount;
      }

      if (transaction.type === "checkoff") {
        summary.checkoffPayments += amount;
        summary.contributionPayments += amount;
      }

      if (transaction.type === "withdrawal") {
        summary.withdrawals += amount;
      }

      if (transaction.type === "loan-repayment") {
        summary.loanRepayments += amount;
      }

      return summary;
    },
    {
      contributionPayments: 0,
      checkoffPayments: 0,
      withdrawals: 0,
      loanRepayments: 0,
      activeMembers: memberNames.size,
      loanApplications: loans.length,
      loansApplied,
      remainingLoanDebt: Math.max(loansApplied - loanRepaymentsFromLoans, 0),
    }
  );
}

export function formatKes(value) {
  return `KES ${(Number(value) || 0).toLocaleString(undefined, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}
