import { useNavigate } from "react-router-dom";
import { useState, useEffect } from "react";
import axios from "axios";
import SERVER from "../config";

export default function Sidebar({ groups, onGroupCreated, unread = {}, onGroupSelect }) {
  const navigate = useNavigate();
  const [active, setActive] = useState(null);
  const [showModal, setShowModal] = useState(false);
  const [newGroupName, setNewGroupName] = useState("");
  const [selectedInterest, setSelectedInterest] = useState("");
  const [error, setError] = useState("");
  const [creating, setCreating] = useState(false);
  const [search, setSearch] = useState("");

  const filteredGroups = groups.filter((g) =>
    g.name.toLowerCase().includes(search.toLowerCase())
  );

  const interests = ["Programming", "Gaming", "AI", "Photography", "Music", "Sports", "Science", "Art", "Travel", "Other"];

  useEffect(() => {
    const storedGroup = JSON.parse(localStorage.getItem("currentGroup"));
    if (storedGroup) setActive(storedGroup._id);
  }, []);

  function handleClick(group) {
    setActive(group._id);
    localStorage.setItem("currentGroup", JSON.stringify(group));
    onGroupSelect && onGroupSelect();
    navigate("/app/chat");
  }

  function openModal() {
    setNewGroupName(""); setSelectedInterest(""); setError("");
    setShowModal(true);
  }

  async function handleCreateGroup() {
    if (!newGroupName.trim()) { setError("Group name is required"); return; }
    if (newGroupName.trim().length < 3) { setError("Name must be at least 3 characters"); return; }
    if (!selectedInterest) { setError("Please select an interest"); return; }

    setCreating(true); setError("");
    try {
      const res = await axios.post(`${SERVER}/api/groups/create`, {
        name: newGroupName.trim(),
        interest: selectedInterest,
      });
      setShowModal(false);
      onGroupCreated && onGroupCreated(res.data);
    } catch (err) {
      setError(err.response?.data?.message || "Failed to create group");
    } finally {
      setCreating(false);
    }
  }

  return (
    <>
      <div className="w-full h-full bg-[#0d0d1a] border-r border-white/10 text-white flex flex-col relative z-10">

        {/* TITLE */}
        <h2 className="text-2xl font-bold px-6 pt-6 pb-4 tracking-wide">Groups</h2>

        {/* SEARCH */}
        <div className="px-4 pb-3">
          <input
            type="text"
            placeholder="Search groups..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full p-2 rounded-lg bg-white/10 border border-white/10 text-white text-sm placeholder-gray-400 outline-none focus:border-indigo-500 transition"
          />
        </div>

        {/* GROUP LIST */}
        <div className="flex-1 overflow-y-auto">
          {filteredGroups.length === 0 && (
            <p className="text-gray-500 text-sm text-center mt-6">No groups found</p>
          )}
          {filteredGroups.map((group) => (
            <div
              key={group._id}
              onClick={() => handleClick(group)}
              className={`px-6 py-4 cursor-pointer border-b border-white/10 transition-all duration-200 flex items-center justify-between gap-2 ${
                active === group._id ? "bg-[#2d2d6b]" : "hover:bg-white/5"
              }`}
            >
              <div className="flex-1 min-w-0">
                <p className="text-base font-semibold truncate">{group.name}</p>
                <p className="text-xs text-gray-400 truncate mt-0.5">
                  {group.lastMessage || "No messages yet"}
                </p>
              </div>
              <div className="flex flex-col items-end gap-1 shrink-0">
                {group.lastMessageTime && (
                  <span className="text-[10px] text-gray-500">{group.lastMessageTime}</span>
                )}
                {unread[group.name] > 0 && (
                  <span className="bg-indigo-500 text-white text-xs font-bold px-2 py-0.5 rounded-full min-w-[20px] text-center">
                    {unread[group.name] > 99 ? "99+" : unread[group.name]}
                  </span>
                )}
              </div>
            </div>
          ))}
        </div>

        <div className="px-4 py-3 border-t border-white/10">
          <button
            onClick={openModal}
            className="w-full py-2 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-sm font-semibold transition"
          >
            + Create Group
          </button>
        </div>

        {/* USER INFO + LOGOUT */}
        <div className="px-4 py-3 border-t border-white/10 flex items-center gap-3">
          {/* Avatar — click to open profile */}
          <div
            onClick={() => navigate("/profile")}
            className="w-9 h-9 rounded-full bg-indigo-600 flex items-center justify-center text-white font-bold text-sm shrink-0 cursor-pointer hover:bg-indigo-500 transition"
            title="View profile"
          >
            {(JSON.parse(localStorage.getItem("user"))?.name || "U")[0].toUpperCase()}
          </div>

          {/* Name */}
          <div
            onClick={() => navigate("/profile")}
            className="flex-1 min-w-0 cursor-pointer"
          >
            <p className="text-[10px] text-gray-500">Logged in as</p>
            <p className="text-white font-semibold text-sm truncate leading-tight">
              {JSON.parse(localStorage.getItem("user"))?.name || "User"}
            </p>
          </div>

          {/* Logout button */}
          <button
            onClick={() => {
              localStorage.removeItem("user");
              localStorage.removeItem("currentGroup");
              navigate("/login");
            }}
            title="Logout"
            className="text-gray-500 hover:text-red-400 transition p-1 rounded-lg hover:bg-white/5"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a2 2 0 01-2 2H5a2 2 0 01-2-2V7a2 2 0 012-2h6a2 2 0 012 2v1" />
            </svg>
          </button>
        </div>
      </div>

      {/* CREATE GROUP MODAL */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
          <div className="bg-[#1a1a2e] border border-white/10 rounded-2xl p-8 w-96 text-white shadow-2xl">
            <h3 className="text-xl font-bold mb-1">Create New Group</h3>
            <p className="text-xs text-gray-400 mb-6">Give your group a name and pick an interest</p>

            {/* Group name */}
            <input
              type="text"
              placeholder="Group name (min 3 chars)..."
              value={newGroupName}
              onChange={(e) => { setNewGroupName(e.target.value); setError(""); }}
              onKeyDown={(e) => e.key === "Enter" && handleCreateGroup()}
              className="w-full p-3 rounded-lg bg-white/10 border border-white/10 outline-none focus:border-indigo-500 mb-4 placeholder-gray-400"
              autoFocus
              maxLength={30}
            />

            {/* Interest tags */}
            <p className="text-xs text-gray-400 mb-2">Select an interest</p>
            <div className="flex flex-wrap gap-2 mb-5">
              {interests.map((tag) => (
                <button
                  key={tag}
                  onClick={() => { setSelectedInterest(tag); setError(""); }}
                  className={`px-3 py-1 rounded-full text-xs font-semibold border transition ${
                    selectedInterest === tag
                      ? "bg-indigo-600 border-indigo-500 text-white"
                      : "border-white/20 text-gray-300 hover:bg-white/10"
                  }`}
                >
                  {tag}
                </button>
              ))}
            </div>

            {/* Error */}
            {error && <p className="text-red-400 text-xs mb-3">{error}</p>}

            <div className="flex gap-3">
              <button
                onClick={() => setShowModal(false)}
                className="flex-1 py-2 rounded-lg border border-white/20 hover:bg-white/10 transition text-sm"
              >
                Cancel
              </button>
              <button
                onClick={handleCreateGroup}
                disabled={creating}
                className="flex-1 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-500 transition text-sm font-semibold disabled:opacity-60"
              >
                {creating ? "Creating..." : "Create"}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
