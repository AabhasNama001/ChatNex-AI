import React, { useState, useEffect, useMemo, useRef } from "react";
import axios from "axios";
import { io } from "socket.io-client";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import rehypeHighlight from "rehype-highlight";
import "highlight.js/styles/github-dark.css";
import { Copy, Check } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { toast } from "react-toastify";

const Home = () => {
  const [chats, setChats] = useState([]);
  const [activeChatId, setActiveChatId] = useState(null);
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState("");
  const [isSending, setIsSending] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [socket, setSocket] = useState(null);
  const [copiedIndex, setCopiedIndex] = useState(null);

  const navigate = useNavigate();
  const messagesEndRef = useRef(null);

  const activeChat = useMemo(
    () => chats.find((c) => c._id === activeChatId) || null,
    [chats, activeChatId]
  );

  // Auto-scroll
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // Load initial chats & setup socket
  useEffect(() => {
    axios
      .get("http://localhost:3000/api/chat", { withCredentials: true })
      .then((res) => setChats(res.data.chats.reverse()))
      .catch(console.error);

    const tempSocket = io("http://localhost:3000", { withCredentials: true });

    tempSocket.on("ai-message-response", (messagePayload) => {
      setMessages((prev) => [
        ...prev,
        { type: "ai", content: messagePayload.content },
      ]);
      setIsSending(false);
    });

    setSocket(tempSocket);

    return () => tempSocket.disconnect();
  }, []);

  // Create new chat
  const createNewChat = async () => {
    let title = window.prompt("Enter a title for the new chat:", "");
    if (title) title = title.trim();
    if (!title) return;

    try {
      const response = await axios.post(
        "http://localhost:3000/api/chat",
        { title },
        { withCredentials: true }
      );

      const chat = response.data.chat;
      setChats((prev) => [chat, ...prev]);
      setActiveChatId(chat._id);
      getMessages(chat._id);
      setSidebarOpen(false);
    } catch (error) {
      console.error("Error creating chat:", error);
    }
  };

  // Fetch messages
  const getMessages = async (chatId) => {
    try {
      const res = await axios.get(
        `http://localhost:3000/api/chat/messages/${chatId}`,
        { withCredentials: true }
      );

      setMessages(
        res.data.messages.map((m) => ({
          type: m.role === "user" ? "user" : "ai",
          content: m.content,
        }))
      );
    } catch (error) {
      console.error("Error fetching messages:", error);
    }
  };

  // Select chat
  const selectChat = (id) => {
    setActiveChatId(id);
    getMessages(id);
    setSidebarOpen(false);
  };

  // Delete chat (local only)
  const deleteChat = (id) => {
    setChats((prev) => prev.filter((c) => c._id !== id));
    if (activeChatId === id) {
      setActiveChatId(null);
      setMessages([]);
    }
  };

  // Send message
  const sendMessage = async (e) => {
    e?.preventDefault?.();
    const text = input.trim();
    if (!text || !activeChatId || isSending) return;

    setIsSending(true);
    setMessages((prev) => [...prev, { type: "user", content: text }]);
    setInput("");

    socket.emit("ai-message", { chat: activeChatId, content: text });
  };

  // Copy message
  const handleCopy = (text, index) => {
    navigator.clipboard.writeText(text);
    setCopiedIndex(index);
    setTimeout(() => setCopiedIndex(null), 1500);
  };

  return (
    <div className="chat-layout h-screen flex flex-col bg-gradient-to-br from-black to-[#35354b]">
      {/* Mobile Top Bar */}
      <header className="lg:hidden flex items-center justify-between px-4 py-3 bg-[#141520] relative">
        <button
          aria-label="Open sidebar"
          onClick={() => setSidebarOpen(true)}
          className="p-2 rounded-md text-gray-200 hover:bg-blue-600/30"
        >
          ☰
        </button>
        <img src="/logo.png" alt="Logo" className="h-10 w-auto" />

        {/* Logout button for mobile/tablet */}
        <div className="absolute right-0 top-0 mt-3 mr-4">
          <button
            onClick={() => {
              document.cookie = "token=; Max-Age=0; path=/;";
              toast.error("Logged out!");
              setTimeout(() => {
                window.location.href = "/login"; // ✅ use navigate instead of window.location.href
              }, 400);
            }}
            className="px-3 py-2 text-sm rounded bg-[#1f2937] border border-blue-700 text-blue-400 font-semibold hover:scale-90 transform transition-transform duration-200"
          >
            Logout
          </button>
        </div>
      </header>

      <div className="flex flex-1 overflow-hidden">
        {/* Sidebar */}
        <aside
          className={`fixed inset-y-0 left-0 z-20 w-64 transform bg-[#141520] p-4 shadow-lg transition-transform
    lg:translate-x-0 lg:relative lg:flex-shrink-0 lg:h-full flex flex-col
    ${sidebarOpen ? "translate-x-0" : "-translate-x-full"}`}
        >
          {/* Close button for mobile */}
          <div className="flex items-center justify-between mb-4 lg:hidden">
            <h2 className="text-gray-200 text-lg font-semibold">Chats</h2>
            <button
              onClick={() => setSidebarOpen(false)}
              className="p-2 text-gray-200 hover:text-red-400"
              aria-label="Close sidebar"
            >
              ✕
            </button>
          </div>

          {/* Logo desktop */}
          <div className="hidden lg:flex justify-center mb-6">
            <img src="/logo.png" alt="Logo" className="h-16 w-auto" />
          </div>

          <button
            onClick={createNewChat}
            className="w-full text-sm px-3 py-2 mb-4 rounded bg-blue-600 text-white hover:bg-blue-700"
          >
            + New Chat
          </button>

          {/* Chat list */}
          <ul className="flex-1 space-y-2 overflow-y-auto custom-scrollbar">
            {chats.map((c) => (
              <li key={c._id} className="relative group">
                <button
                  onClick={() => selectChat(c._id)}
                  className={`w-full px-3 py-2 rounded-md text-left truncate text-gray-200 ${
                    activeChatId === c._id
                      ? "bg-blue-600/30 text-white"
                      : "hover:bg-blue-500/20"
                  }`}
                >
                  {c.title}
                </button>
                <button
                  onClick={() => deleteChat(c._id)}
                  className="absolute top-1 right-2 text-xs text-gray-400 hover:text-red-400 opacity-0 group-hover:opacity-100"
                >
                  ✕
                </button>
              </li>
            ))}
          </ul>

          {/* Logout button at bottom */}
          <div className="mt-4 lg:mt-auto">
            <button
              onClick={() => {
                document.cookie = "token=; Max-Age=0; path=/;";
                toast.error("Logged out!");
                setTimeout(() => {
                  window.location.href = "/login"; // ✅ use navigate instead of window.location.href
                }, 400);
              }}
              className="hidden lg:block w-full px-3 py-2 text-sm rounded bg-[#1f2937] border border-blue-700 text-blue-400 font-semibold hover:bg-[#293145]"
            >
              Logout
            </button>
          </div>
        </aside>

        {/* Mobile overlay */}
        {sidebarOpen && (
          <div
            className="fixed inset-0 z-10 bg-black/40 lg:hidden"
            onClick={() => setSidebarOpen(false)}
          />
        )}

        {/* Main chat area */}
        <main className="flex-1 flex flex-col w-full max-w-full md:max-w-2xl lg:max-w-xl xl:max-w-3xl 2xl:max-w-4xl mx-auto p-4 sm:p-6 text-gray-200 relative">
          {!messages.length ? (
            <div className="flex-1 flex flex-col justify-center items-center mt-10 sm:mt-20 text-center">
              <h1 className="text-xl sm:text-2xl md:text-3xl lg:text-4xl font-semibold text-blue-400">
                ChatNex
              </h1>
              <p className="text-gray-400 mt-4 sm:mt-5 text-sm sm:text-base">
                🚀{" "}
                {chats.length === 0 ? (
                  <>
                    Wanna start exploring, Commander? <br /> Head over to the
                    sidebar and hit{" "}
                    <span className="text-blue-400 font-semibold">
                      "+ New Chat"
                    </span>{" "}
                    to launch your first mission!
                  </>
                ) : (
                  <>
                    Ready for action? <br /> Go to the sidebar and choose a chat
                    to continue your journey!
                  </>
                )}
              </p>
            </div>
          ) : (
            <div className="flex-1 w-full overflow-y-auto space-y-3 pr-2 sm:pr-4 custom-scrollbar">
              {messages.map((m, i) => (
                <div
                  key={i}
                  className={`flex flex-col ${
                    m.type === "user" ? "items-end" : "items-start"
                  }`}
                >
                  <div
                    className={`text-sm font-semibold mb-1 ${
                      m.type === "user" ? "text-blue-600" : "text-green-600"
                    }`}
                  >
                    {m.type === "user" ? "You" : "AI"}
                  </div>

                  <div
                    className={`relative group p-3 rounded-md text-gray-200 break-words max-w-[80%] sm:max-w-[70%] md:max-w-[60%] ${
                      m.type === "user" ? "bg-blue-600/30" : "bg-blue-500/20"
                    }`}
                  >
                    {m.type === "ai" ? (
                      <div className="prose prose-invert max-w-none">
                        <ReactMarkdown
                          remarkPlugins={[remarkGfm]}
                          rehypePlugins={[rehypeHighlight]}
                        >
                          {m.content}
                        </ReactMarkdown>
                      </div>
                    ) : (
                      m.content
                    )}

                    <button
                      onClick={() => handleCopy(m.content, i)}
                      className="absolute bottom-2 right-2 p-1 rounded opacity-0 group-hover:opacity-100 transition bg-gray-700 hover:bg-gray-600 flex items-center"
                      title="Copy message"
                    >
                      {copiedIndex === i ? (
                        <Check size={14} />
                      ) : (
                        <Copy size={14} />
                      )}
                    </button>

                    {copiedIndex === i && (
                      <span className="absolute -bottom-5 right-2 text-xs bg-gray-800 text-white px-2 py-1 rounded shadow">
                        Copied!
                      </span>
                    )}
                  </div>
                </div>
              ))}
              <div ref={messagesEndRef} />
            </div>
          )}

          {activeChatId && (
            <form onSubmit={sendMessage} className="w-full flex mt-4 gap-2">
              <input
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder="Type your message..."
                className="flex-1 px-3 py-2 rounded bg-[#0f172a] border border-blue-600 text-gray-200 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              <button
                type="submit"
                disabled={isSending || !input.trim()}
                className="px-4 py-2 rounded bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-50 whitespace-nowrap"
              >
                {isSending ? "Sending..." : "Send"}
              </button>
            </form>
          )}
        </main>
      </div>
    </div>
  );
};

export default Home;
