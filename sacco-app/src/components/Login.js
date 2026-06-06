import React, { useState } from "react";

function getLocalUser(email, password) {
  try {
    const users = JSON.parse(window.localStorage.getItem("digiUsers") || "[]");
    return users.find(
      (user) => user.email === email && user.passwordHash === window.btoa(password)
    );
  } catch (error) {
    return null;
  }
}

function saveAuth(user) {
  let users = [];
  try {
    users = JSON.parse(window.localStorage.getItem("digiUsers") || "[]");
  } catch (error) {
    users = [];
  }
  const matchingLocalUser = users.find((storedUser) => storedUser.email === user.email) || {};
  const authData = {
    email: user.email,
    name: user.name || matchingLocalUser.name,
    role: user.role || matchingLocalUser.role || "member",
    saccoName: user.saccoName || matchingLocalUser.saccoName || "Digi Sacco",
    saccoId: user.saccoId || matchingLocalUser.saccoId || null,
    loggedAt: new Date().toISOString(),
  };

  window.localStorage.setItem("digiAuth", JSON.stringify(authData));

  const saccoId = user.saccoId || matchingLocalUser.saccoId;
  if (saccoId) {
    window.localStorage.setItem("digiCurrentSaccoId", saccoId.toString());
  } else {
    window.localStorage.removeItem("digiCurrentSaccoId");
  }

  window.dispatchEvent(new Event("digi-sacco-updated"));
  window.dispatchEvent(new Event("digi-finance-updated"));
}

function Login({ setIsLoggedIn, setActivePage }) {
   const [email, setEmail] = useState("");
   const [password, setPassword] = useState("");
   const [errorMessage, setErrorMessage] = useState("");
   const [isLoading, setIsLoading] = useState(false);

   function handleLogin() {
     setErrorMessage("");
     setIsLoading(true);

     const emailValue = email.trim().toLowerCase();
     if (emailValue === "" || password === "") {
       setErrorMessage("Please enter both email and password.");
       setIsLoading(false);
       return;
     }

     fetch("http://localhost:5000/api/auth/login", {
       method: "POST",
       headers: { "Content-Type": "application/json" },
       body: JSON.stringify({ email: emailValue, password }),
     })
       .then((response) => response.json())
       .then((data) => {
         if (data.error) {
           const localUser = getLocalUser(emailValue, password);
           if (localUser) {
             saveAuth(localUser);
             setIsLoggedIn(true);
             setActivePage("dashboard");
             return;
           }
           setErrorMessage(data.error);
           return;
         }

         saveAuth(data);
         
         setIsLoggedIn(true);
         setActivePage("dashboard");
       })
       .catch((err) => {
         console.error("Login error:", err);
         const localUser = getLocalUser(emailValue, password);
         if (localUser) {
           saveAuth(localUser);
           setIsLoggedIn(true);
           setActivePage("dashboard");
           return;
         }
         setErrorMessage("Server error. Please try again later.");
       })
       .finally(() => {
         setIsLoading(false);
       });
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
       <button onClick={handleLogin} disabled={isLoading}>
         {isLoading ? "Logging in..." : "Login"}
       </button>
       <p>
         New member? <span onClick={() => setActivePage("register")}>Register here</span>
       </p>
     </div>
   );
 }

 export default Login;
