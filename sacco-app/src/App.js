import React, { useEffect, useState } from "react";
import LandingPage from "./components/LandingPage.js";
import Login from "./components/Login.js";
import Register from "./Register.js";
import RegisterSetup from "./components/RegisterSetup.js";
import Dashboard from "./components/Dashboard.js";
import "./App.css";

function App() {
    const [currentPage, setActivePage] = useState("landing");
    const [isLoggedIn, setIsLoggedIn] = useState(false);

    useEffect(() => {
      const storedAuth = window.localStorage.getItem("digiAuth");
      if (storedAuth) {
        setIsLoggedIn(true);
        // Don't automatically redirect to dashboard - let login component handle navigation
      }
    }, []);

    return (
      <>
        {currentPage === "landing" && <LandingPage setActivePage={setActivePage} />}
        {currentPage === "login" && (
          <Login setIsLoggedIn={setIsLoggedIn} setActivePage={setActivePage} />
        )}
        {currentPage === "register" && <Register setActivePage={setActivePage} />}
        {currentPage === "register-setup" && <RegisterSetup setActivePage={setActivePage} />}
        {currentPage === "dashboard" && isLoggedIn && (
          <Dashboard setIsLoggedIn={setIsLoggedIn} setActivePage={setActivePage} />
        )}
      </>
    );
 }

 export default App;
