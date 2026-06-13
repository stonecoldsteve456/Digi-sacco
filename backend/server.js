const express = require("express");
const cors = require("cors");
const { initializeDatabase, getMainPool } = require("./db");
require("dotenv").config();

const app = express();
const port = process.env.PORT || 5000;

app.use(cors());
app.use(express.json());

async function ensureColumn(pool, tableName, columnName, definition) {
  const dbName = process.env.DB_NAME || "digisacco";
  const [rows] = await pool.execute(
    "SELECT COUNT(*) AS count FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = ? AND TABLE_NAME = ? AND COLUMN_NAME = ?",
    [dbName, tableName, columnName]
  );

  if (rows[0].count === 0) {
    await pool.execute(`ALTER TABLE ${tableName} ADD COLUMN ${columnName} ${definition}`);
  }
}

function parseSaccoId(value) {
  const saccoId = Number(value);
  return Number.isFinite(saccoId) && saccoId > 0 ? saccoId : null;
}

function isContributionType(type) {
  return ["deposit", "checkoff"].includes(type);
}

function parseJsonField(value, fallback) {
  if (!value) return fallback;
  try {
    return JSON.parse(value);
  } catch (error) {
    return fallback;
  }
}

function toMysqlDateTime(value) {
  if (!value) return null;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return null;
  return date.toISOString().slice(0, 19).replace("T", " ");
}

function normalizeChatMessages(messages) {
  if (!Array.isArray(messages)) return [];
  return messages
    .slice(-12)
    .map((message) => ({
      role: message.role === "assistant" || message.role === "model" ? "model" : "user",
      parts: [{ text: String(message.text || message.content || "").slice(0, 1000) }],
    }))
    .filter((message) => message.parts[0].text.trim());
}

function getRepaymentMonths(repaymentPeriod) {
  const months = parseInt(repaymentPeriod, 10);
  return Number.isFinite(months) && months > 0 ? months : 1;
}

function calculateTotalRepaymentAmount(principal, annualInterestRate, repaymentPeriod) {
  const loanAmount = Number(principal) || 0;
  const months = getRepaymentMonths(repaymentPeriod);
  const monthlyRate = (Number(annualInterestRate) || 0) / 100 / 12;

  if (loanAmount <= 0) return 0;
  if (monthlyRate === 0) return Math.round(loanAmount * 100) / 100;

  const monthlyPayment =
    (loanAmount * monthlyRate * Math.pow(1 + monthlyRate, months)) /
    (Math.pow(1 + monthlyRate, months) - 1);

  return Math.round(monthlyPayment * months * 100) / 100;
}

