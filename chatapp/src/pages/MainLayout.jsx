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
  const [socketConnected, setSocketConnected] = useState(socket.connected);
  const location = useLocation();

  useEffect(() => {
    let cancelled = false;
    axios.get(`${SERVER}/api/groups`)
      .then((res) => { if (!cancelled) setGroups(res.data); })
      .catch(() => {
        if (!cancelled) setGroups([
          { _id: "programming", name: "Programming" },
          { _id: "gaming", name: "Gaming" },
          { _id: "ai", name: "AI" },
          { _id: "photography", name: "Photography" },
        ]);
      });
    return () => { cancelled = true; };
  }, []);

  // Socket connection status
  useEffect(() => {
    const onConnect = () => setSocketConnected(true);
    const onDisconnect = () => setSocketConnected(false);
    socket.on("connect", onConnect);
    socket.on("disconnect", onDisconnect);
    return () => { socket.off("connect", onConnect); socket.off("disconnect", onDisconnect); };
  }, []);

  // Join ALL groups on socket so we receive messages from every group
  useEffect(() => {
    if (groups.length === 0) return;
    groups.forEach((g) => socket.emit("join_group", g.name, ""));
  }, [groups]);

  // Show custom notification permission prompt
  useEffect(() => {
    if (!("Notification" in window)) return;
    const asked = localStorage.getItem("notifAsked");
    if (!asked) {
      const t = setTimeout(() => setNotifPrompt(true), 1500);
      return () => clearTimeout(t);
    }
  }, []);

  // Listen for incoming messages — update unread count AND last message preview
  useEffect(() => {
    const handler = (data) => {
      const user = JSON.parse(localStorage.getItem("user")) || {};

      // update last message preview for that group
      setGroups((prev) => prev.map((g) =>
        g.name === data.group
          ? { ...g, lastMessage: data.text, lastMessageTime: data.time }
          : g
      ));

      if (data.userName === user.name) return;
      const viewing = JSON.parse(localStorage.getItem("currentGroup"));
      if (viewing && viewing.name === data.group) return;

      // unread count
      setUnread((prev) => ({
        ...prev,
        [data.group]: (prev[data.group] || 0) + 1,
      }));

      // sound — iOS Safari requires AudioContext to be resumed after user gesture
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
          o.start(ctx.currentTime);
          o.stop(ctx.currentTime + 0.3);
        }
      } catch (_) {}

      // browser notification (background tab)
      if (Notification.permission === "granted" && document.hidden) {
        new Notification(`${data.group} — ${data.userName}`, {
          body: data.text,
          icon: "/vite.svg",
        });
      }

      // in-app toast notification
      setToast({ group: data.group, userName: data.userName, text: data.text });
      clearTimeout(window._toastTimer);
      window._toastTimer = setTimeout(() => setToast(null), 3500);
    };

    socket.on("receive_message", handler);
    return () => socket.off("receive_message", handler);
  }, []);

  // Update sidebar when a message is deleted
  useEffect(() => {
    const handler = ({ group, newLastMessage, newLastMessageTime }) => {
      setGroups((prev) => prev.map((g) =>
        g.name === group
          ? { ...g, lastMessage: newLastMessage, lastMessageTime: newLastMessageTime }
          : g
      ));
    };
    socket.on("message_deleted", handler);
    return () => socket.off("message_deleted", handler);
  }, []);

  // Remove group from list when deleted
  useEffect(() => {
    socket.on("group_deleted", ({ group }) => {
      setGroups((prev) => prev.filter((g) => g.name !== group));
    });
    return () => socket.off("group_deleted");
  }, []);

  // Clear unread when user navigates to a group
  useEffect(() => {
    const currentGroup = JSON.parse(localStorage.getItem("currentGroup"));
    if (currentGroup) {
      setUnread((prev) => ({ ...prev, [currentGroup.name]: 0 }));
    }
  }, [location]);

  return (
    <div
      className="flex h-screen bg-cover bg-center relative"
      style={{ backgroundImage: `url(${sky})` }}
    >
      <div className="absolute inset-0 bg-black/60"></div>

      <Sidebar
        groups={groups}
        unread={unread}
        onGroupCreated={(g) => setGroups((prev) => [...prev, g])}
      />

      <div className="flex-1 flex flex-col text-white relative z-10">
        <Outlet />
      </div>

      {/* RECONNECTING BANNER */}
      {!socketConnected && (
        <div className="fixed top-0 left-0 right-0 z-50 bg-yellow-500/90 text-black text-xs font-semibold text-center py-1.5">
          Reconnecting...
        </div>
      )}

      {/* IN-APP NOTIFICATION TOAST */}
      {toast && (
        <div className="fixed top-4 right-4 z-50 bg-[#1a1a2e] border border-indigo-500/40 rounded-2xl px-4 py-3 shadow-2xl flex items-start gap-3 max-w-xs animate-fade-in">
          <div className="w-8 h-8 rounded-full bg-indigo-600 flex items-center justify-center text-white font-bold text-sm shrink-0">
            {toast.userName?.[0]?.toUpperCase()}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-xs text-indigo-300 font-semibold">{toast.group}</p>
            <p className="text-xs text-white font-medium truncate">{toast.userName}</p>
            <p className="text-xs text-gray-400 truncate mt-0.5">{toast.text || "📎 sent an image"}</p>
          </div>
          <button onClick={() => setToast(null)} className="text-gray-600 hover:text-white text-xs mt-0.5">✕</button>
        </div>
      )}

      {/* CUSTOM NOTIFICATION PERMISSION DIALOG */}
      {notifPrompt && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 bg-[#1a1a2e] border border-white/10 rounded-2xl px-6 py-5 shadow-2xl flex items-center gap-5 max-w-sm w-full mx-4">
          <div className="text-3xl">🔔</div>
          <div className="flex-1">
            <p className="text-white font-semibold text-sm">Allow notifications?</p>
            <p className="text-gray-400 text-xs mt-0.5">Get notified when new messages arrive</p>
          </div>
          <div className="flex gap-2 shrink-0">
            <button
              onClick={() => {
                setNotifPrompt(false);
                localStorage.setItem("notifAsked", "true");
                Notification.requestPermission();
              }}
              className="px-3 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold transition"
            >
              Allow
            </button>
            <button
              onClick={() => {
                setNotifPrompt(false);
                localStorage.setItem("notifAsked", "denied");
              }}
              className="px-3 py-1.5 rounded-lg border border-white/20 hover:bg-white/10 text-gray-300 text-xs transition"
            >
              No
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
