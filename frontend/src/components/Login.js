import React, { useEffect, useState } from "react";
import { loginUser } from "../api";

function Login({ onLogin, prefill }) {
  const [form, setForm] = useState({ email: "", password: "" });
  const [msg, setMsg] = useState({ type: "", text: "" });
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (prefill?.email) setForm(prefill);
  }, [prefill]);

  const handleChange = (e) =>
    setForm({ ...form, [e.target.name]: e.target.value });

  const handleSubmit = async (e) => {
    e.preventDefault();
    setMsg({ type: "", text: "" });
    setLoading(true);
    try {
      const res = await loginUser(form);
      onLogin(res.data);
    } catch (err) {
      setMsg({ type: "danger", text: "❌ " + err.message });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="d-flex justify-content-center align-items-center">
      <div
        className="card custom-card p-4 animate__animated animate__fadeInDown"
        style={{ width: "420px" }}
      >
        <h2 className="text-center mb-3">🔐 CyberShield Login</h2>

        {msg.text && (
          <div className={`alert alert-${msg.type}`} role="alert">
            {msg.text}
          </div>
        )}

        <form onSubmit={handleSubmit}>
          <div className="mb-3">
            <input
              className="form-control"
              type="email"
              name="email"
              placeholder="Email"
              value={form.email}
              onChange={handleChange}
              required
              autoComplete="email"
            />
          </div>
          <div className="mb-3">
            <input
              className="form-control"
              type="password"
              name="password"
              placeholder="Password"
              value={form.password}
              onChange={handleChange}
              required
              autoComplete="current-password"
            />
          </div>
          <button type="submit" className="btn btn-custom w-100" disabled={loading}>
            {loading ? "Signing in..." : "Login"}
          </button>
        </form>
      </div>
    </div>
  );
}

export default Login;
