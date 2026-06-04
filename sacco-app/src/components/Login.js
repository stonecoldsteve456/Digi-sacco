import React, { useState } from "react";

function Login({ setIsLoggedIn, setActivePage }) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [errorMessage, setErrorMessage] = useState("");

  async function handleLogin() {
    setErrorMessage("");

    if (!email || !password) {
      setErrorMessage("Please enter both email and password.");
      return;
    }

    try {
      const response = await fetch("http://localhost:5000/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });

      const data = await response.json();

      if (data.error) {
        setErrorMessage(data.error);
        return;
      }

      const authData = {
        email: data.email,
        name: data.name || "Member",
        role: data.role || "member",
        saccoName: "Digi Sacco",
        loggedAt: new Date().toISOString(),
      };

      window.localStorage.setItem("digiAuth", JSON.stringify(authData));
      setIsLoggedIn(true);
      setActivePage("dashboard");
    } catch (err) {
      console.error("Login failed:", err);
      setErrorMessage("Server error. Please try again.");
    }
  }

  return (
    <div className="login">
      <h2>Member Login</h2>
      <input
        type="email"
        placeholder="Email"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
      />
      <input
        type="password"
        placeholder="Password"
        value={password}
        onChange={(e) => setPassword(e.target.value)}
      />
      {errorMessage && <p className="form-error">{errorMessage}</p>}
      <button onClick={handleLogin}>Login</button>
      <p>
        New member?{" "}
        <span onClick={() => setActivePage("register")}>Register here</span>
      </p>
    </div>
  );
}

export default Login;