async function createTables() {
  const pool = getMainPool();

  await pool.execute(`
    CREATE TABLE IF NOT EXISTS sacco (
      id INT AUTO_INCREMENT PRIMARY KEY,
      name VARCHAR(150) NOT NULL UNIQUE,
      description TEXT,
      registration_number VARCHAR(100),
      country VARCHAR(50) DEFAULT 'Kenya',
      currency VARCHAR(20) DEFAULT 'KES',
      contribution_amount DECIMAL(15,2) NOT NULL DEFAULT 0,
      contribution_frequency VARCHAR(40) DEFAULT 'Monthly',
      contribution_description VARCHAR(255),
      is_active BOOLEAN DEFAULT TRUE,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
    ) ENGINE=InnoDB;
  `);
  await ensureColumn(pool, "sacco", "contribution_amount", "DECIMAL(15,2) NOT NULL DEFAULT 0");
  await ensureColumn(pool, "sacco", "contribution_frequency", "VARCHAR(40) DEFAULT 'Monthly'");
  await ensureColumn(pool, "sacco", "contribution_description", "VARCHAR(255) NULL");

  await pool.execute(`
    CREATE TABLE IF NOT EXISTS users (
      id INT AUTO_INCREMENT PRIMARY KEY,
      name VARCHAR(120) NOT NULL,
      id_number VARCHAR(100) NOT NULL,
      email VARCHAR(150) NOT NULL UNIQUE,
      password_hash VARCHAR(255) NOT NULL,
      role VARCHAR(40) NOT NULL DEFAULT 'member',
      sacco_id INT NULL,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (sacco_id) REFERENCES sacco(id) ON DELETE SET NULL
    ) ENGINE=InnoDB;
  `);
  await ensureColumn(pool, "users", "role", "VARCHAR(40) NOT NULL DEFAULT 'member' AFTER password_hash");
  await ensureColumn(pool, "users", "sacco_id", "INT NULL AFTER password_hash");

  await pool.execute(`
    CREATE TABLE IF NOT EXISTS transactions (
      id INT AUTO_INCREMENT PRIMARY KEY,
      user_email VARCHAR(150) NOT NULL,
      member_name VARCHAR(120),
      sacco_id INT NULL,
      type VARCHAR(40) NOT NULL,
      amount DECIMAL(15,2) NOT NULL,
      description VARCHAR(255),
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (sacco_id) REFERENCES sacco(id) ON DELETE SET NULL,
      INDEX idx_user_email (user_email),
      INDEX idx_sacco_id (sacco_id)
    ) ENGINE=InnoDB;
  `);
  await ensureColumn(pool, "transactions", "member_name", "VARCHAR(120) NULL AFTER user_email");
  await ensureColumn(pool, "transactions", "sacco_id", "INT NULL AFTER member_name");
  await ensureColumn(pool, "transactions", "status", "VARCHAR(40) DEFAULT 'approved' AFTER description");

  await pool.execute(`
    CREATE TABLE IF NOT EXISTS categories (
      id INT AUTO_INCREMENT PRIMARY KEY,
      sacco_id INT NULL,
      type VARCHAR(40) NOT NULL,
      name VARCHAR(120) NOT NULL,
      description VARCHAR(255) NOT NULL,
      active_items INT DEFAULT 0,
      allocation VARCHAR(40) DEFAULT '',
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      INDEX idx_category_sacco (sacco_id)
    ) ENGINE=InnoDB;
  `);
  await ensureColumn(pool, "categories", "sacco_id", "INT NULL AFTER id");
  await ensureColumn(pool, "categories", "active_items", "INT DEFAULT 0");
  await ensureColumn(pool, "categories", "allocation", "VARCHAR(40) DEFAULT ''");
  await ensureColumn(pool, "categories", "created_at", "TIMESTAMP DEFAULT CURRENT_TIMESTAMP");

  await pool.execute(`
    CREATE TABLE IF NOT EXISTS group_account_managers (
      id INT AUTO_INCREMENT PRIMARY KEY,
      sacco_id INT NULL,
      name VARCHAR(120) NOT NULL,
      group_name VARCHAR(120) NOT NULL,
      email VARCHAR(150) NOT NULL,
      phone VARCHAR(40) NOT NULL,
      status VARCHAR(60) NOT NULL,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      INDEX idx_manager_sacco (sacco_id)
    ) ENGINE=InnoDB;
  `);
  await ensureColumn(pool, "group_account_managers", "sacco_id", "INT NULL AFTER id");
  await ensureColumn(pool, "group_account_managers", "created_at", "TIMESTAMP DEFAULT CURRENT_TIMESTAMP");

  await pool.execute(`
    CREATE TABLE IF NOT EXISTS group_roles (
      id INT AUTO_INCREMENT PRIMARY KEY,
      sacco_id INT NULL,
      title VARCHAR(120) NOT NULL,
      permissions VARCHAR(255) NOT NULL,
      description TEXT,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      INDEX idx_role_sacco (sacco_id)
    ) ENGINE=InnoDB;
  `);

  await pool.execute(`
    CREATE TABLE IF NOT EXISTS group_operations (
      id INT AUTO_INCREMENT PRIMARY KEY,
      sacco_id INT NULL,
      name VARCHAR(120) NOT NULL,
      owner VARCHAR(120) NOT NULL,
      status VARCHAR(60) NOT NULL,
      description TEXT,
      due_date DATE NULL,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      INDEX idx_operation_sacco (sacco_id)
    ) ENGINE=InnoDB;
  `);

  await pool.execute(`
    CREATE TABLE IF NOT EXISTS group_investments (
      id INT AUTO_INCREMENT PRIMARY KEY,
      sacco_id INT NULL,
      name VARCHAR(120) NOT NULL,
      amount DECIMAL(15,2) NOT NULL DEFAULT 0,
      expected_return DECIMAL(15,2) NOT NULL DEFAULT 0,
      status VARCHAR(60) NOT NULL,
      description TEXT,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      INDEX idx_investment_sacco (sacco_id)
    ) ENGINE=InnoDB;
  `);

  await pool.execute(`
    CREATE TABLE IF NOT EXISTS communications (
      id INT AUTO_INCREMENT PRIMARY KEY,
      sacco_id INT NULL,
      subject VARCHAR(160) NOT NULL,
      audience VARCHAR(120) NOT NULL,
      channel VARCHAR(60) NOT NULL,
      message TEXT NOT NULL,
      created_by VARCHAR(150),
      target_user_id INT NULL,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      INDEX idx_communication_sacco (sacco_id),
      INDEX idx_communication_target (target_user_id)
    ) ENGINE=InnoDB;
  `);
  await ensureColumn(pool, "communications", "target_user_id", "INT NULL");

  await pool.execute(`
    CREATE TABLE IF NOT EXISTS loan_types (
      id INT AUTO_INCREMENT PRIMARY KEY,
      sacco_id INT NULL,
      name VARCHAR(120) NOT NULL,
      interest_rate DECIMAL(6,2) NOT NULL DEFAULT 0,
      repayment_period VARCHAR(60) NOT NULL,
      eligibility VARCHAR(255) NOT NULL,
      description TEXT,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      INDEX idx_loan_type_sacco (sacco_id)
    ) ENGINE=InnoDB;
  `);

  await pool.execute(`
    CREATE TABLE IF NOT EXISTS loan_applications (
      id BIGINT PRIMARY KEY,
      sacco_id INT NULL,
      user_email VARCHAR(150),
      loan_type VARCHAR(120) NOT NULL,
      member_name VARCHAR(120) NOT NULL,
      amount DECIMAL(15,2) NOT NULL,
      purpose VARCHAR(255) NOT NULL,
      repayment_period VARCHAR(60) NOT NULL,
      interest_rate DECIMAL(6,2) NOT NULL DEFAULT 0,
      status VARCHAR(60) NOT NULL,
      amount_paid DECIMAL(15,2) NOT NULL DEFAULT 0,
      approval_status VARCHAR(60) NOT NULL,
      approved_by VARCHAR(120),
      approved_at DATETIME NULL,
      disbursement_status VARCHAR(60) NOT NULL,
      disbursed_by VARCHAR(120),
      disbursed_at DATETIME NULL,
      next_due VARCHAR(60),
      repayments_json TEXT,
      repayment_schedule_json TEXT,
      total_repayment_amount DECIMAL(15,2) NOT NULL DEFAULT 0,
      submitted_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      INDEX idx_loan_sacco (sacco_id),
      INDEX idx_loan_user (user_email)
    ) ENGINE=InnoDB;
  `);

  const [categoryRows] = await pool.execute("SELECT COUNT(*) AS count FROM categories");
  if (categoryRows[0].count === 0) {
    await pool.execute(
      `INSERT INTO categories (type, name, description) VALUES
      ('expense', 'Staff Costs', 'Salaries and staff-related payments.'),
      ('expense', 'Office Supplies', 'Stationery and small office purchases.'),
      ('income', 'Member Savings', 'Monthly contributions from members.'),
      ('income', 'Loan Interest', 'Interest earned from loans.'),
      ('asset', 'Loan Portfolio', 'Active loans made to members.'),
      ('asset', 'Cash Reserves', 'Liquid cash held by the SACCO.')`
    );
  }

  const [managerRows] = await pool.execute("SELECT COUNT(*) AS count FROM group_account_managers");
  if (managerRows[0].count === 0) {
    await pool.execute(
      `INSERT INTO group_account_managers (name, group_name, email, phone, status) VALUES
      ('Alice Mwangi', 'Savings Group A', 'alice.mwangi@digisacco.com', '+254701234567', 'Active'),
      ('James Njoroge', 'Investment Group B', 'james.njoroge@digisacco.com', '+254722987654', 'Active'),
      ('Grace Wanjiku', 'Loans Group C', 'grace.wanjiku@digisacco.com', '+254733111222', 'Pending Review')`
    );
  }

  const [roleRows] = await pool.execute("SELECT COUNT(*) AS count FROM group_roles");
  if (roleRows[0].count === 0) {
    await pool.execute(
      `INSERT INTO group_roles (title, permissions, description) VALUES
      ('Chairperson', 'Full approvals, meetings, oversight', 'Provides leadership, oversees meetings, and ensures cooperative goals are met.'),
      ('Treasurer', 'Finance records, deposits, withdrawals', 'Manages finances, keeps records, and prepares reports.'),
      ('Secretary', 'Membership, minutes, communication', 'Handles documentation, meeting minutes, and official communication.'),
      ('Member', 'Savings, loans, participation', 'Contributes savings, applies for loans, and participates in decisions.')`
    );
  }

  const [loanTypeRows] = await pool.execute("SELECT COUNT(*) AS count FROM loan_types");
  if (loanTypeRows[0].count === 0) {
    await pool.execute(
      `INSERT INTO loan_types (name, interest_rate, repayment_period, eligibility, description) VALUES
      ('Personal Loan', 12, '12 months', 'Active member for 6+ months', 'A personal loan for household and individual needs.'),
      ('Business Loan', 14, '18 months', 'Business plan and member savings history', 'A loan to finance business growth or inventory.'),
      ('Emergency Loan', 10, '6 months', 'Immediate personal emergency support.', 'Quick access to funds for urgent needs.'),
      ('Education Loan', 8, '24 months', 'School fees and training support.', 'Support members paying for education and training.'),
      ('Development Loan', 11, '20 months', 'Project-based financing for members.', 'Loans for larger development projects.')`
    );
  }
}

