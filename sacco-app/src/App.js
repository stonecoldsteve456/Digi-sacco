import React, { useEffect, useState } from "react";
import LandingPage from "./components/LandingPage.js";
import Login from "./components/Login.js";
import Register from "./Register.js";
import RegisterSetup from "./components/RegisterSetup.js";
import Dashboard from "./components/Dashboard.js";
import "./App.css";

function App() {
  // The page that is currently shown in the app
  const [currentPage, setCurrentPage] = useState("landing");
  const [isLoggedIn, setIsLoggedIn] = useState(false);

  useEffect(() => {
    const storedAuth = window.localStorage.getItem("digiAuth");
    if (storedAuth) {
      setIsLoggedIn(true);
      setCurrentPage("dashboard");
    }
  }, []);

  return (
    <>
      {currentPage === "landing" && <LandingPage setActivePage={setCurrentPage} />}
      {currentPage === "login" && (
        <Login setIsLoggedIn={setIsLoggedIn} setActivePage={setCurrentPage} />
      )}
      {currentPage === "register" && <Register setActivePage={setCurrentPage} />}
      {currentPage === "register-setup" && <RegisterSetup setActivePage={setCurrentPage} />}
      {currentPage === "dashboard" && isLoggedIn && (
        <Dashboard setIsLoggedIn={setIsLoggedIn} setActivePage={setCurrentPage} />
      )}
    </>
  );
}

export default App;
