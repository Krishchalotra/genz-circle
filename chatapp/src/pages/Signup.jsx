import { useState } from "react";
import { useNavigate } from "react-router-dom";
import sky from "../assets/sky.jpg";
import SERVER from "../config";

export default function Signup() {
  const navigate = useNavigate();
  const [formData, setFormData] = useState({ name: "", email: "", password: "" });
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  function handleChange(e) {
    setFormData({ ...formData, [e.target.name]: e.target.value });
    setError("");
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const response = await fetch(`${SERVER}/api/auth/signup`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      });
      const data = await response.json();
      if (response.ok) {
        navigate("/login");
      } else {
        setError(data.message || "Signup failed.");
      }
    } catch {
      setError("Cannot reach server. Check your connection.");
    } finally {
      setLoading(false);
    }
  }


  return (
    <div
      className="h-screen w-full bg-cover bg-center flex items-center justify-center"
      style={{ backgroundImage: `url(${sky})` }}
    >

      {/* Dark overlay */}
      <div className="absolute inset-0 bg-black/50"></div>

      {/* Glass Card */}
      <div className="relative z-10 backdrop-blur-xl bg-white/10 border border-white/20 p-10 rounded-2xl w-[380px] text-white shadow-2xl">

        <h1 className="text-3xl font-bold text-center mb-8">
          Create Account
        </h1>

        <form onSubmit={handleSubmit} className="flex flex-col gap-4">

          <input
  type="text"
  name="name"
  placeholder="Your Name"
  onChange={handleChange}
  className="bg-white/10 border border-white/20 p-3 rounded-lg outline-none placeholder-gray-300 text-white focus:bg-white/10"
/>

<input
  type="email"
  name="email"
  placeholder="Email"
  onChange={handleChange}
  className="bg-white/10 border border-white/20 p-3 rounded-lg outline-none placeholder-gray-300 text-white focus:bg-white/10"
/>

<input
  type="password"
  name="password"
  placeholder="Password"
  onChange={handleChange}
  className="bg-white/10 border border-white/20 p-3 rounded-lg outline-none placeholder-gray-300 text-white focus:bg-white/10"
/>

          <button
            disabled={loading}
            className="mt-4 bg-indigo-500 hover:bg-indigo-600 transition-all p-3 rounded-lg font-semibold disabled:opacity-60"
          >
            {loading ? "Creating..." : "Create Account"}
          </button>

          {error && (
            <p className="text-red-400 text-sm text-center bg-red-500/10 border border-red-500/20 rounded-lg px-3 py-2">
              {error}
            </p>
          )}

        </form>

        <p className="text-center text-sm text-gray-400 mt-6">
          Already have an account?{" "}
          <button
            onClick={() => navigate("/login")}
            className="text-indigo-400 hover:text-indigo-300 font-semibold transition"
          >
            Log in
          </button>
        </p>

      </div>

    </div>
  );
}
