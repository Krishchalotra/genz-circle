import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import SERVER from "../config";

function Avatar({ name, size = 80 }) {
  const initials = name
    ? name.split(" ").map((w) => w[0]).join("").toUpperCase().slice(0, 2)
    : "?";
  const palette = ["#6366f1", "#8b5cf6", "#ec4899", "#14b8a6", "#f59e0b", "#10b981"];
  const bg = palette[(name?.charCodeAt(0) || 0) % palette.length];
  return (
    <div
      style={{ width: size, height: size, background: bg, fontSize: size * 0.36 }}
      className="rounded-full flex items-center justify-center font-bold text-white shrink-0 shadow-lg"
    >
      {initials}
    </div>
  );
}

const tagStyle = {
  Programming: "bg-indigo-500/20 text-indigo-300 border-indigo-500/40",
  Gaming:      "bg-purple-500/20 text-purple-300 border-purple-500/40",
  AI:          "bg-cyan-500/20 text-cyan-300 border-cyan-500/40",
  Photography: "bg-pink-500/20 text-pink-300 border-pink-500/40",
  Music:       "bg-yellow-500/20 text-yellow-300 border-yellow-500/40",
  Sports:      "bg-green-500/20 text-green-300 border-green-500/40",
  Science:     "bg-blue-500/20 text-blue-300 border-blue-500/40",
  Art:         "bg-rose-500/20 text-rose-300 border-rose-500/40",
  Travel:      "bg-teal-500/20 text-teal-300 border-teal-500/40",
  Other:       "bg-gray-500/20 text-gray-300 border-gray-500/40",
};

export default function Profile() {
  const navigate = useNavigate();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    const stored = JSON.parse(localStorage.getItem("user"));
    const userId = stored?.id || stored?._id;
    if (!userId) { navigate("/login"); return; }

    axios
      .get(`${SERVER}/api/users/profile/${userId}`)
      .then((res) => setData(res.data))
      .catch(() => setError("Failed to load profile"))
      .finally(() => setLoading(false));
  }, [navigate]);

  if (loading) return (
    <div className="min-h-screen bg-[#0d0d1a] flex items-center justify-center text-gray-400 text-sm">
      Loading profile...
    </div>
  );

  if (error) return (
    <div className="min-h-screen bg-[#0d0d1a] flex items-center justify-center text-red-400 text-sm">
      {error}
    </div>
  );

  const { user, groups, activity } = data;
  const memberSince = activity.memberSince
    ? new Date(activity.memberSince).toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" })
    : "Unknown";

  return (
    <div className="min-h-screen bg-[#0d0d1a] text-white">

      {/* TOP NAV */}
      <div className="border-b border-white/10 px-6 py-4 flex items-center gap-4 bg-[#0d0d1a]/80 backdrop-blur sticky top-0 z-10">
        <button
          onClick={() => navigate("/app/chat")}
          className="text-gray-400 hover:text-white transition text-sm flex items-center gap-2"
        >
          ← Back to Chat
        </button>
        <span className="text-white/20">|</span>
        <span className="text-sm text-gray-300 font-semibold">Profile</span>
      </div>

      <div className="max-w-2xl mx-auto px-6 py-10 space-y-6">

        {/* HERO CARD */}
        <div className="bg-white/5 border border-white/10 rounded-2xl p-8">
          <div className="flex items-center gap-6">
            <Avatar name={user.name} size={80} />
            <div className="flex-1 min-w-0">
              <h1 className="text-2xl font-bold truncate">{user.name}</h1>
              <p className="text-gray-400 text-sm mt-1 truncate">{user.email}</p>
              <p className="text-gray-500 text-xs mt-2">
                User ID: <span className="font-mono text-gray-400">{user._id}</span>
              </p>
            </div>
          </div>
          <div className="mt-5 pt-5 border-t border-white/10 text-xs text-gray-500">
            Member since <span className="text-gray-300">{memberSince}</span>
          </div>
        </div>

        {/* STATS */}
        <div className="grid grid-cols-3 gap-4">
          {[
            { label: "Messages Sent", value: activity.totalMessages },
            { label: "Groups Joined", value: groups.length },
            { label: "Last Active",   value: activity.lastSeen || "—" },
          ].map((s) => (
            <div key={s.label} className="bg-white/5 border border-white/10 rounded-xl p-5 text-center">
              <p className="text-2xl font-bold text-indigo-400">{s.value}</p>
              <p className="text-xs text-gray-400 mt-1">{s.label}</p>
            </div>
          ))}
        </div>

        {/* INTERESTS */}
        {user.interests?.length > 0 && (
          <div className="bg-white/5 border border-white/10 rounded-2xl p-6">
            <h2 className="text-xs font-semibold text-gray-400 uppercase tracking-widest mb-4">Interests</h2>
            <div className="flex flex-wrap gap-2">
              {user.interests.map((tag) => (
                <span key={tag} className={`px-3 py-1 rounded-full text-xs font-semibold border ${tagStyle[tag] || tagStyle.Other}`}>
                  {tag}
                </span>
              ))}
            </div>
          </div>
        )}

        {/* PAST ACTIVITY — GROUPS */}
        <div className="bg-white/5 border border-white/10 rounded-2xl p-6">
          <h2 className="text-xs font-semibold text-gray-400 uppercase tracking-widest mb-4">
            Groups Joined ({groups.length})
          </h2>
          {groups.length === 0 ? (
            <p className="text-gray-500 text-sm">No group activity yet.</p>
          ) : (
            <div className="space-y-2">
              {groups.map((g) => (
                <div
                  key={g._id}
                  onClick={() => {
                    localStorage.setItem("currentGroup", JSON.stringify(g));
                    navigate("/app/chat");
                  }}
                  className="flex items-center gap-4 p-3 rounded-xl hover:bg-white/10 cursor-pointer transition"
                >
                  <Avatar name={g.name} size={40} />
                  <div>
                    <p className="text-sm font-semibold">{g.name}</p>
                    {g.interest && <p className="text-xs text-gray-400">{g.interest}</p>}
                  </div>
                  <span className="ml-auto text-gray-600 text-xs">→</span>
                </div>
              ))}
            </div>
          )}
        </div>

      </div>
    </div>
  );
}