app.post("/api/chat", async (req, res) => {
  const apiKey = process.env.GEMINI_API_KEY;
  const model = process.env.GEMINI_MODEL || "gemini-2.5-flash";

  if (!apiKey) {
    return res.status(503).json({
      error: "Gemini API key is not configured.",
      reply:
        "I can help with Digi Sacco setup, member savings, loans, checkoffs, and reports once the Gemini API key is configured on the server.",
    });
  }

  try {
    const contents = normalizeChatMessages(req.body.messages);
    const fallbackMessage =
      "Start the conversation by greeting the visitor and guiding them through Digi Sacco automation, including members, savings, loans, checkoffs, reports, and mobile access.";

    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-goog-api-key": apiKey,
        },
        body: JSON.stringify({
          systemInstruction: {
            parts: [
              {
                text:
                  "You are Digi Sacco's landing page assistant. Be warm, concise, and practical. Help visitors understand SACCO automation, member registration, savings, checkoffs, loans, approvals, reports, and mobile access. Ask one helpful follow-up question at a time.",
              },
            ],
          },
          contents: contents.length
            ? contents
            : [{ role: "user", parts: [{ text: fallbackMessage }] }],
          generationConfig: {
            temperature: 0.6,
            maxOutputTokens: 300,
          },
        }),
      }
    );

    const data = await response.json().catch(() => ({}));
    const reply =
      data.candidates?.[0]?.content?.parts
        ?.map((part) => part.text || "")
        .join("\n")
        .trim() || "";

    if (!response.ok || !reply) {
      return res.status(response.status || 500).json({
        error: data.error?.message || "Gemini could not respond right now.",
        reply: "I am having trouble reaching AI support right now. Please try again in a moment.",
      });
    }

    return res.json({ reply });
  } catch (error) {
    console.error(error);
    return res.status(500).json({
      error: "Chat service unavailable.",
      reply: "I am having trouble reaching AI support right now. Please try again in a moment.",
    });
  }
});

app.post("/api/auth/register", async (req, res) => {
  try {
    const pool = getMainPool();
    const { name, idNumber, email, password, role } = req.body;
    if (!name || !idNumber || !email || !password) {
      return res.status(400).json({ error: "All fields are required." });
    }

    const [existingUser] = await pool.execute("SELECT id FROM users WHERE email = ?", [email]);
    if (existingUser.length > 0) {
      return res.status(409).json({ error: "Email is already registered." });
    }

    const passwordHash = Buffer.from(password).toString("base64");
    await pool.execute(
      "INSERT INTO users (name, id_number, email, password_hash, role) VALUES (?, ?, ?, ?, ?)",
      [name.trim(), idNumber.trim(), email.trim().toLowerCase(), passwordHash, role || "member"]
    );

    return res.status(201).json({ message: "Registration successful." });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ error: "Server error during registration." });
  }
});

