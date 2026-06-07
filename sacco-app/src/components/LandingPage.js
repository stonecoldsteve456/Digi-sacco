import React, { useEffect, useRef, useState } from "react";
import { FiMessageCircle, FiSend, FiX } from "react-icons/fi";
import { apiRequest } from "../utils/api";
import "./LandingPage.css";

const welcomeMessage = {
  role: "assistant",
  text:
    "Hi, I am Digi Sacco assistant. I can guide you through automating members, savings, checkoffs, loans, reports, and mobile access. What would you like help with first?",
};

function LandingPage({ setActivePage }) {
  const [chatOpen, setChatOpen] = useState(false);
  const [chatInput, setChatInput] = useState("");
  const [chatLoading, setChatLoading] = useState(false);
  const [chatMessages, setChatMessages] = useState([welcomeMessage]);
  const chatEndRef = useRef(null);
  const chatInputRef = useRef(null);

  useEffect(() => {
    if (!chatOpen) return;
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
    chatInputRef.current?.focus();
  }, [chatOpen, chatMessages, chatLoading]);

  const openChat = () => {
    setChatOpen(true);
  };

  const handleChatSubmit = async (event) => {
    event.preventDefault();
    const text = chatInput.trim();
    if (!text || chatLoading) return;

    const nextMessages = [...chatMessages, { role: "user", text }];
    setChatMessages(nextMessages);
    setChatInput("");
    setChatLoading(true);

    try {
      const data = await apiRequest("/chat", {
        method: "POST",
        body: JSON.stringify({ messages: nextMessages }),
      });
      setChatMessages((prev) => [
        ...prev,
        { role: "assistant", text: data.reply || "I am ready to help with Digi Sacco." },
      ]);
    } catch (error) {
      setChatMessages((prev) => [
        ...prev,
        {
          role: "assistant",
          text:
            error.message ||
            "I am having trouble reaching AI support right now. Please try again in a moment.",
        },
      ]);
    } finally {
      setChatLoading(false);
    }
  };

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
            <button onClick={openChat}>Chat with Digi Sacco</button>
          </div>
        </div>
      </footer>

      {chatOpen && (
        <section className="chat-widget" aria-label="Digi Sacco chat assistant">
          <header className="chat-header">
            <div>
              <span className="chat-avatar">
                <FiMessageCircle aria-hidden="true" />
              </span>
              <div>
                <h3>Digi Sacco</h3>
                <p>AI support online</p>
              </div>
            </div>
            <button className="chat-icon-button" onClick={() => setChatOpen(false)} aria-label="Close chat">
              <FiX aria-hidden="true" />
            </button>
          </header>

          <div className="chat-messages">
            {chatMessages.map((message, index) => (
              <div className={`chat-message ${message.role === "user" ? "user" : "assistant"}`} key={`${message.role}-${index}`}>
                {message.text}
              </div>
            ))}
            {chatLoading && <div className="chat-message assistant">Typing...</div>}
            <div ref={chatEndRef} />
          </div>

          <form className="chat-form" onSubmit={handleChatSubmit}>
            <input
              ref={chatInputRef}
              value={chatInput}
              onChange={(event) => setChatInput(event.target.value)}
              placeholder="Ask about SACCO automation..."
              aria-label="Chat message"
            />
            <button className="chat-send" type="submit" disabled={chatLoading || !chatInput.trim()} aria-label="Send message">
              <FiSend aria-hidden="true" />
            </button>
          </form>
        </section>
      )}
    </div>
  );
}

export default LandingPage;
