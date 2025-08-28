import React, { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import axios from "axios";
import { toast } from "react-toastify";

const Register = () => {
  const [form, setForm] = useState({
    email: "",
    firstname: "",
    lastname: "",
    password: "",
  });
  const [submitting, setSubmitting] = useState(false);
  const navigate = useNavigate();

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

  return (
    <div className="min-h-screen flex items-center justify-center px-4 bg-gradient-to-br from-[#030c18] to-[#383451] text-[var(--text-color)]">
      <div className="w-full max-w-2xl rounded-2xl shadow-lg p-8 bg-[var(--card-color)] text-[var(--text-color)]">
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