app.post("/api/transactions", async (req, res) => {
  try {
    const pool = getMainPool();
    const { userEmail, memberName, type, amount, description, saccoId, status } = req.body;
    if (!userEmail || !type || !amount) {
      return res.status(400).json({ error: "userEmail, type and amount are required." });
    }

    const parsedSaccoId = parseSaccoId(saccoId);
    let finalAmount = parseFloat(amount);
    let finalDescription = description || null;
    const finalStatus = status || (type === "checkoff" ? "pending" : "approved");

    if (isContributionType(type) && parsedSaccoId && !(type === "checkoff" && finalStatus === "approved")) {
      const [saccoRows] = await pool.execute(
        "SELECT contribution_amount, contribution_description FROM sacco WHERE id = ?",
        [parsedSaccoId]
      );
      const fixedAmount = parseFloat(saccoRows[0]?.contribution_amount) || 0;
      if (fixedAmount > 0) {
        finalAmount = fixedAmount;
        finalDescription = finalDescription || saccoRows[0]?.contribution_description || "Member contribution";
      }
    }

    await pool.execute(
      "INSERT INTO transactions (user_email, member_name, sacco_id, type, amount, description, status) VALUES (?, ?, ?, ?, ?, ?, ?)",
      [
        userEmail.trim().toLowerCase(),
        memberName || null,
        parsedSaccoId,
        type,
        finalAmount,
        finalDescription,
        finalStatus,
      ]
    );

    return res.status(201).json({
      message: "Transaction recorded.",
      transaction: {
        userEmail: userEmail.trim().toLowerCase(),
        memberName: memberName || null,
        saccoId: parsedSaccoId,
        type,
        amount: finalAmount,
        description: finalDescription,
        status: finalStatus,
      },
    });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ error: "Could not record transaction." });
  }
});

app.get("/api/transactions", async (req, res) => {
  try {
    const pool = getMainPool();
    const email = (req.query.email || "").trim().toLowerCase();
    const saccoId = parseSaccoId(req.query.saccoId);

    if (saccoId) {
      const [rows] = await pool.execute(
        "SELECT id, user_email AS userEmail, member_name AS memberName, sacco_id AS saccoId, type, amount, description, status, created_at AS createdAt FROM transactions WHERE sacco_id = ? ORDER BY created_at DESC",
        [saccoId]
      );
      return res.json(rows);
    }

    if (email) {
      const [rows] = await pool.execute(
        "SELECT id, user_email AS userEmail, member_name AS memberName, sacco_id AS saccoId, type, amount, description, status, created_at AS createdAt FROM transactions WHERE user_email = ? ORDER BY created_at DESC",
        [email]
      );
      return res.json(rows);
    }

    return res.status(400).json({ error: "email or saccoId query parameter is required." });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ error: "Could not load transactions." });
  }
});

app.put("/api/transactions/:id", async (req, res) => {
  try {
    const pool = getMainPool();
    const status = (req.body.status || "").trim().toLowerCase();
    if (!["approved", "rejected", "pending"].includes(status)) {
      return res.status(400).json({ error: "Valid status is required." });
    }

    const [result] = await pool.execute(
      "UPDATE transactions SET status = ? WHERE id = ? AND type = 'checkoff'",
      [status, req.params.id]
    );
    if (result.affectedRows === 0) return res.status(404).json({ error: "Checkoff transaction not found." });

    return res.json({ message: "Checkoff status updated.", status });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ error: "Could not update checkoff status." });
  }
});

app.post("/api/auth/login", async (req, res) => {
  try {
    const pool = getMainPool();
    const { email, password } = req.body;
    if (!email || !password) {
      return res.status(400).json({ error: "Email and password are required." });
    }

    const [users] = await pool.execute(
      `SELECT users.*, sacco.name AS sacco_name
         FROM users
         LEFT JOIN sacco ON sacco.id = users.sacco_id
        WHERE users.email = ?`,
      [email.trim().toLowerCase()]
    );
    if (users.length === 0) {
      return res.status(401).json({ error: "Invalid email or password." });
    }

    const user = users[0];
    const passwordHash = Buffer.from(password).toString("base64");
    if (user.password_hash !== passwordHash) {
      return res.status(401).json({ error: "Invalid email or password." });
    }

    return res.json({
      email: user.email,
      name: user.name,
      role: user.role || "member",
      saccoId: user.sacco_id,
      saccoName: user.sacco_name,
      message: "Login successful.",
    });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ error: "Server error during login." });
  }
});

app.get("/api/categories", async (req, res) => {
  try {
    const pool = getMainPool();
    const type = (req.query.type || "").trim();
    const saccoId = parseSaccoId(req.query.saccoId);
    const where = [];
    const values = [];

    if (type) {
      where.push("type = ?");
      values.push(type);
    }

    if (saccoId) {
      where.push("(sacco_id = ? OR sacco_id IS NULL)");
      values.push(saccoId);
    }

    const [rows] = await pool.execute(
      `SELECT id, sacco_id AS saccoId, type, name, description, active_items AS activeItems, allocation, created_at AS createdAt
       FROM categories ${where.length ? "WHERE " + where.join(" AND ") : ""}
       ORDER BY created_at DESC, id DESC`,
      values
    );
    return res.json(rows);
  } catch (error) {
    console.error(error);
    return res.status(500).json({ error: "Could not load categories." });
  }
});

app.post("/api/categories", async (req, res) => {
  try {
    const pool = getMainPool();
    const { saccoId, type, name, description, activeItems, allocation } = req.body;
    if (!type || !name) {
      return res.status(400).json({ error: "type and name are required." });
    }

    const [result] = await pool.execute(
      "INSERT INTO categories (sacco_id, type, name, description, active_items, allocation) VALUES (?, ?, ?, ?, ?, ?)",
      [
        parseSaccoId(saccoId),
        type.trim(),
        name.trim(),
        description || "",
        Number(activeItems) || 0,
        allocation || "",
      ]
    );

    return res.status(201).json({ id: result.insertId, message: "Category added." });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ error: "Could not add category." });
  }
});

app.delete("/api/categories/:id", async (req, res) => {
  try {
    const pool = getMainPool();
    const [result] = await pool.execute("DELETE FROM categories WHERE id = ?", [req.params.id]);
    if (result.affectedRows === 0) return res.status(404).json({ error: "Category not found." });
    return res.json({ message: "Category deleted." });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ error: "Could not delete category." });
  }
});

