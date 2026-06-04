const mysql = require("mysql2/promise");
require("dotenv").config();

const initialPool = mysql.createPool({
  host: process.env.DB_HOST || "localhost",
  user: process.env.DB_USER || "root",
  password: process.env.DB_PASSWORD || "",
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
});


let mainPool = null;

async function initializeDatabase() {

  const connection = await initialPool.getConnection();
  try {
    const dbName = process.env.DB_NAME || "digisacco";
    await connection.execute(`CREATE DATABASE IF NOT EXISTS ${dbName}`);
    console.log(`Database '${dbName}' is ready.`);
  } finally {
    connection.release();
  }

  
  const dbName = process.env.DB_NAME || "digisacco";
  mainPool = mysql.createPool({
    host: process.env.DB_HOST || "localhost",
    user: process.env.DB_USER || "root",
    password: process.env.DB_PASSWORD || "",
    database: dbName,
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0,
  });

  return mainPool;
}

module.exports = { initialPool, initializeDatabase, getMainPool: () => mainPool };
