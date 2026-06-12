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

function getStoredSaccos() {
  try {
    const saccos = JSON.parse(window.localStorage.getItem("digiSaccos") || "[]");
    return Array.isArray(saccos) ? saccos : [];
  } catch (error) {
    return [];
  }
}

function findLocalSacco(query) {
  const normalizedQuery = query.trim().toLowerCase();
  if (!normalizedQuery) return null;

  return getStoredSaccos().find(
    (sacco) =>
      sacco.id?.toString() === normalizedQuery ||
      sacco.name?.trim().toLowerCase() === normalizedQuery
  );
}

async function findSacco(query) {
  const normalizedQuery = query.trim();
  if (!normalizedQuery) return null;

  try {
    const isId = /^\d+$/.test(normalizedQuery);
    const url = isId
      ? `http://localhost:5000/api/sacco?id=${encodeURIComponent(normalizedQuery)}`
      : `http://localhost:5000/api/sacco?search=${encodeURIComponent(normalizedQuery)}`;
    const response = await fetch(url);
    const data = await response.json();

    if (isId && data?.id) return data;
    if (Array.isArray(data)) {
      return (
        data.find((sacco) => sacco.name?.trim().toLowerCase() === normalizedQuery.toLowerCase()) ||
        data[0] ||
        null
      );
    }
  } catch (error) {
    console.log("Sacco lookup fell back to local records:", error.message || error);
  }

  return findLocalSacco(normalizedQuery);
}

function Register({ setActivePage }) {
  const [name, setName] = useState("");
  const [idNumber, setIdNumber] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [registrationMode, setRegistrationMode] = useState("join");
  const [selectedRole, setSelectedRole] = useState("member");
  const [saccoSearch, setSaccoSearch] = useState("");
  const [linkedSacco, setLinkedSacco] = useState(null);
  const [errorMessage, setErrorMessage] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  async function handleFindSacco() {
    setErrorMessage("");
    const sacco = await findSacco(saccoSearch);
    if (!sacco) {
      setLinkedSacco(null);
      setErrorMessage("No Sacco found with that name or ID.");
      return null;
    }

    setLinkedSacco(sacco);
    return sacco;
  }

  async function handleRegister() {
    setErrorMessage("");
    setIsLoading(true);

    const emailValue = email.trim().toLowerCase();
    if (name === "" || idNumber === "" || emailValue === "" || password === "") {
      setErrorMessage("Please fill in all registration fields.");
      setIsLoading(false);
      return;
    }

    const users = getStoredUsers();
    const emailExists = users.some((user) => user.email === emailValue);
    if (emailExists) {
      setErrorMessage("This email is already registered. Please login instead.");
      setIsLoading(false);
      return;
    }

    let sacco = linkedSacco;
    if (registrationMode === "join") {
      sacco = linkedSacco || (await handleFindSacco());
      if (!sacco) {
        setIsLoading(false);
        return;
      }
    }

    const newUser = {
      name: name.trim(),
      idNumber: idNumber.trim(),
      email: emailValue,
      passwordHash: window.btoa(password),
      role: registrationMode === "create" ? "chairperson" : selectedRole,
      saccoId: sacco?.id || null,
      saccoName: sacco?.name || "",
    };

    saveUsers([...users, newUser]);
    window.localStorage.setItem("lastRegisteredEmail", newUser.email);

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
        if (registrationMode === "join" && sacco?.id) {
          return fetch("http://localhost:5000/api/users/sacco", {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ email: newUser.email, saccoId: sacco.id }),
          });
        }
        return null;
      })
      .catch((err) => {
        console.log("Failed to register on backend:", err.message || err);
      })
      .finally(() => {
        setIsLoading(false);
        if (registrationMode === "join") {
          window.localStorage.removeItem("lastRegisteredEmail");
          alert(`Registration successful! You are now linked to ${sacco.name}.`);
          setActivePage("login");
          return;
        }

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
    <select value={registrationMode} onChange={(e) => setRegistrationMode(e.target.value)}>
      <option value="join">Join an existing Sacco as</option>
      <option value="create">Create a new Sacco as chairperson</option>
    </select>
    {registrationMode === "join" && (
      <select value={selectedRole} onChange={(e) => setSelectedRole(e.target.value)}>
        <option value="member">Member</option>
        <option value="secretary">Secretary</option>
        <option value="treasurer">Treasurer</option>
      </select>
    )}
      {registrationMode === "join" && (
        <>
          <input
            type="text"
            placeholder="Sacco name or ID from your chairperson"
            value={saccoSearch}
            onChange={(e) => {
              setSaccoSearch(e.target.value);
              setLinkedSacco(null);
            }}
          />
          <button type="button" onClick={handleFindSacco}>
            Find Sacco
          </button>
          {linkedSacco && (
            <p className="form-success">
              You will join {linkedSacco.name} as a member.
            </p>
          )}
        </>
      )}
      {errorMessage && <p className="form-error">{errorMessage}</p>}
      <button onClick={handleRegister} disabled={isLoading}>
        {isLoading ? "Registering..." : "Register"}
      </button>
    </div>
  );
}

export default Register;
