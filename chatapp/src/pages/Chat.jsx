import { useState, useEffect, useRef } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import socket from "../socket";
import MessageBubble from "../components/MessageBubble";

export default function Chat() {
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState("");
  const [typingUser, setTypingUser] = useState(null);
  const [group, setGroup] = useState(null);
  const [onlineUsers, setOnlineUsers] = useState([]);
  const [deleteVote, setDeleteVote] = useState(null);
  const [filePreview, setFilePreview] = useState(null);

  const userRef = useRef(JSON.parse(localStorage.getItem("user")) || {});
  const user = userRef.current;
  const groupRef = useRef(null);
  const bottomRef = useRef();
  const fileInputRef = useRef();
  const location = useLocation();
  const navigate = useNavigate();

  useEffect(() => {
    const storedGroup = JSON.parse(localStorage.getItem("currentGroup"));
    setGroup(storedGroup);
    groupRef.current = storedGroup;
  }, [location]);

  useEffect(() => {
    if (!group) return;
    groupRef.current = group;
    socket.emit("join_group", group.name, user.name);
    setMessages([]);
    setOnlineUsers([]);
    socket.emit("get_messages", group.name);
    socket.emit("mark_seen", { group: group.name, userName: user.name });
  }, [group]);

  useEffect(() => {
    const handler = (data) => {
      if (!groupRef.current || data.group !== groupRef.current.name) return;
      setTypingUser(null);
      if (data.userName !== user.name && groupRef.current) {
        socket.emit("mark_seen", { group: groupRef.current.name, userName: user.name });
      }
      setMessages((prev) => [...prev, {
        _id: data.id || null,
        tempId: data.tempId,
        text: data.text,
        own: data.userName === user.name,
        userName: data.userName,
        time: data.time,
        status: "delivered",
        fileData: data.fileData || null,
        fileName: data.fileName || null,
        fileType: data.fileType || null,
      }]);
    };
    socket.on("receive_message", handler);
    return () => socket.off("receive_message", handler);
  }, [user.name]);

  useEffect(() => {
    const handler = (data) => {
      setMessages(data.map((msg) => ({
        _id: msg._id || null,
        text: msg.text,
        own: msg.userName === user.name,
        userName: msg.userName,
        time: msg.time,
        status: msg.status || "delivered",
        fileData: msg.fileData || null,
        fileName: msg.fileName || null,
        fileType: msg.fileType || null,
      })));
    };
    socket.on("load_messages", handler);
    return () => socket.off("load_messages", handler);
  }, [user.name]);

  useEffect(() => {
    socket.on("typing", (userName) => {
      if (userName !== user.name) setTypingUser(userName);
    });
    socket.on("stop_typing", () => setTypingUser(null));
    return () => {
      socket.off("typing");
      socket.off("stop_typing");
    };
  }, [user.name]);

  useEffect(() => {
    socket.on("messages_seen", () => {
      setMessages((prev) => prev.map((m) => m.own ? { ...m, status: "seen" } : m));
    });
    return () => socket.off("messages_seen");
  }, []);

  useEffect(() => {
    socket.on("upload_error", ({ message }) => {
      alert(message);
      setFilePreview(null);
    });
    return () => socket.off("upload_error");
  }, []);

  useEffect(() => {
    socket.on("message_deleted", ({ messageId }) => {
      setMessages((prev) => prev.filter((m) => String(m._id) !== String(messageId)));
    });
    return () => socket.off("message_deleted");
  }, []);
  function deleteMessage(msg) {
    if (!msg._id) return;
    socket.emit("delete_message", {
      messageId: msg._id,
      group: groupRef.current.name,
      userName: user.name,
    });
  }

  useEffect(() => {
    socket.on("online_users", (users) => setOnlineUsers(users));
    return () => socket.off("online_users");
  }, []);

  useEffect(() => {
    socket.on("delete_vote_request", (data) => setDeleteVote(data));
    socket.on("delete_vote_update", (data) => setDeleteVote(data));
    socket.on("delete_vote_cancelled", () => setDeleteVote(null));
    socket.on("group_deleted", ({ group: deletedGroup }) => {
      setDeleteVote(null);
      if (groupRef.current?.name === deletedGroup) {
        localStorage.removeItem("currentGroup");
        navigate("/app");
      }
    });
    return () => {
      socket.off("delete_vote_request");
      socket.off("delete_vote_update");
      socket.off("delete_vote_cancelled");
      socket.off("group_deleted");
    };
  }, []);

  function requestDelete() {
    if (!groupRef.current) return;
    socket.emit("request_delete_group", {
      group: groupRef.current.name,
      userId: user.id,
      userName: user.name,
    });
  }

  function voteDelete(approve) {
    if (!groupRef.current) return;
    socket.emit("vote_delete_group", { group: groupRef.current.name, userName: user.name, approve });
    if (!approve) setDeleteVote(null);
  }

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  function sendMessage() {
    if (!input.trim() && !filePreview) return;
    if (!groupRef.current) return;
    socket.emit("send_message", {
      tempId: Date.now().toString(),
      text: input,
      group: groupRef.current.name,
      userName: user.name,
      userId: user.id,
      time: new Date().toLocaleTimeString(),
      fileData: filePreview?.dataUrl || null,
      fileName: filePreview?.name   || null,
      fileType: filePreview?.type   || null,
    });
    setInput("");
    setFilePreview(null);
  }

  function handleFilePick(e) {
    const file = e.target.files[0];
    if (!file) return;

    const MAX_MB = 2;
    const MAX_BYTES = MAX_MB * 1024 * 1024;

    if (file.size > MAX_BYTES) {
      alert(`Image too large. Maximum allowed size is ${MAX_MB}MB.\nYour file: ${(file.size / 1024 / 1024).toFixed(1)}MB`);
      e.target.value = "";
      return;
    }

    const reader = new FileReader();
    reader.onload = () => setFilePreview({ dataUrl: reader.result, name: file.name, type: file.type });
    reader.readAsDataURL(file);
    e.target.value = "";
  }

  function handleTyping(e) {
    setInput(e.target.value);
    if (!groupRef.current || !user.name) return;
    socket.emit("typing", { group: groupRef.current.name, userName: user.name });
    clearTimeout(window.typingTimeout);
    window.typingTimeout = setTimeout(() => {
      socket.emit("stop_typing", { group: groupRef.current.name });
    }, 1500);
  }

  if (!group) {
    return (
      <div className="flex items-center justify-center h-full text-gray-400">
        Select a group to start chatting
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full w-full backdrop-blur-sm bg-black/20">

      {/* HEADER */}
      <div className="px-6 py-3 border-b border-white/10 bg-gradient-to-r from-indigo-900/60 to-purple-900/40 backdrop-blur-md flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-2 h-2 rounded-full bg-indigo-400 shadow-[0_0_8px_2px_rgba(129,140,248,0.8)]"></div>
          <span className="font-bold text-xl">{group.name}</span>
        </div>

        <div className="flex items-center gap-3">
          <div className="flex -space-x-2">
            {onlineUsers.slice(0, 5).map((name, i) => (
              <div key={i} title={name} className="w-7 h-7 rounded-full bg-indigo-600 border-2 border-white/20 flex items-center justify-center text-xs font-bold uppercase">
                {name?.[0]}
              </div>
            ))}
          </div>
          <span className="text-xs text-green-400 font-medium flex items-center gap-1">
            <span className="w-1.5 h-1.5 rounded-full bg-green-400 inline-block"></span>
            {onlineUsers.length} online
          </span>
          <button
            onClick={requestDelete}
            className="ml-2 px-3 py-1 rounded-lg bg-red-600/30 hover:bg-red-600/60 border border-red-500/40 text-red-400 text-xs font-semibold transition"
          >
            Delete Group
          </button>
        </div>
      </div>

      {/* MESSAGES */}
      <div className="flex-1 p-6 overflow-y-auto space-y-4">

        {/* EMPTY STATE */}
        {messages.length === 0 && (
          <div className="flex flex-col items-center justify-center h-full gap-3 select-none">
            <div className="text-5xl">💬</div>
            <p className="text-white font-bold text-xl">Let's start the GenZ innovation</p>
            <p className="text-gray-400 text-sm">Be the first to say something in <span className="text-indigo-400 font-semibold">{group.name}</span></p>
          </div>
        )}

        {messages.map((msg, index) => (
          <div key={index} className="group relative">
            <p className={`text-xs mb-1 font-medium ${msg.own ? "text-right text-indigo-300" : "text-left text-purple-300"}`}>
              {msg.userName}
            </p>
            <div className={`flex items-end gap-2 ${msg.own ? "justify-end" : "justify-start"}`}>
              <MessageBubble message={msg.text} isOwn={msg.own}
                fileData={msg.fileData} fileName={msg.fileName} fileType={msg.fileType} />
              {/* Delete button — own messages, visible on hover (desktop) or always subtle (mobile) */}
              {msg.own && msg._id && (
                <button
                  onClick={() => deleteMessage(msg)}
                  className="opacity-0 group-hover:opacity-100 active:opacity-100 transition text-gray-600 hover:text-red-400 active:text-red-400 mb-1 shrink-0 touch-manipulation"
                  title="Delete message"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                  </svg>
                </button>
              )}
            </div>
            <p className={`text-[10px] text-gray-500 mt-1 flex items-center gap-1 ${msg.own ? "justify-end" : "justify-start"}`}>
              {msg.time}
              {msg.own && (
                <span className={`text-[11px] font-bold ${msg.status === "seen" ? "text-blue-400" : "text-gray-400"}`}>
                  {msg.status === "seen" ? "seen" : msg.status === "delivered" ? "delivered" : "sent"}
                </span>
              )}
            </p>
          </div>
        ))}
        <div ref={bottomRef}></div>
      </div>

      {/* TYPING INDICATOR */}
      <div className="px-6 h-6">
        {typingUser && (
          <p className="text-sm text-indigo-400 italic animate-pulse">{typingUser} is typing...</p>
        )}
      </div>

      {/* FILE PREVIEW */}
      {filePreview && (
        <div className="px-4 pb-2 flex items-center gap-3">
          <div className="flex items-center gap-2 bg-white/10 border border-white/20 rounded-xl px-3 py-2 text-sm text-white max-w-xs">
            <img src={filePreview.dataUrl} alt="" className="w-10 h-10 rounded-lg object-cover" />
            <span className="truncate max-w-[160px] text-xs">{filePreview.name}</span>
          </div>
          <button onClick={() => setFilePreview(null)} className="text-gray-500 hover:text-red-400 transition text-lg">✕</button>
        </div>
      )}

      {/* INPUT */}
      <div className="p-4 pb-[max(1rem,env(safe-area-inset-bottom))] border-t border-white/10 flex gap-3 bg-black/30 backdrop-blur-md items-center">

        {/* Hidden file input */}
        <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={handleFilePick} />

        {/* Image button */}
        <button
          onClick={() => fileInputRef.current.click()}
          className="flex items-center justify-center w-10 h-10 rounded-xl bg-indigo-600/30 border border-indigo-500/40 text-indigo-300 hover:bg-indigo-600 hover:text-white transition shrink-0"
          title="Send image"
        >
          <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
          </svg>
        </button>

        <input
          value={input}
          onChange={handleTyping}
          onKeyDown={(e) => e.key === "Enter" && sendMessage()}
          className="flex-1 p-3 rounded-xl bg-white/10 text-white placeholder-gray-400 outline-none border border-white/10 focus:border-indigo-500 focus:bg-white/15 transition"
          placeholder="Type message..."
        />
        <button
          onClick={sendMessage}
          disabled={!input.trim() && !filePreview}
          className="bg-indigo-600 px-6 py-3 rounded-xl hover:bg-indigo-500 transition font-semibold shadow-[0_0_15px_rgba(99,102,241,0.5)] hover:shadow-[0_0_25px_rgba(99,102,241,0.8)] disabled:opacity-40 disabled:cursor-not-allowed disabled:shadow-none"
        >
          Send
        </button>
      </div>

      {/* DELETE VOTE POPUP */}
      {deleteVote && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm">
          <div className="bg-[#1a1a2e] border border-red-500/30 rounded-2xl p-8 w-96 text-white shadow-2xl">
            <div className="text-3xl mb-3 text-center">🗑️</div>
            <h3 className="text-xl font-bold text-center mb-2">Delete Group?</h3>
            <p className="text-sm text-gray-400 text-center mb-2">
              <span className="text-white font-semibold">{deleteVote.initiator}</span> wants to delete{" "}
              <span className="text-red-400 font-semibold">{deleteVote.group}</span>
            </p>
            <p className="text-xs text-gray-500 text-center mb-6">
              All messages will be permanently deleted. All members must approve.
            </p>
            <div className="flex justify-center gap-2 mb-5">
              {Array.from({ length: deleteVote.total }).map((_, i) => (
                <div key={i} className={`w-3 h-3 rounded-full ${i < deleteVote.votes ? "bg-red-500" : "bg-white/20"}`}></div>
              ))}
            </div>
            <p className="text-xs text-center text-gray-400 mb-5">{deleteVote.votes}/{deleteVote.total} approved</p>
            {deleteVote.initiator !== user.name ? (
              <div className="flex gap-3">
                <button onClick={() => voteDelete(false)} className="flex-1 py-2 rounded-lg border border-white/20 hover:bg-white/10 transition text-sm">
                  ✕ Reject
                </button>
                <button onClick={() => voteDelete(true)} className="flex-1 py-2 rounded-lg bg-red-600 hover:bg-red-500 transition text-sm font-semibold">
                  ✓ Approve
                </button>
              </div>
            ) : (
              <p className="text-xs text-center text-gray-500">Waiting for others to vote...</p>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
