import React, { useState } from "react";
import { registerUser } from "../api";

function Register({ onRegistered }) {
  const [form, setForm] = useState({ username: "", email: "", password: "" });
  const [msg, setMsg] = useState({ type: "", text: "" });
  const [loading, setLoading] = useState(false);

  const handleChange = (e) =>
    setForm({ ...form, [e.target.name]: e.target.value });

  const handleSubmit = async (e) => {
    e.preventDefault();
    setMsg({ type: "", text: "" });
    setLoading(true);
    try {
      await registerUser(form);
      setMsg({ type: "success", text: "✅ Registered! Please login now." });
      onRegistered?.(form.email, form.password);
    } catch (err) {
      if (err.message?.toLowerCase().includes("exists")) {
        setMsg({ type: "warning", text: "⚠️ User already exists. Please login." });
        onRegistered?.(form.email, form.password);
      } else {
        setMsg({ type: "danger", text: "❌ " + err.message });
      }
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
        <h2 className="text-center mb-3">🧾 Create your account</h2>

        {msg.text && (
          <div className={`alert alert-${msg.type}`} role="alert">
            {msg.text}
          </div>
        )}

        <form onSubmit={handleSubmit}>
          <div className="mb-3">
            <input
              className="form-control"
              type="text"
              name="username"
              placeholder="Username"
              value={form.username}
              onChange={handleChange}
              required
              autoComplete="username"
            />
          </div>
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
              autoComplete="new-password"
            />
          </div>
          <button type="submit" className="btn btn-custom w-100" disabled={loading}>
            {loading ? "Creating..." : "Create Account"}
          </button>
        </form>
      </div>
    </div>
  );
}

export default Register;
