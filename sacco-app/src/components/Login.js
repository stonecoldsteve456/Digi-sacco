import React, { useState } from "react";

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
           setErrorMessage(data.error);
           return;
         }

         // Backend validation successful - use data from backend
         const authData = {
           email: data.email,
           name: data.name,
           role: "member", // Default role, could be extended in backend response
           saccoName: "Digi Sacco",
           loggedAt: new Date().toISOString(),
         };

         window.localStorage.setItem("digiAuth", JSON.stringify(authData));
         setIsLoggedIn(true);
         setActivePage("dashboard");
       })
       .catch((err) => {
         console.error("Login error:", err);
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
