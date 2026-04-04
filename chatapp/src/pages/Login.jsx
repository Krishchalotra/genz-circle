import { useState } from "react";
import axios from "axios";
import { useNavigate } from "react-router-dom";
import sky from "../assets/sky.jpg";

export default function Login() {

  const navigate = useNavigate();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleLogin() {
    try {
      setLoading(true);
      console.log("Sending login...");

      const res = await axios.post(
        "http://localhost:5000/api/auth/login",
        {
          email,
          password,
        }
      );

      console.log("Response data:", res.data);

      // ✅ SAVE USER (IMPORTANT FIX)
      localStorage.setItem("user", JSON.stringify(res.data.user));

      // (optional) token bhi save kar sakta hai
      localStorage.setItem("token", res.data.token);

      // ✅ Redirect to app
      navigate("/app");

    } catch (err) {
      console.log("LOGIN ERROR:", err.response?.data || err.message);
      alert("Login failed ❌ Check credentials");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div
      className="h-screen flex items-center justify-center text-white relative overflow-hidden bg-cover bg-center"
      style={{ backgroundImage: `url(${sky})` }}
    >
      {/* Dark overlay */}
      <div className="absolute inset-0 bg-black/50"></div>

      <div className="relative z-10 bg-white/10 backdrop-blur-xl p-10 rounded-2xl w-96 border border-white/10">

        <h2 className="text-3xl mb-8 font-bold text-center">Welcome Back</h2>

        <input
          type="email"
          placeholder="Email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="w-full mb-4 p-3 rounded-lg bg-white/15 outline-none placeholder-gray-400 border border-white/10 focus:border-indigo-400"
        />

        <input
          type="password"
          placeholder="Password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          className="w-full mb-6 p-3 rounded-lg bg-white/15 outline-none placeholder-gray-400 border border-white/10 focus:border-indigo-400"
        />

        <button
          onClick={handleLogin}
          disabled={loading}
          className="w-full bg-indigo-600 py-3 rounded-lg hover:bg-indigo-700 disabled:opacity-70 font-semibold text-base transition"
        >
          {loading ? "Logging in..." : "Login"}
        </button>

        <p className="text-center text-sm text-gray-400 mt-6">
          New here?{" "}
          <button
            onClick={() => navigate("/signup")}
            className="text-indigo-400 hover:text-indigo-300 font-semibold transition"
          >
            Create an account
          </button>
        </p>

      </div>
    </div>
  );
}
