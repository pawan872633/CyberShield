import React, { useState } from "react";
import Dashboard from "./components/Dashboard";
import Login from "./components/Login";
import Register from "./components/Register";
import Blacklist from "./components/Blacklist";

function App() {
  const [user, setUser] = useState(null);
  const [authTab, setAuthTab] = useState("register"); // auth tabs
  const [page, setPage] = useState("dashboard");      // app pages after login
  const [prefill, setPrefill] = useState({ email: "", password: "" });

  if (!user) {
    return (
      <div className="container py-5">
        <div className="d-flex justify-content-center mb-4">
          <div className="btn-group shadow">
            <button
              className={`btn ${authTab === "register" ? "btn-custom" : "btn-outline-light"}`}
              onClick={() => setAuthTab("register")}
            >
              Register
            </button>
            <button
              className={`btn ${authTab === "login" ? "btn-custom" : "btn-outline-light"}`}
              onClick={() => setAuthTab("login")}
            >
              Login
            </button>
          </div>
        </div>

        {authTab === "register" ? (
          <Register
            onRegistered={(email, password) => {
              setPrefill({ email, password });
              setAuthTab("login");
            }}
          />
        ) : (
          <Login
            onLogin={(u) => {
              setUser(u);
              setPage("dashboard");
            }}
            prefill={prefill}
          />
        )}
      </div>
    );
  }

  // Logged-in UI
  return (
    <div className="container py-4">
      <div className="d-flex justify-content-between align-items-center mb-3">
        <h3 className="m-0">🛡️ CyberShield</h3>
        <div className="btn-group">
          <button
            className={`btn btn-sm ${page === "dashboard" ? "btn-custom" : "btn-outline-light"}`}
            onClick={() => setPage("dashboard")}
          >
            Dashboard
          </button>
          <button
            className={`btn btn-sm ${page === "blacklist" ? "btn-custom" : "btn-outline-light"}`}
            onClick={() => setPage("blacklist")}
          >
            Blacklist
          </button>
          <button
            className="btn btn-sm btn-outline-light"
            onClick={() => {
              if (window.confirm("Logout?")) {
                setUser(null);
                setAuthTab("login");
              }
            }}
          >
            Logout
          </button>
        </div>
      </div>

      {page === "dashboard" ? <Dashboard user={user} /> : <Blacklist />}
    </div>
  );
}

export default App;
