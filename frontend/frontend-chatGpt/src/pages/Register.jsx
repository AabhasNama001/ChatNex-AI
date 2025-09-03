import React, { useState, useEffect, useRef } from "react";
import { Link, useNavigate } from "react-router-dom";
import axios from "axios";
import { toast } from "react-toastify";

const NUM_PARTICLES = 30;
const NUM_BLOBS = 6;

const Register = () => {
  const [form, setForm] = useState({
    email: "",
    firstname: "",
    lastname: "",
    password: "",
  });
  const [submitting, setSubmitting] = useState(false);
  const navigate = useNavigate();
  const backgroundRef = useRef(null);
  const particlesRef = useRef([]);
  const blobsRef = useRef([]);

  function handleChange(e) {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setSubmitting(true);

    try {
      const res = await axios.post(
        "https://chatnex-ai.onrender.com/api/auth/register",
        {
          email: form.email,
          fullName: {
            firstName: form.firstname,
            lastName: form.lastname,
          },
          password: form.password,
        },
        { withCredentials: true }
      );

      console.log(res);
      navigate("/login");
      toast.success("Registration successful! Please log in.");
    } catch (err) {
      console.error(err);
      alert("Registration failed (placeholder)");
    } finally {
      setSubmitting(false);
    }
  }

  useEffect(() => {
    const width = window.innerWidth;
    const height = window.innerHeight;

    // Initialize particles
    particlesRef.current = [...Array(NUM_PARTICLES)].map(() => ({
      x: Math.random() * width,
      y: Math.random() * height,
      size: Math.random() * 3 + 2,
      color: `hsl(${Math.random() * 360}, 70%, 80%)`,
      vx: (Math.random() - 0.5) * 0.5,
      vy: (Math.random() - 0.5) * 0.5,
    }));

    // Initialize blobs
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

        // Draw particles
        particlesRef.current.forEach((p, i) => {
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

        // Draw blobs
        blobsRef.current.forEach((b, i) => {
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

      {/* Form card */}
      <div className="w-full max-w-2xl rounded-2xl shadow-lg p-8 bg-gradient-to-br from-[#0000ff]/10 to-[#030c18] border-2 border-gray-400 text-[var(--text-color)] z-10">
        <header className="mb-6">
          <h1 className="text-2xl font-semibold">Create account</h1>
          <p className="text-sm text-[var(--muted-color)]">
            Join us and start exploring.
          </p>
        </header>

        <form
          onSubmit={handleSubmit}
          className="grid gap-4 sm:grid-cols-2 sm:gap-6"
          noValidate
        >
          <label className="block">
            <span className="text-sm text-[var(--muted-color)]">
              First name
            </span>
            <input
              id="firstname"
              name="firstname"
              value={form.firstname}
              onChange={handleChange}
              placeholder="Jane"
              required
              className="mt-1 block w-full rounded-md px-3 py-2 border border-gray-300 bg-[var(--bg-color)] text-[var(--text-color)] focus:border-[var(--accent-color)] focus:ring focus:ring-[var(--accent-color)]"
            />
          </label>

          <label className="block">
            <span className="text-sm text-[var(--muted-color)]">Last name</span>
            <input
              id="lastname"
              name="lastname"
              value={form.lastname}
              onChange={handleChange}
              placeholder="Doe"
              required
              className="mt-1 block w-full rounded-md px-3 py-2 border border-gray-300 bg-[var(--bg-color)] text-[var(--text-color)] focus:border-[var(--accent-color)] focus:ring focus:ring-[var(--accent-color)]"
            />
          </label>

          <label className="block sm:col-span-2">
            <span className="text-sm text-[var(--muted-color)]">Email</span>
            <input
              id="email"
              name="email"
              type="email"
              value={form.email}
              onChange={handleChange}
              placeholder="you@example.com"
              required
              className="mt-1 block w-full rounded-md px-3 py-2 border border-gray-300 bg-[var(--bg-color)] text-[var(--text-color)] focus:border-[var(--accent-color)] focus:ring focus:ring-[var(--accent-color)]"
            />
          </label>

          <label className="block sm:col-span-2">
            <span className="text-sm text-[var(--muted-color)]">Password</span>
            <input
              id="password"
              name="password"
              type="password"
              value={form.password}
              onChange={handleChange}
              placeholder="Create a password"
              minLength={6}
              required
              className="mt-1 block w-full rounded-md px-3 py-2 border border-gray-300 bg-[var(--bg-color)] text-[var(--text-color)] focus:border-[var(--accent-color)] focus:ring focus:ring-[var(--accent-color)]"
            />
          </label>

          <div className="sm:col-span-2">
            <button
              type="submit"
              disabled={submitting}
              className="w-full rounded-md py-2 font-medium shadow-md transition bg-[var(--accent-color)] text-white hover:bg-[var(--accent-hover)]"
            >
              {submitting ? "Creating..." : "Create account"}
            </button>
          </div>
        </form>

        <p className="text-center text-sm text-[var(--muted-color)] mt-4">
          Already have an account?{" "}
          <Link
            to="/login"
            className="text-[var(--accent-color)] hover:text-[var(--accent-hover)] font-medium"
            aria-label="Login page"
          >
            Sign in
          </Link>
        </p>
      </div>
    </div>
  );
};

export default Register;
