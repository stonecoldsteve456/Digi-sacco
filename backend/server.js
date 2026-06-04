const express = require("express");
const cors = require("cors");
const { initializeDatabase, getMainPool } = require("./db");
require("dotenv").config();

const app = express();
const port = process.env.PORT || 5000;

app.use(cors());
app.use(express.json());

async function createTables() {
  const pool = getMainPool();

  await pool.execute(`
    CREATE TABLE IF NOT EXISTS users (
      id INT AUTO_INCREMENT PRIMARY KEY,
      name VARCHAR(120) NOT NULL,
      id_number VARCHAR(100) NOT NULL,
      email VARCHAR(150) NOT NULL UNIQUE,
      password_hash VARCHAR(255) NOT NULL,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    ) ENGINE=InnoDB;
  `);

  await pool.execute(`
    CREATE TABLE IF NOT EXISTS categories (
      id INT AUTO_INCREMENT PRIMARY KEY,
      type VARCHAR(40) NOT NULL,
      name VARCHAR(120) NOT NULL,
      description VARCHAR(255) NOT NULL
    ) ENGINE=InnoDB;
  `);

  await pool.execute(`
    CREATE TABLE IF NOT EXISTS group_account_managers (
      id INT AUTO_INCREMENT PRIMARY KEY,
      name VARCHAR(120) NOT NULL,
      group_name VARCHAR(120) NOT NULL,
      email VARCHAR(150) NOT NULL,
      phone VARCHAR(40) NOT NULL,
      status VARCHAR(60) NOT NULL
    ) ENGINE=InnoDB;
  `);

  await pool.execute(`
    CREATE TABLE IF NOT EXISTS transactions (
      id INT AUTO_INCREMENT PRIMARY KEY,
      user_email VARCHAR(150) NOT NULL,
      type VARCHAR(40) NOT NULL,
      amount DECIMAL(15,2) NOT NULL,
      description VARCHAR(255),
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
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
}


app.post("/api/auth/register", async (req, res) => {
  try {
    const pool = getMainPool();
    const { name, idNumber, email, password } = req.body;
    if (!name || !idNumber || !email || !password) {
      return res.status(400).json({ error: "All fields are required." });
    }

    const [existingUser] = await pool.execute("SELECT id FROM users WHERE email = ?", [email]);
    if (existingUser.length > 0) {
      return res.status(409).json({ error: "Email is already registered." });
    }

    const passwordHash = Buffer.from(password).toString("base64");
    await pool.execute(
      "INSERT INTO users (name, id_number, email, password_hash) VALUES (?, ?, ?, ?)",
      [name.trim(), idNumber.trim(), email.trim().toLowerCase(), passwordHash]
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
    const { userEmail, type, amount, description } = req.body;
    if (!userEmail || !type || !amount) {
      return res.status(400).json({ error: "userEmail, type and amount are required." });
    }

    await pool.execute(
      "INSERT INTO transactions (user_email, type, amount, description) VALUES (?, ?, ?, ?)",
      [userEmail.trim().toLowerCase(), type, parseFloat(amount), description || null]
    );

    return res.status(201).json({ message: "Transaction recorded." });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ error: "Could not record transaction." });
  }
});


app.get("/api/transactions", async (req, res) => {
  try {
    const pool = getMainPool();
    const email = (req.query.email || "").trim().toLowerCase();
    if (!email) {
      return res.status(400).json({ error: "email query parameter is required." });
    }
    const [rows] = await pool.execute(
      "SELECT id, user_email AS userEmail, type, amount, description, created_at AS createdAt FROM transactions WHERE user_email = ? ORDER BY created_at DESC",
      [email]
    );
    return res.json(rows);
  } catch (error) {
    console.error(error);
    return res.status(500).json({ error: "Could not load transactions." });
  }
});

app.post("/api/auth/login", async (req, res) => {
  try {
    const pool = getMainPool();
    const { email, password } = req.body;
    if (!email || !password) {
      return res.status(400).json({ error: "Email and password are required." });
    }

    const [users] = await pool.execute("SELECT * FROM users WHERE email = ?", [email.trim().toLowerCase()]);
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
    const [rows] = await pool.execute("SELECT id, type, name, description FROM categories");
    return res.json(rows);
  } catch (error) {
    console.error(error);
    return res.status(500).json({ error: "Could not load categories." });
  }
});

app.get("/api/group-managers", async (req, res) => {
  try {
    const pool = getMainPool();
    const [rows] = await pool.execute(
      "SELECT id, name, group_name AS groupName, email, phone, status FROM group_account_managers"
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
    const { name, groupName, email, phone, status } = req.body;
    if (!name || !groupName || !email) {
      return res.status(400).json({ error: "name, groupName and email are required." });
    }

    await pool.execute(
      "INSERT INTO group_account_managers (name, group_name, email, phone, status) VALUES (?, ?, ?, ?, ?)",
      [name.trim(), groupName.trim(), email.trim().toLowerCase(), phone || "", status || "Active"]
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
    
    const [depositRows] = await pool.execute(
      `SELECT IFNULL(SUM(amount),0) AS total FROM transactions WHERE type = 'deposit' AND MONTH(created_at)=MONTH(CURRENT_DATE()) AND YEAR(created_at)=YEAR(CURRENT_DATE())`
    );
    const [withdrawRows] = await pool.execute(
      `SELECT IFNULL(SUM(amount),0) AS total FROM transactions WHERE type = 'withdrawal' AND MONTH(created_at)=MONTH(CURRENT_DATE()) AND YEAR(created_at)=YEAR(CURRENT_DATE())`
    );

  
    const summary = {
      contributionPayments: parseFloat(depositRows[0].total) || 0,
      feesPayments: 1480.0,
      miscellaneousPayments: 8500.0,
      activeMembers: 1254,
      pendingApprovals: 12,
      withdrawals: parseFloat(withdrawRows[0].total) || 0,
    };

    return res.json(summary);
  } catch (error) {
    console.error(error);
    return res.status(500).json({ error: "Could not load dashboard summary." });
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


app.delete("/api/group-managers/:id", async (req, res) => {
  const id = req.params.id;

  try {
    await pool.execute(
      "UPDATE group_accounts SET manager_id = NULL WHERE manager_id = ?",
      [id]
    );

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


