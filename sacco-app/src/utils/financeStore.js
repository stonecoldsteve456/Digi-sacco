const TRANSACTIONS_KEY = "digiTransactions";
const LOANS_KEY = "loanApplications";
const SACCO_ID_KEY = "digiCurrentSaccoId";
const CONTRIBUTION_SETTINGS_KEY = "digiContributionSettings";

const CONTRIBUTION_TYPES = ["deposit", "checkoff"];

function readList(key) {
  try {
    const records = JSON.parse(window.localStorage.getItem(key) || "[]");
    return Array.isArray(records) ? records : [];
  } catch (error) {
    return [];
  }
}

export function getCurrentUser() {
  try {
    return JSON.parse(window.localStorage.getItem("digiAuth") || "{}");
  } catch (error) {
    return {};
  }
}

export function getCurrentSaccoId() {
  try {
    return parseInt(window.localStorage.getItem(SACCO_ID_KEY) || "0", 10);
  } catch (error) {
    return 0;
  }
}

export function setCurrentSaccoId(saccoId) {
  if (saccoId) {
    window.localStorage.setItem(SACCO_ID_KEY, saccoId.toString());
  } else {
    window.localStorage.removeItem(SACCO_ID_KEY);
  }
  window.dispatchEvent(new Event("digi-sacco-updated"));
}

export function getContributionSettings() {
  const settings = readList(CONTRIBUTION_SETTINGS_KEY);
  const saccoId = getCurrentSaccoId();
  return (
    settings.find((record) => Number(record.saccoId) === saccoId) || {
      saccoId,
      contributionAmount: 0,
      contributionFrequency: "Monthly",
      contributionDescription: "",
    }
  );
}

export function saveContributionSettings(settings) {
  const saccoId = Number(settings.saccoId) || getCurrentSaccoId();
  const records = readList(CONTRIBUTION_SETTINGS_KEY);
  const nextRecord = {
    saccoId,
    contributionAmount: Number(settings.contributionAmount) || 0,
    contributionFrequency: settings.contributionFrequency || "Monthly",
    contributionDescription: settings.contributionDescription || "",
  };
  const nextRecords = records.some((record) => Number(record.saccoId) === saccoId)
    ? records.map((record) => (Number(record.saccoId) === saccoId ? nextRecord : record))
    : [nextRecord, ...records];

  window.localStorage.setItem(CONTRIBUTION_SETTINGS_KEY, JSON.stringify(nextRecords));
  window.dispatchEvent(new Event("digi-finance-updated"));
  return nextRecord;
}

export function getTransactions() {
  const records = readList(TRANSACTIONS_KEY);
  const saccoId = getCurrentSaccoId();

  if (saccoId > 0) {
    return records.filter((record) => Number(record.saccoId) === saccoId);
  }

  const user = getCurrentUser();
  if (user.email) {
    return records.filter((record) => record.userEmail === user.email);
  }

  return [];
}

export function saveTransactions(records) {
  window.localStorage.setItem(TRANSACTIONS_KEY, JSON.stringify(records));
  window.dispatchEvent(new Event("digi-finance-updated"));
}

export function addTransaction(record) {
  const user = getCurrentUser();
  const saccoId = getCurrentSaccoId();
  const settings = getContributionSettings();
  const fixedContributionAmount = Number(settings.contributionAmount) || 0;
  const recordStatus = record.status || (record.type === "checkoff" ? "pending" : "approved");
  const shouldUseFixedContribution =
    CONTRIBUTION_TYPES.includes(record.type) &&
    fixedContributionAmount > 0 &&
    !(record.type === "checkoff" && recordStatus === "approved");
  const nextRecord = {
    id: Date.now(),
    memberName: record.memberName || user.name || "Member",
    userEmail: record.userEmail || user.email || "",
    saccoId: record.saccoId || saccoId || null,
    type: record.type,
    amount: shouldUseFixedContribution ? fixedContributionAmount : Number(record.amount) || 0,
    description:
      record.description || (shouldUseFixedContribution ? settings.contributionDescription : "") || "",
    status: recordStatus,
    createdAt: new Date().toISOString(),
  };

  saveTransactions([nextRecord, ...readList(TRANSACTIONS_KEY)]);
  return nextRecord;
}

export function getLoanApplications() {
  const records = readList(LOANS_KEY);
  const saccoId = getCurrentSaccoId();

  if (saccoId > 0) {
    return records.filter((record) => Number(record.saccoId) === saccoId);
  }

  const user = getCurrentUser();
  if (user.email) {
    return records.filter((record) => record.userEmail === user.email);
  }

  return [];
}

export function saveLoanApplications(records) {
  window.localStorage.setItem(LOANS_KEY, JSON.stringify(records));
  window.dispatchEvent(new Event("digi-finance-updated"));
}

export function addLoanApplication(record) {
  const saccoId = getCurrentSaccoId();
  const nextRecord = {
    ...record,
    saccoId: record.saccoId || saccoId || null,
    amount: Number(record.amount) || 0,
  };

  saveLoanApplications([nextRecord, ...readList(LOANS_KEY)]);
  return nextRecord;
}

export function getFinanceSummary() {
  const transactions = getTransactions(); 
  const loans = getLoanApplications();   
  const users = readList("digiUsers");
  const saccoId = getCurrentSaccoId();
  const memberNames = new Set();
  const settings = getContributionSettings();

  users.forEach((user) => {
    if ((!saccoId || Number(user.saccoId) === saccoId) && user.name) {
      memberNames.add(user.name.trim().toLowerCase());
    }
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
        summary.pooledFund += amount;
        if (transaction.userEmail === getCurrentUser().email) summary.personalContributions += amount;
      }

      if (transaction.type === "checkoff") {
        summary.checkoffPayments += amount;
        summary.contributionPayments += amount;
        summary.pooledFund += amount;
        if (transaction.userEmail === getCurrentUser().email) summary.personalContributions += amount;
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
      pooledFund: 0,
      personalContributions: 0,
      fixedContributionAmount: Number(settings.contributionAmount) || 0,
      contributionFrequency: settings.contributionFrequency || "Monthly",
      contributionDescription: settings.contributionDescription || "",
    }
  );
}

export function formatKes(value) {
  return `KES ${(Number(value) || 0).toLocaleString(undefined, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}
