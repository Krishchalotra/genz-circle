import { useState, useEffect } from "react";
import Sidebar from "../components/Sidebar";
import sky from "../assets/sky.jpg";
import { Outlet, useLocation } from "react-router-dom";
import axios from "axios";
import socket from "../socket";
import SERVER from "../config";

export default function MainLayout() {
  const [groups, setGroups] = useState([]);
  const [unread, setUnread] = useState({});
  const [toast, setToast] = useState(null);
  const [notifPrompt, setNotifPrompt] = useState(false);
  const [socketConnected, setSocketConnected] = useState(true);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const location = useLocation();

  // open sidebar on desktop by default
  useEffect(() => {
    setSidebarOpen(window.innerWidth >= 768);
  }, []);

  // close sidebar on mobile when navigating
  useEffect(() => {
    if (window.innerWidth < 768) setSidebarOpen(false);
  }, [location.pathname]);

  useEffect(() => {
    axios.get(`${SERVER}/api/groups`)
      .then((res) => setGroups(res.data))
      .catch(() => setGroups([]));
  }, []);

  useEffect(() => {
    const onConnect = () => setSocketConnected(true);
    const onDisconnect = () => setSocketConnected(false);
    socket.on("connect", onConnect);
    socket.on("disconnect", onDisconnect);
    return () => { socket.off("connect", onConnect); socket.off("disconnect", onDisconnect); };
  }, []);

  useEffect(() => {
    if (groups.length === 0) return;
    groups.forEach((g) => socket.emit("join_group", g.name, ""));
  }, [groups]);

  useEffect(() => {
    if (!("Notification" in window)) return;
    if (!localStorage.getItem("notifAsked")) {
      const t = setTimeout(() => setNotifPrompt(true), 1500);
      return () => clearTimeout(t);
    }
  }, []);

  useEffect(() => {
    const handler = (data) => {
      const user = JSON.parse(localStorage.getItem("user")) || {};
      setGroups((prev) => prev.map((g) =>
        g.name === data.group ? { ...g, lastMessage: data.text, lastMessageTime: data.time } : g
      ));
      if (data.userName === user.name) return;
      const viewing = JSON.parse(localStorage.getItem("currentGroup"));
      if (viewing && viewing.name === data.group) return;
      setUnread((prev) => ({ ...prev, [data.group]: (prev[data.group] || 0) + 1 }));
      try {
        const AudioCtx = window.AudioContext || window.webkitAudioContext;
        if (AudioCtx) {
          const ctx = new AudioCtx();
          if (ctx.state === "suspended") ctx.resume();
          const o = ctx.createOscillator();
          const g = ctx.createGain();
          o.connect(g); g.connect(ctx.destination);
          o.frequency.value = 520;
          g.gain.setValueAtTime(0.3, ctx.currentTime);
          g.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.3);
          o.start(ctx.currentTime); o.stop(ctx.currentTime + 0.3);
        }
      } catch (_) {}
      if (Notification.permission === "granted" && document.hidden) {
        new Notification(`${data.group} — ${data.userName}`, { body: data.text, icon: "/vite.svg" });
      }
      setToast({ group: data.group, userName: data.userName, text: data.text });
      clearTimeout(window._toastTimer);
      window._toastTimer = setTimeout(() => setToast(null), 3500);
    };
    socket.on("receive_message", handler);
    return () => socket.off("receive_message", handler);
  }, []);

  useEffect(() => {
    const handler = ({ group, newLastMessage, newLastMessageTime }) => {
      setGroups((prev) => prev.map((g) =>
        g.name === group ? { ...g, lastMessage: newLastMessage, lastMessageTime: newLastMessageTime } : g
      ));
    };
    socket.on("message_deleted", handler);
    return () => socket.off("message_deleted", handler);
  }, []);

  useEffect(() => {
    socket.on("group_deleted", ({ group }) => setGroups((prev) => prev.filter((g) => g.name !== group)));
    return () => socket.off("group_deleted");
  }, []);

  useEffect(() => {
    const currentGroup = JSON.parse(localStorage.getItem("currentGroup"));
    if (currentGroup) setUnread((prev) => ({ ...prev, [currentGroup.name]: 0 }));
  }, [location]);

  const isChatOpen = location.pathname.includes("/chat");

  return (
    <div className="flex h-screen overflow-hidden bg-cover bg-center relative"
      style={{ backgroundImage: `url(${sky})` }}>
      <div className="absolute inset-0 bg-black/60 pointer-events-none" />

      {/* Mobile overlay */}
      {sidebarOpen && (
        <div className="fixed inset-0 z-20 bg-black/50 md:hidden"
          onClick={() => setSidebarOpen(false)} />
      )}

      {/* Sidebar */}
      <div className={`fixed inset-y-0 left-0 z-30 md:relative md:z-10 md:translate-x-0
        transition-transform duration-300 w-72 md:w-64 shrink-0
        ${sidebarOpen ? "translate-x-0" : "-translate-x-full"}`}>
        <Sidebar
          groups={groups}
          unread={unread}
          onGroupCreated={(g) => setGroups((prev) => [...prev, g])}
          onGroupSelect={() => { if (window.innerWidth < 768) setSidebarOpen(false); }}
        />
      </div>

      {/* Main */}
      <div className="flex-1 flex flex-col text-white relative z-10 min-w-0 overflow-hidden">
        {/* Mobile top bar */}
        <div className="md:hidden flex items-center gap-3 px-4 py-3 bg-[#0d0d1a]/90 border-b border-white/10 shrink-0 relative z-10">
          <button onClick={() => setSidebarOpen(true)}
            className="text-white p-2 rounded-lg bg-white/10 active:bg-white/20 touch-manipulation">
            <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 12h16M4 18h16" />
            </svg>
          </button>
          <span className="text-sm font-semibold text-white truncate">
            {JSON.parse(localStorage.getItem("currentGroup"))?.name || "GenZ Circle"}
          </span>
        </div>

        <Outlet />
      </div>

      {/* Reconnecting */}
      {!socketConnected && (
        <div className="fixed top-0 left-0 right-0 z-50 bg-yellow-500/90 text-black text-xs font-semibold text-center py-1.5">
          Reconnecting...
        </div>
      )}

      {/* Toast */}
      {toast && (
        <div className="fixed top-4 right-4 z-50 bg-[#1a1a2e] border border-indigo-500/40 rounded-2xl px-4 py-3 shadow-2xl flex items-start gap-3 w-[calc(100vw-2rem)] max-w-xs">
          <div className="w-8 h-8 rounded-full bg-indigo-600 flex items-center justify-center text-white font-bold text-sm shrink-0">
            {toast.userName?.[0]?.toUpperCase()}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-xs text-indigo-300 font-semibold">{toast.group}</p>
            <p className="text-xs text-white font-medium truncate">{toast.userName}</p>
            <p className="text-xs text-gray-400 truncate mt-0.5">{toast.text || "📎 sent an image"}</p>
          </div>
          <button onClick={() => setToast(null)} className="text-gray-500 hover:text-white text-xs">✕</button>
        </div>
      )}

      {/* Notification prompt */}
      {notifPrompt && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 bg-[#1a1a2e] border border-white/10 rounded-2xl px-5 py-4 shadow-2xl flex items-center gap-4 w-[calc(100vw-2rem)] max-w-sm">
          <div className="text-2xl">🔔</div>
          <div className="flex-1">
            <p className="text-white font-semibold text-sm">Allow notifications?</p>
            <p className="text-gray-400 text-xs mt-0.5">Get notified when messages arrive</p>
          </div>
          <div className="flex gap-2 shrink-0">
            <button onClick={() => { setNotifPrompt(false); localStorage.setItem("notifAsked", "true"); Notification.requestPermission(); }}
              className="px-3 py-1.5 rounded-lg bg-indigo-600 text-white text-xs font-semibold">Allow</button>
            <button onClick={() => { setNotifPrompt(false); localStorage.setItem("notifAsked", "denied"); }}
              className="px-3 py-1.5 rounded-lg border border-white/20 text-gray-300 text-xs">No</button>
          </div>
        </div>
      )}
    </div>
  );
}
