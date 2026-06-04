import React, { useState } from "react";

function getStoredUsers() {
  const userJson = window.localStorage.getItem("digiUsers");
  if (!userJson) {
    return [];
  }
  return JSON.parse(userJson);
}

function Login({ setIsLoggedIn, setActivePage }) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [errorMessage, setErrorMessage] = useState("");

  function handleLogin() {
    setErrorMessage("");

    const emailValue = email.trim().toLowerCase();
    if (emailValue === "" || password === "") {
      setErrorMessage("Please enter both email and password.");
      return;
    }

    const users = getStoredUsers();
    const user = users.find((item) => item.email === emailValue);

    if (!user) {
      setErrorMessage("No account found with this email.");
      return;
    }

    const encodedPassword = window.btoa(password);
    if (user.passwordHash !== encodedPassword) {
      setErrorMessage("Password is incorrect. Please try again.");
      return;
    }

    const authData = {
      email: user.email,
      name: user.name,
      role: user.role || "member",
      saccoName: user.saccoName || "Digi Sacco",
      loggedAt: new Date().toISOString(),
    };

    window.localStorage.setItem("digiAuth", JSON.stringify(authData));
    setIsLoggedIn(true);
    setActivePage("dashboard");
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
        New member? <span onClick={() => setActivePage("register")}>Register here</span>
      </p>
    </div>
  );
}

export default Login;