const entityConfigs = {
  roles: {
    table: "group_roles",
    select:
      "id, sacco_id AS saccoId, title, permissions, description, created_at AS createdAt",
    insertColumns: ["sacco_id", "title", "permissions", "description"],
    required: ["title", "permissions"],
    map: (body) => [parseSaccoId(body.saccoId), body.title?.trim(), body.permissions?.trim(), body.description || ""],
  },
  operations: {
    table: "group_operations",
    select:
      "id, sacco_id AS saccoId, name, owner, status, description, due_date AS dueDate, created_at AS createdAt",
    insertColumns: ["sacco_id", "name", "owner", "status", "description", "due_date"],
    required: ["name", "owner"],
    map: (body) => [
      parseSaccoId(body.saccoId),
      body.name?.trim(),
      body.owner?.trim(),
      body.status || "Open",
      body.description || "",
      body.dueDate || null,
    ],
  },
  investments: {
    table: "group_investments",
    select:
      "id, sacco_id AS saccoId, name, amount, expected_return AS expectedReturn, status, description, created_at AS createdAt",
    insertColumns: ["sacco_id", "name", "amount", "expected_return", "status", "description"],
    required: ["name"],
    map: (body) => [
      parseSaccoId(body.saccoId),
      body.name?.trim(),
      Number(body.amount) || 0,
      Number(body.expectedReturn) || 0,
      body.status || "Active",
      body.description || "",
    ],
  },
  communications: {
    table: "communications",
    select:
      "id, sacco_id AS saccoId, subject, audience, channel, message, created_by AS createdBy, target_user_id AS targetUserId, created_at AS createdAt",
    insertColumns: ["sacco_id", "subject", "audience", "channel", "message", "created_by", "target_user_id"],
    required: ["subject", "message"],
    map: (body) => [
      parseSaccoId(body.saccoId),
      body.subject?.trim(),
      body.audience || "All members",
      body.channel || "Notice",
      body.message?.trim(),
      body.createdBy || "",
      body.targetUserId || null,
    ],
  },
  "loan-types": {
    table: "loan_types",
    select:
      "id, sacco_id AS saccoId, name, interest_rate AS interestRate, repayment_period AS repaymentPeriod, eligibility, description, created_at AS createdAt",
    insertColumns: ["sacco_id", "name", "interest_rate", "repayment_period", "eligibility", "description"],
    required: ["name", "repaymentPeriod"],
    map: (body) => [
      parseSaccoId(body.saccoId),
      body.name?.trim(),
      Number(body.interestRate) || 0,
      body.repaymentPeriod || "12 months",
      body.eligibility || "",
      body.description || "",
    ],
  },
};

app.get("/api/:entity", async (req, res, next) => {
  const config = entityConfigs[req.params.entity];
  if (!config) return next();

   try {
     const pool = getMainPool();
     const saccoId = parseSaccoId(req.query.saccoId);

     if (req.params.entity === "communications") {
       const email = (req.query.email || "").trim().toLowerCase();
       const where = [];
       const values = [];

       if (saccoId) {
         where.push("(communications.sacco_id = ? OR communications.sacco_id IS NULL)");
         values.push(saccoId);
       }

       if (email) {
         where.push(
           `(communications.target_user_id IS NULL OR communications.target_user_id = (
             SELECT users.id FROM users WHERE users.email = ? LIMIT 1
           ))`
         );
         values.push(email);
       }

       const [rows] = await pool.execute(
         `SELECT ${config.select} FROM ${config.table} ${
           where.length ? "WHERE " + where.join(" AND ") : ""
         } ORDER BY created_at DESC, id DESC`,
         values
       );
       return res.json(rows);
     }
     
     // Default handling for all entities
     const [rows] = await pool.execute(
       `SELECT ${config.select} FROM ${config.table} ${saccoId ? "WHERE sacco_id = ? OR sacco_id IS NULL" : ""} ORDER BY created_at DESC, id DESC`,
       saccoId ? [saccoId] : []
     );
     return res.json(rows);
   } catch (error) {
     console.error(error);
     return res.status(500).json({ error: `Could not load ${req.params.entity}.` });
   }
});

app.post("/api/:entity", async (req, res, next) => {
  const config = entityConfigs[req.params.entity];
  if (!config) return next();

  const missing = config.required.find((field) => !req.body[field]);
  if (missing) {
    return res.status(400).json({ error: `${missing} is required.` });
  }

  try {
    const pool = getMainPool();
    const placeholders = config.insertColumns.map(() => "?").join(", ");
    const [result] = await pool.execute(
      `INSERT INTO ${config.table} (${config.insertColumns.join(", ")}) VALUES (${placeholders})`,
      config.map(req.body)
    );
    return res.status(201).json({ id: result.insertId, message: "Record added." });
   } catch (error) {
     console.error(error);
     return res.status(500).json({ error: `Could not add ${req.params.entity}.` });
   }
});

app.delete("/api/:entity/:id", async (req, res, next) => {
  const config = entityConfigs[req.params.entity];
  if (!config) return next();

  try {
    const pool = getMainPool();
    const [result] = await pool.execute(`DELETE FROM ${config.table} WHERE id = ?`, [req.params.id]);
    if (result.affectedRows === 0) return res.status(404).json({ error: "Record not found." });
    return res.json({ message: "Record deleted." });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ error: `Could not delete ${req.params.entity}.` });
  }
});

app.get("/api/members", async (req, res) => {
  try {
    const pool = getMainPool();
    const saccoId = parseSaccoId(req.query.saccoId);
    const search = (req.query.search || "").trim();

    if (!saccoId) {
      return res.status(400).json({ error: "saccoId query parameter is required." });
    }

    const [rows] = await pool.execute(
      `SELECT id, sacco_id AS saccoId, name, id_number AS idNumber, email, role, created_at AS createdAt
        FROM users WHERE sacco_id = ? ${search ? "AND (name LIKE ? OR id_number LIKE ? OR email LIKE ?)" : ""}
        ORDER BY created_at DESC, id DESC`,
      [...(search ? [saccoId, `%${search}%`, `%${search}%`, `%${search}%`] : [saccoId])]
    );
    return res.json(rows);
  } catch (error) {
    console.error(error);
    return res.status(500).json({ error: "Could not load members." });
  }
});

