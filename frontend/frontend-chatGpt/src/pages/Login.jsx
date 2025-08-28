import React, { useState, useContext } from "react";
import { Link, useNavigate } from "react-router-dom";
import axios from "axios";
import { AuthContext } from "../context/AuthContext";
import { toast } from "react-toastify";

const Login = () => {
  const [form, setForm] = useState({ email: "", password: "" });
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const navigate = useNavigate();
  const { setIsAuthenticated } = useContext(AuthContext);

  function handleChange(e) {
    const { name, value } = e.target;
    setForm({ ...form, [name]: value });
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setSubmitting(true);
    setError("");

    try {
      const res = await axios.post(
        "https://chatnex-ai.onrender.com/api/auth/login",
        { email: form.email, password: form.password },
        { withCredentials: true }
      );

      console.log(res.data);

      // ✅ Update auth state immediately
      setIsAuthenticated(true);

      // ✅ Redirect to home
      navigate("/");
      toast.success("Login successful!");
    } catch (err) {
      console.error(err.response?.data || err.message);
      setError(err.response?.data?.message || "Login failed");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center px-4 bg-gradient-to-br from-[#030c18] to-[#383451] text-[var(--text-color)]">
      <div className="w-full max-w-md rounded-2xl shadow-lg p-8 bg-[var(--card-color)]">
        <h2 className="text-2xl font-semibold mb-2">Sign in</h2>
        <p className="text-sm text-[var(--muted-color)] mb-4">
          Use your email to sign in to your account.
        </p>

        {error && (
          <div className="mb-4 rounded-md p-3 bg-[var(--error-bg)] text-[var(--error-text)]">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="grid gap-4">
          <label className="block">
            <span className="text-sm text-[var(--muted-color)]">Email</span>
            <input
              name="email"
              type="email"
              value={form.email}
              onChange={handleChange}
              placeholder="you@example.com"
              autoComplete="email"
              required
              className="mt-1 block w-full rounded-md px-3 py-2 border border-gray-300 bg-[var(--bg-color)] text-[var(--text-color)] focus:border-[var(--accent-color)] focus:ring focus:ring-[var(--accent-color)]"
            />
          </label>

          <label className="block">
            <span className="text-sm text-[var(--muted-color)]">Password</span>
            <input
              name="password"
              type="password"
              value={form.password}
              onChange={handleChange}
              placeholder="••••••••"
              autoComplete="current-password"
              required
              className="mt-1 block w-full rounded-md px-3 py-2 border border-gray-300 bg-[var(--bg-color)] text-[var(--text-color)] focus:border-[var(--accent-color)] focus:ring focus:ring-[var(--accent-color)]"
            />
          </label>

          <button
            type="submit"
            disabled={submitting}
            className="mt-2 w-full rounded-md py-2 font-medium shadow-md transition bg-[var(--accent-color)] text-white hover:bg-[var(--accent-hover)] disabled:opacity-50"
          >
            {submitting ? "Signing in..." : "Sign in"}
          </button>
        </form>

        <p className="text-center text-sm text-[var(--muted-color)] mt-4">
          Don't have an account?{" "}
          <Link
            to="/register"
            className="text-[var(--accent-color)] hover:text-[var(--accent-hover)] font-medium"
          >
            Register
          </Link>
        </p>
      </div>
    </div>
  );
};

export default Login;
