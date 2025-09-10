import React, { useState, useContext, useEffect, useRef } from "react";
import { Link, useNavigate } from "react-router-dom";
import axios from "axios";
import { AuthContext } from "../context/AuthContext";
import { toast } from "react-toastify";
import { FaEye, FaEyeSlash } from "react-icons/fa"; // 👈 Import icons

const NUM_PARTICLES = 30;
const NUM_BLOBS = 6;

const Login = () => {
  const [form, setForm] = useState({ email: "", password: "" });
  const [showPassword, setShowPassword] = useState(false); // 👈 Toggle state
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const navigate = useNavigate();
  const { setIsAuthenticated } = useContext(AuthContext);
  const backgroundRef = useRef(null);
  const particlesRef = useRef([]);
  const blobsRef = useRef([]);

  function handleChange(e) {
    const { name, value } = e.target;
    setForm({ ...form, [name]: value });
  }

  async function handleSubmit(e) {
    e.preventDefault();

    // --- 1. VALIDATION ---
    const { email, password } = form;
    if (!email || !password) {
      toast.error("Please fill in all fields.");
      return;
    }
    if (!email.includes("@")) {
      toast.error("Please enter a valid email address.");
      return;
    }
    if (password.length < 6) {
      toast.error("Password must be at least 6 characters long.");
      return;
    }
    // --- End of validation ---

    setSubmitting(true);
    setError("");

    try {
      const res = await axios.post(
        "http://localhost:3000/api/auth/login",
        { email: form.email, password: form.password },
        { withCredentials: true }
      );

      setIsAuthenticated(true);
      navigate("/");
      toast.success("Login successful!");
    } catch (err) {
      console.error(err.response?.data || err.message);
      const errorMessage =
        err.response?.data?.message || "Login failed. Please try again.";
      setError(errorMessage);
      toast.error(errorMessage);
    } finally {
      setSubmitting(false);
    }
  }

  // Background particles + blobs animation
  useEffect(() => {
    const width = window.innerWidth;
    const height = window.innerHeight;

    particlesRef.current = [...Array(NUM_PARTICLES)].map(() => ({
      x: Math.random() * width,
      y: Math.random() * height,
      size: Math.random() * 3 + 2,
      color: `hsl(${Math.random() * 360}, 70%, 80%)`,
      vx: (Math.random() - 0.5) * 0.5,
      vy: (Math.random() - 0.5) * 0.5,
    }));

    blobsRef.current = [...Array(NUM_BLOBS)].map(() => ({
      x: Math.random() * width,
      y: Math.random() * height,
      size: Math.random() * 40 + 20,
      color: `hsla(${Math.random() * 360}, 70%, 50%, 0.3)`,
      vx: (Math.random() - 0.5) * 0.2,
      vy: (Math.random() - 0.5) * 0.2,
    }));

    const animate = () => {
      particlesRef.current.forEach((p) => {
        p.x += p.vx;
        p.y += p.vy;
        if (p.x > width) p.x = 0;
        if (p.x < 0) p.x = width;
        if (p.y > height) p.y = 0;
        if (p.y < 0) p.y = height;
      });

      blobsRef.current.forEach((b) => {
        b.x += b.vx;
        b.y += b.vy;
        if (b.x > width) b.x = 0;
        if (b.x < 0) b.x = width;
        if (b.y > height) b.y = 0;
        if (b.y < 0) b.y = height;
      });

      if (backgroundRef.current) {
        backgroundRef.current.innerHTML = "";

        particlesRef.current.forEach((p) => {
          const span = document.createElement("span");
          span.style.position = "absolute";
          span.style.width = `${p.size}px`;
          span.style.height = `${p.size}px`;
          span.style.borderRadius = "50%";
          span.style.backgroundColor = p.color;
          span.style.boxShadow = `0 0 12px ${p.color}, 0 0 20px ${p.color}`;
          span.style.left = `${p.x}px`;
          span.style.top = `${p.y}px`;
          backgroundRef.current.appendChild(span);
        });

        blobsRef.current.forEach((b) => {
          const span = document.createElement("span");
          span.style.position = "absolute";
          span.style.width = `${b.size}px`;
          span.style.height = `${b.size}px`;
          span.style.borderRadius = "50%";
          span.style.backgroundColor = b.color;
          span.style.filter = "blur(10px)";
          span.style.left = `${b.x}px`;
          span.style.top = `${b.y}px`;
          backgroundRef.current.appendChild(span);
        });
      }

      requestAnimationFrame(animate);
    };

    animate();
  }, []);

  return (
    <div className="relative min-h-screen flex items-center justify-center px-4 bg-gradient-to-br from-[#030c18] to-[#383451] text-[var(--text-color)] overflow-hidden">
      <div ref={backgroundRef} className="absolute inset-0 z-0"></div>

      <div className="w-full max-w-xl rounded-2xl shadow-lg p-8 bg-gradient-to-br from-[#0000ff]/10 to-[#030c18] border-2 border-gray-400 text-[var(--text-color)] z-10">
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
          {/* Email */}
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

          {/* Password with toggle */}
          <label className="block">
            <span className="text-sm text-[var(--muted-color)]">Password</span>
            <div className="relative mt-1">
              <input
                name="password"
                type={showPassword ? "text" : "password"}
                value={form.password}
                onChange={handleChange}
                placeholder="••••••••"
                autoComplete="current-password"
                required
                minLength={6}
                className="block w-full rounded-md px-3 py-2 border border-gray-300 bg-[var(--bg-color)] text-[var(--text-color)] focus:border-[var(--accent-color)] focus:ring focus:ring-[var(--accent-color)] pr-10"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute inset-y-0 right-0 flex items-center pr-3 text-gray-400 hover:text-white"
              >
                {showPassword ? (
                  <FaEyeSlash className="h-5 w-5" />
                ) : (
                  <FaEye className="h-5 w-5" />
                )}
              </button>
            </div>
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