app.get("/api/group-managers", async (req, res) => {
  try {
    const pool = getMainPool();
    const saccoId = parseSaccoId(req.query.saccoId);
    const [rows] = await pool.execute(
      `SELECT id, sacco_id AS saccoId, name, group_name AS groupName, email, phone, status
       FROM group_account_managers ${saccoId ? "WHERE sacco_id = ? OR sacco_id IS NULL" : ""}
       ORDER BY created_at DESC, id DESC`,
      saccoId ? [saccoId] : []
    );
    return res.json(rows);
  } catch (error) {
    console.error(error);
    return res.status(500).json({ error: "Could not load group account managers." });
  }
});

app.post("/api/group-managers", async (req, res) => {
  try {
    const pool = getMainPool();
    const { saccoId, name, groupName, email, phone, status } = req.body;
    if (!name || !groupName || !email) {
      return res.status(400).json({ error: "name, groupName and email are required." });
    }

    await pool.execute(
      "INSERT INTO group_account_managers (sacco_id, name, group_name, email, phone, status) VALUES (?, ?, ?, ?, ?, ?)",
      [parseSaccoId(saccoId), name.trim(), groupName.trim(), email.trim().toLowerCase(), phone || "", status || "Active"]
    );

    return res.status(201).json({ message: "Manager added." });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ error: "Could not add manager." });
  }
});

app.get("/api/dashboard/summary", async (req, res) => {
  try {
    const pool = getMainPool();
    const saccoId = parseSaccoId(req.query.saccoId);
    const email = (req.query.email || "").trim().toLowerCase();
    const loanScope = (req.query.loanScope || "").trim().toLowerCase();
    const txScope = saccoId ? " AND sacco_id = ?" : "";
    const scopeValues = saccoId ? [saccoId] : [];
    const showMemberLoanSummary = loanScope === "member" && email;
    const contributionScope = saccoId ? " AND tx.sacco_id = ?" : "";
    
    const [depositRows] = await pool.execute(
      `SELECT IFNULL(SUM(amount),0) AS total
         FROM (
           SELECT MAX(amount) AS amount
             FROM transactions tx
            WHERE type = 'deposit'${contributionScope}
              AND MONTH(created_at)=MONTH(CURRENT_DATE())
              AND YEAR(created_at)=YEAR(CURRENT_DATE())
            GROUP BY type, LOWER(COALESCE(NULLIF(user_email, ''), NULLIF(member_name, ''))), amount, DATE(created_at)
         ) contribution_rows`,
      scopeValues
    );
    const [checkoffRows] = await pool.execute(
      `SELECT IFNULL(SUM(amount),0) AS total
         FROM (
           SELECT MAX(amount) AS amount
             FROM transactions tx
            WHERE type = 'checkoff'${contributionScope}
              AND COALESCE(status, 'approved') = 'approved'
              AND MONTH(created_at)=MONTH(CURRENT_DATE())
              AND YEAR(created_at)=YEAR(CURRENT_DATE())
            GROUP BY type, LOWER(COALESCE(NULLIF(user_email, ''), NULLIF(member_name, ''))), amount, DATE(created_at)
         ) contribution_rows`,
      scopeValues
    );
    const [withdrawRows] = await pool.execute(
      `SELECT IFNULL(SUM(amount),0) AS total FROM transactions WHERE type = 'withdrawal'${txScope} AND MONTH(created_at)=MONTH(CURRENT_DATE()) AND YEAR(created_at)=YEAR(CURRENT_DATE())`,
      scopeValues
    );
    const [pooledRows] = await pool.execute(
      `SELECT IFNULL(SUM(amount),0) AS total
         FROM (
           SELECT MAX(amount) AS amount
             FROM transactions tx
            WHERE type IN ('deposit', 'checkoff')${contributionScope}
              AND (type <> 'checkoff' OR COALESCE(status, 'approved') = 'approved')
            GROUP BY type, LOWER(COALESCE(NULLIF(user_email, ''), NULLIF(member_name, ''))), amount, DATE(created_at)
         ) contribution_rows`,
      scopeValues
    );
    const [personalRows] = await pool.execute(
      `SELECT IFNULL(SUM(amount),0) AS total
         FROM (
           SELECT MAX(amount) AS amount
             FROM transactions tx
            WHERE type IN ('deposit', 'checkoff')${contributionScope}
              AND (type <> 'checkoff' OR COALESCE(status, 'approved') = 'approved')
              ${email ? " AND user_email = ?" : ""}
            GROUP BY type, LOWER(COALESCE(NULLIF(user_email, ''), NULLIF(member_name, ''))), amount, DATE(created_at)
         ) contribution_rows`,
      [...scopeValues, ...(email ? [email] : [])]
    );
    const [memberRows] = await pool.execute(
      `SELECT COUNT(*) AS count FROM users ${saccoId ? "WHERE sacco_id = ?" : ""}`,
      scopeValues
    );
    const [pendingRows] = await pool.execute(
      `SELECT COUNT(*) AS count FROM loan_applications WHERE approval_status = 'Pending'${saccoId ? " AND sacco_id = ?" : ""}`,
      scopeValues
    );
    const [loanRows] = await pool.execute(
      `SELECT amount,
              interest_rate AS interestRate,
              repayment_period AS repaymentPeriod,
              total_repayment_amount AS totalRepaymentAmount,
              amount_paid AS amountPaid
         FROM loan_applications WHERE 1=1${saccoId ? " AND sacco_id = ?" : ""}${
           showMemberLoanSummary ? " AND user_email = ?" : ""
         }`,
      [...scopeValues, ...(showMemberLoanSummary ? [email] : [])]
    );
    const loanTotals = loanRows.reduce(
      (totals, loan) => {
        const amount = parseFloat(loan.amount) || 0;
        const totalRepayment =
          parseFloat(loan.totalRepaymentAmount) ||
          calculateTotalRepaymentAmount(amount, loan.interestRate, loan.repaymentPeriod);

        return {
          count: totals.count + 1,
          amountTotal: totals.amountTotal + amount,
          repaymentTotal: totals.repaymentTotal + totalRepayment,
          paidTotal: totals.paidTotal + (parseFloat(loan.amountPaid) || 0),
        };
      },
      { count: 0, amountTotal: 0, repaymentTotal: 0, paidTotal: 0 }
    );
    const [saccoRows] = saccoId
      ? await pool.execute(
          `SELECT contribution_amount AS contributionAmount,
                  contribution_frequency AS contributionFrequency,
                  contribution_description AS contributionDescription
             FROM sacco WHERE id = ?`,
          [saccoId]
        )
      : [[]];

    const summary = {
      contributionPayments: (parseFloat(depositRows[0].total) || 0) + (parseFloat(checkoffRows[0].total) || 0),
      checkoffPayments: parseFloat(checkoffRows[0].total) || 0,
      pooledFund: parseFloat(pooledRows[0].total) || 0,
      personalContributions: parseFloat(personalRows[0].total) || 0,
      fixedContributionAmount: parseFloat(saccoRows[0]?.contributionAmount) || 0,
      contributionFrequency: saccoRows[0]?.contributionFrequency || "Monthly",
      contributionDescription: saccoRows[0]?.contributionDescription || "",
      activeMembers: Number(memberRows[0].count) || 0,
      pendingApprovals: Number(pendingRows[0].count) || 0,
      withdrawals: parseFloat(withdrawRows[0].total) || 0,
      loanApplications: loanTotals.count,
      loansApplied: loanTotals.amountTotal,
      loanRepayments: loanTotals.paidTotal,
      remainingLoanDebt: Math.max(
        loanTotals.repaymentTotal - loanTotals.paidTotal,
        0
      ),
    };

    return res.json(summary);
  } catch (error) {
    console.error(error);
    return res.status(500).json({ error: "Could not load dashboard summary." });
  }
});

