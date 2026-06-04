import React from "react";
import "./LandingPage.css";

function LandingPage({ setActivePage }) {
  return (
    <div className="landing">
      <nav className="navbar">
        <h2>Digi Sacco</h2>
        <div className="nav-links">
          <button onClick={() => setActivePage("login")}>Login</button>
          <button onClick={() => setActivePage("register")}>Sign Up</button>
        </div>
      </nav>

      <div className="hero">
        <h1>Automate your SACCO</h1>
        <p>
          Digi Sacco helps your SACCO move to the next level. Focus on investments
          while we handle financial administration.
        </p>
        <button onClick={() => setActivePage("login")}>Get Started</button>
      </div>

      <div className="features">
        <div className="feature-card">
         
          <h3>Easy Setup</h3>
          <p>Only five steps required to start using!</p>
          <button>Read More</button>
        </div>
        <div className="feature-card">
         
          <h3>Safe & Secure</h3>
          <p>Your data is protected in a secure environment.</p>
          <button>Read More</button>
        </div>
        <div className="feature-card">
         
          <h3>Dedicated Support</h3>
          <p>Our support team is available anytime.</p>
          <button>Read More</button>
        </div>
      </div>

      <div className="about">
        <div className="text">
          <h2>What is Digi Sacco?</h2>
          <p>
            Digi Sacco provides your SACCO with tools to run a profitable,
            digitally aware enterprise. Members can save, borrow, and repay
            through mobile phones. Supports USSD, Android, and iOS (coming soon).
          </p>
        </div>
        <div className="image">
          
        </div>
      </div>

   

      <div className="why">
        <h2>Why use Digi Sacco?</h2>
        <p>
          Accurate, secure, and accessible. Enterprise-class security integrates
          SACCO accounts with core banking systems. Available 24/7 with reliable
          internet.
        </p>
      </div>

      <div className="demo-banner">
        <h3>Still not convinced? Try out our demo.</h3>
        <button>ONLINE DEMO</button>
      </div>

      <footer>
        <div className="footer-logo">
       
        </div>
        <div className="footer-columns">
          <div>
            <h4>Relevant Links</h4>
            <ul>
              <li>Home</li>
              <li>About Digi Sacco</li>
              <li>Features</li>
            </ul>
          </div>
          <div>
            <h4>Mobile App</h4>
            <p>
              Access Digi Sacco on the go. Manage accounts, savings, loans, and
              member services securely.
            </p>
          </div>
          <div>
            <h4>Contact Us</h4>
            <p>Questions? Chat with us. We are online.</p>
            <button>Chat with Digi Sacco</button>
          </div>
        </div>
      </footer>
    </div>
  );
}

export default LandingPage;
