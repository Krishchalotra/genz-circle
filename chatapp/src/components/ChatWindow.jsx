import { useState, useEffect, useRef } from "react";
import MessageBubble from "./MessageBubble";
import socket from "../socket";

export default function ChatWindow({ group }) {
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState("");
  const [typingUser, setTypingUser] = useState(null);
  const [filePreview, setFilePreview] = useState(null); // { dataUrl, name, type }

  const userRef = useRef(JSON.parse(localStorage.getItem("user")) || {});
  const user = userRef.current;
  const groupRef = useRef(group);
  const bottomRef = useRef();
  const fileInputRef = useRef();

  useEffect(() => { groupRef.current = group; }, [group]);

  // JOIN GROUP + LOAD MESSAGES
  useEffect(() => {
    if (!group) return;
    socket.emit("join_group", group.name);
    setMessages([]);
    socket.emit("get_messages", group.name);
  }, [group]);

  // RECEIVE NEW MESSAGE
  useEffect(() => {
    const handleMessage = (data) => {
      setTypingUser(null);
      setMessages((prev) => [...prev, {
        text:     data.text,
        own:      data.userName === user.name,
        userName: data.userName,
        time:     data.time,
        fileData: data.fileData || null,
        fileName: data.fileName || null,
        fileType: data.fileType || null,
      }]);
    };
    socket.on("receive_message", handleMessage);
    return () => socket.off("receive_message", handleMessage);
  }, [user.name]);

  // LOAD OLD MESSAGES
  useEffect(() => {
    const handleLoad = (data) => {
      setMessages(data.map((msg) => ({
        text:     msg.text,
        own:      msg.userName === user.name,
        userName: msg.userName,
        time:     msg.time,
        fileData: msg.fileData || null,
        fileName: msg.fileName || null,
        fileType: msg.fileType || null,
      })));
    };
    socket.on("load_messages", handleLoad);
    return () => socket.off("load_messages", handleLoad);
  }, [user.name]);

  // TYPING
  useEffect(() => {
    socket.on("typing", (userName) => {
      if (userName !== user.name) setTypingUser(userName);
    });
    socket.on("stop_typing", () => setTypingUser(null));
    return () => { socket.off("typing"); socket.off("stop_typing"); };
  }, []);

  // AUTO SCROLL
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // FILE PICKED
  function handleFilePick(e) {
    const file = e.target.files[0];
    if (!file) return;

    const MAX = 5 * 1024 * 1024; // 5 MB limit
    if (file.size > MAX) {
      alert("File too large. Max size is 5 MB.");
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      setFilePreview({ dataUrl: reader.result, name: file.name, type: file.type });
    };
    reader.readAsDataURL(file);
    e.target.value = ""; // reset so same file can be re-picked
  }

  // SEND MESSAGE
  function sendMessage() {
    if (!input.trim() && !filePreview) return;
    if (!group) return;

    const messageData = {
      text:     input,
      group:    group.name,
      userName: user.name,
      userId:   user.id,
      time:     new Date().toLocaleTimeString(),
      fileData: filePreview?.dataUrl || null,
      fileName: filePreview?.name   || null,
      fileType: filePreview?.type   || null,
    };

    socket.emit("send_message", messageData);

    setMessages((prev) => [...prev, {
      text:     input,
      own:      true,
      userName: user.name,
      time:     messageData.time,
      fileData: filePreview?.dataUrl || null,
      fileName: filePreview?.name   || null,
      fileType: filePreview?.type   || null,
    }]);

    setInput("");
    setFilePreview(null);
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

  function handleKeyPress(e) {
    if (e.key === "Enter" && !e.shiftKey) sendMessage();
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
      <div className="px-6 py-4 font-bold text-xl border-b border-white/10 bg-gradient-to-r from-indigo-900/60 to-purple-900/40 backdrop-blur-md flex items-center gap-3">
        <div className="w-2 h-2 rounded-full bg-indigo-400 shadow-[0_0_8px_2px_rgba(129,140,248,0.8)]"></div>
        {group.name}
      </div>

      {/* MESSAGES */}
      <div className="flex-1 p-6 overflow-y-auto space-y-4">
        {messages.map((msg, index) => (
          <div key={index}>
            <p className={`text-xs mb-1 font-medium ${msg.own ? "text-right text-indigo-300" : "text-left text-purple-300"}`}>
              {msg.userName}
            </p>
            <MessageBubble
              message={msg.text}
              isOwn={msg.own}
              fileData={msg.fileData}
              fileName={msg.fileName}
              fileType={msg.fileType}
            />
            <p className={`text-[10px] text-gray-500 mt-1 ${msg.own ? "text-right" : "text-left"}`}>
              {msg.time}
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
            {filePreview.type.startsWith("image/") ? (
              <img src={filePreview.dataUrl} alt="" className="w-10 h-10 rounded-lg object-cover" />
            ) : (
              <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5 text-indigo-300" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828L18 9.828A4 4 0 1012.343 4.1L5.757 10.686a6 6 0 108.485 8.485L20 13" />
              </svg>
            )}
            <span className="truncate max-w-[160px] text-xs">{filePreview.name}</span>
          </div>
          <button
            onClick={() => setFilePreview(null)}
            className="text-gray-500 hover:text-red-400 transition text-lg leading-none"
          >
            ✕
          </button>
        </div>
      )}

      {/* INPUT */}
      <div className="p-4 border-t border-white/10 flex gap-3 bg-black/30 backdrop-blur-md items-center">

        {/* Hidden file input — images only */}
        <input
          ref={fileInputRef}
          type="file"
          accept="image/jpeg,image/jpg,image/png,image/gif,image/webp"
          className="hidden"
          onChange={handleFilePick}
        />

        {/* Image picker button */}
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
          onKeyDown={handleKeyPress}
          className="flex-1 p-3 rounded-xl bg-white/10 text-white placeholder-gray-400 outline-none border border-white/10 focus:border-indigo-500 focus:bg-white/15 transition"
          placeholder="Type message..."
        />
        <button
          onClick={sendMessage}
          className="bg-indigo-600 px-6 py-3 rounded-xl hover:bg-indigo-500 transition font-semibold shadow-[0_0_15px_rgba(99,102,241,0.5)] hover:shadow-[0_0_25px_rgba(99,102,241,0.8)]"
        >
          Send
        </button>
      </div>
    </div>
  );
}