app.delete("/api/group-managers/:id", async (req, res) => {
  const id = req.params.id;

  try {
    const pool = getMainPool();
    const [result] = await pool.execute(
      "DELETE FROM group_account_managers WHERE id = ?",
      [id]
    );

    if (result.affectedRows === 0) {
      return res.status(404).json({ error: "Manager not found" });
    }

    res.json({ message: "Manager deleted successfully" });
  } catch (err) {
    console.error("Delete error:", err);
    res.status(500).json({ error: "Server error during manager deletion" });
  }
});

app.get("/api/loan-applications", async (req, res) => {
  try {
    const pool = getMainPool();
    const saccoId = parseSaccoId(req.query.saccoId);
    const email = (req.query.email || "").trim().toLowerCase();
    const where = [];
    const values = [];

    if (saccoId) {
      where.push("sacco_id = ?");
      values.push(saccoId);
    }

    if (email) {
      where.push("user_email = ?");
      values.push(email);
    }

    const [rows] = await pool.execute(
      `SELECT id, sacco_id AS saccoId, user_email AS userEmail, loan_type AS loanType, member_name AS memberName,
        amount, purpose, repayment_period AS repaymentPeriod, interest_rate AS interestRate, status,
        amount_paid AS amountPaid, approval_status AS approvalStatus, approved_by AS approvedBy,
        approved_at AS approvedAt, disbursement_status AS disbursementStatus, disbursed_by AS disbursedBy,
        disbursed_at AS disbursedAt, next_due AS nextDue, repayments_json AS repaymentsJson,
        repayment_schedule_json AS repaymentScheduleJson, total_repayment_amount AS totalRepaymentAmount,
        submitted_at AS submittedAt
       FROM loan_applications ${where.length ? "WHERE " + where.join(" AND ") : ""}
       ORDER BY submitted_at DESC`,
      values
    );

    return res.json(
      rows.map((row) => ({
        ...row,
        totalRepaymentAmount:
          Number(row.totalRepaymentAmount) ||
          calculateTotalRepaymentAmount(row.amount, row.interestRate, row.repaymentPeriod),
        repayments: parseJsonField(row.repaymentsJson, []),
        repaymentSchedule: parseJsonField(row.repaymentScheduleJson, []),
        repaymentsJson: undefined,
        repaymentScheduleJson: undefined,
      }))
    );
  } catch (error) {
    console.error(error);
    return res.status(500).json({ error: "Could not load loan applications." });
  }
});

