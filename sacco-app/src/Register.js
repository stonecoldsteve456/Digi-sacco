import React, { useState } from "react";

function getStoredUsers() {
  const userJson = window.localStorage.getItem("digiUsers");
  if (!userJson) {
    return [];
  }
  return JSON.parse(userJson);
}

function saveUsers(users) {
  window.localStorage.setItem("digiUsers", JSON.stringify(users));
}

function Register({ setActivePage }) {
  const [name, setName] = useState("");
  const [idNumber, setIdNumber] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [errorMessage, setErrorMessage] = useState("");

  function handleRegister() {
    setErrorMessage("");

    const emailValue = email.trim().toLowerCase();
    if (name === "" || idNumber === "" || emailValue === "" || password === "") {
      setErrorMessage("Please fill in all registration fields.");
      return;
    }

    const users = getStoredUsers();
    const emailExists = users.some((user) => user.email === emailValue);
    if (emailExists) {
      setErrorMessage("This email is already registered. Please login instead.");
      return;
    }

    const newUser = {
      name: name.trim(),
      idNumber: idNumber.trim(),
      email: emailValue,
      passwordHash: window.btoa(password),
    };

    saveUsers([...users, newUser]);
  // Save last registered email locally so the setup wizard can send initial data to backend
  window.localStorage.setItem("lastRegisteredEmail", newUser.email);

  // Also send registration to backend so it is available to APIs
    fetch("http://localhost:5000/api/auth/register", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: newUser.name, idNumber: newUser.idNumber, email: newUser.email, password }),
    })
      .then((r) => r.json())
      .then((data) => {
        // backend may return an error if user exists — ignore for now but log
        if (data && data.error) {
          console.log("Backend registration warning:", data.error);
        }
      })
      .catch((err) => {
        console.log("Failed to register on backend:", err.message || err);
      })
      .finally(() => {
        alert("Registration successful! Continue with the Sacco setup.");
        setActivePage("register-setup");
      });
  }

  return (
    <div className="register">
      <h2>New Member Registration</h2>
      <input
        type="text"
        placeholder="Full Name"
        value={name}
        onChange={(e) => setName(e.target.value)}
      />
      <input
        type="text"
        placeholder="ID Number"
        value={idNumber}
        onChange={(e) => setIdNumber(e.target.value)}
      />
      <input
        type="password"
        placeholder="Password"
        value={password}
        onChange={(e) => setPassword(e.target.value)}
      />
      <input
        type="email"
        placeholder="Email Address"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
      />
      {errorMessage && <p className="form-error">{errorMessage}</p>}
      <button onClick={handleRegister}>Register</button>
    </div>
  );
}

export default Register;