app.post("/api/loan-applications", async (req, res) => {
  try {
    const pool = getMainPool();
    const loan = req.body;
    if (!loan.loanType || !loan.memberName || !loan.amount || !loan.purpose) {
      return res.status(400).json({ error: "loanType, memberName, amount and purpose are required." });
    }

    const id = loan.id || Date.now();
    const totalRepaymentAmount =
      Number(loan.totalRepaymentAmount) ||
      calculateTotalRepaymentAmount(loan.amount, loan.interestRate, loan.repaymentPeriod);

    await pool.execute(
      `INSERT INTO loan_applications (
        id, sacco_id, user_email, loan_type, member_name, amount, purpose, repayment_period,
        interest_rate, status, amount_paid, approval_status, approved_by, approved_at,
        disbursement_status, disbursed_by, disbursed_at, next_due, repayments_json,
        repayment_schedule_json, total_repayment_amount
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        id,
        parseSaccoId(loan.saccoId),
        loan.userEmail || null,
        loan.loanType,
        loan.memberName,
        Number(loan.amount) || 0,
        loan.purpose,
        loan.repaymentPeriod || "",
        Number(loan.interestRate) || 0,
        loan.status || "Pending",
        Number(loan.amountPaid) || 0,
        loan.approvalStatus || "Pending",
        loan.approvedBy || null,
        toMysqlDateTime(loan.approvedAt),
        loan.disbursementStatus || "Pending",
        loan.disbursedBy || null,
        toMysqlDateTime(loan.disbursedAt),
        loan.nextDue || "In 30 days",
        JSON.stringify(loan.repayments || []),
        JSON.stringify(loan.repaymentSchedule || []),
        totalRepaymentAmount,
      ]
    );

    return res.status(201).json({ ...loan, id });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ error: "Could not save loan application." });
  }
});

app.put("/api/loan-applications/:id", async (req, res) => {
  try {
    const pool = getMainPool();
    const loan = req.body;
    const totalRepaymentAmount =
      Number(loan.totalRepaymentAmount) ||
      calculateTotalRepaymentAmount(loan.amount, loan.interestRate, loan.repaymentPeriod);
    const [result] = await pool.execute(
      `UPDATE loan_applications SET
        status = ?, amount_paid = ?, approval_status = ?, approved_by = ?, approved_at = ?,
        disbursement_status = ?, disbursed_by = ?, disbursed_at = ?, next_due = ?,
        repayments_json = ?, repayment_schedule_json = ?, total_repayment_amount = ?
       WHERE id = ?`,
      [
        loan.status || "Pending",
        Number(loan.amountPaid) || 0,
        loan.approvalStatus || "Pending",
        loan.approvedBy || null,
        toMysqlDateTime(loan.approvedAt),
        loan.disbursementStatus || "Pending",
        loan.disbursedBy || null,
        toMysqlDateTime(loan.disbursedAt),
        loan.nextDue || null,
        JSON.stringify(loan.repayments || []),
        JSON.stringify(loan.repaymentSchedule || []),
        totalRepaymentAmount,
        req.params.id,
      ]
    );

    if (result.affectedRows === 0) return res.status(404).json({ error: "Loan application not found." });
    return res.json({ message: "Loan application updated." });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ error: "Could not update loan application." });
  }
});

app.get("/api/sacco", async (req, res) => {
  try {
    const pool = getMainPool();
    const search = (req.query.search || "").trim();
    const saccoId = parseSaccoId(req.query.saccoId || req.query.id);

    if (saccoId) {
      const [rows] = await pool.execute(
        `SELECT id, name, description, registration_number AS registrationNumber,
                country, currency, contribution_amount AS contributionAmount,
                contribution_frequency AS contributionFrequency,
                contribution_description AS contributionDescription
           FROM sacco WHERE id = ?`,
        [saccoId]
      );
      return res.json(rows[0] || null);
    }

    const [rows] = await pool.execute(
      `SELECT id, name, description, registration_number AS registrationNumber,
              country, currency, contribution_amount AS contributionAmount,
              contribution_frequency AS contributionFrequency,
              contribution_description AS contributionDescription
         FROM sacco
        ${search ? "WHERE name LIKE ?" : ""}
        ORDER BY created_at DESC, id DESC
        LIMIT 25`,
      search ? [`%${search}%`] : []
    );
    return res.json(rows);
  } catch (error) {
    console.error(error);
    return res.status(500).json({ error: "Could not load saccos." });
  }
});

app.post("/api/sacco", async (req, res) => {
  try {
    const pool = getMainPool();
    const {
      name,
      description,
      registrationNumber,
      country,
      currency,
      contributionAmount,
      contributionFrequency,
      contributionDescription,
    } = req.body;
    if (!name) {
      return res.status(400).json({ error: "Sacco name is required." });
    }

    const [existingSacco] = await pool.execute("SELECT id FROM sacco WHERE name = ?", [name.trim()]);
    if (existingSacco.length > 0) {
      return res.status(409).json({ error: "Sacco name already exists." });
    }

    const result = await pool.execute(
      `INSERT INTO sacco (
        name, description, registration_number, country, currency,
        contribution_amount, contribution_frequency, contribution_description
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        name.trim(),
        description || null,
        registrationNumber || null,
        country || "Kenya",
        currency || "KES",
        Number(contributionAmount) || 0,
        contributionFrequency || "Monthly",
        contributionDescription || null,
      ]
    );

    const saccoId = result[0].insertId;
    return res.status(201).json({ 
      id: saccoId,
      name: name.trim(),
      description: description || null,
      registrationNumber: registrationNumber || null,
      country: country || "Kenya",
      currency: currency || "KES",
      contributionAmount: Number(contributionAmount) || 0,
      contributionFrequency: contributionFrequency || "Monthly",
      contributionDescription: contributionDescription || null,
    });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ error: "Server error during sacco creation." });
  }
});

app.put("/api/users/sacco", async (req, res) => {
  try {
    const pool = getMainPool();
    const { email, saccoId, role } = req.body;
    if (!email) {
      return res.status(400).json({ error: "Email is required." });
    }
    if (saccoId === undefined || saccoId === null) {
      await pool.execute(
        "UPDATE users SET sacco_id = NULL, role = ? WHERE email = ?",
        [role || "member", email.trim().toLowerCase()]
      );
      return res.json({ message: "User removed from sacco." });
    }

    const [sacco] = await pool.execute("SELECT id FROM sacco WHERE id = ?", [saccoId]);
    if (sacco.length === 0) {
      return res.status(404).json({ error: "Sacco not found." });
    }

    await pool.execute(
      "UPDATE users SET sacco_id = ?, role = ? WHERE email = ?",
      [saccoId, role || "member", email.trim().toLowerCase()]
    );

    return res.json({ message: "User sacco updated successfully." });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ error: "Server error during user sacco update." });
  }
});

app.listen(port, async () => {
  try {
    await initializeDatabase();
    await createTables();
    console.log(`Server is running on http://localhost:${port}`);
  } catch (error) {
    console.error("Failed to initialize database:", error);
    process.exit(1);
  }
});
