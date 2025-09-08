import React, { useState, useEffect, useMemo, useRef } from "react";
import axios from "axios";
import { io } from "socket.io-client";
import ReactMarkdown from "https://esm.sh/react-markdown@9?bundle";
import remarkGfm from "https://esm.sh/remark-gfm@4?bundle";
import rehypeHighlight from "https://esm.sh/rehype-highlight@7?bundle";
import {
  Copy,
  Check,
  Clock,
  Search,
  ChevronDown,
  Plus,
  AlertTriangle,
  Pin,
} from "lucide-react";
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

  // Modal states
  const [newChatModalOpen, setNewChatModalOpen] = useState(false);
  const [newChatTitle, setNewChatTitle] = useState("");
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [chatToDelete, setChatToDelete] = useState(null);

  // User state
  const [user, setUser] = useState(null);

  // Sidebar functionality states
  const [searchTerm, setSearchTerm] = useState("");
  const [isRecentVisible, setIsRecentVisible] = useState(true);

  const [pinnedChats, setPinnedChats] = useState(() => {
    const savedPins = localStorage.getItem("pinned-chats");
    return savedPins ? JSON.parse(savedPins) : [];
  });

  const navigate = useNavigate();
  const messagesEndRef = useRef(null);

  const activeChat = useMemo(
    () => chats.find((c) => c._id === activeChatId) || null,
    [chats, activeChatId]
  );

  const { filteredPinned, filteredUnpinned } = useMemo(() => {
    const pinned = [];
    const unpinned = [];

    chats.forEach((chat) => {
      if (pinnedChats.includes(chat._id)) {
        pinned.push(chat);
      } else {
        unpinned.push(chat);
      }
    });

    const filterBySearch = (chat) =>
      chat.title.toLowerCase().includes(searchTerm.toLowerCase());

    return {
      filteredPinned: pinned.filter(filterBySearch),
      filteredUnpinned: unpinned.filter(filterBySearch),
    };
  }, [chats, pinnedChats, searchTerm]);

  // Auto-scroll
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // Effect to save pinned chats to localStorage
  useEffect(() => {
    localStorage.setItem("pinned-chats", JSON.stringify(pinnedChats));
  }, [pinnedChats]);

  // Dynamically load highlight.js CSS
  useEffect(() => {
    const link = document.createElement("link");
    link.rel = "stylesheet";
    link.href =
      "https://cdnjs.cloudflare.com/ajax/libs/highlight.js/11.9.0/styles/github-dark.min.css";
    document.head.appendChild(link);
    return () => {
      document.head.removeChild(link);
    };
  }, []);

  // Load initial data (chats, user) & setup socket
  useEffect(() => {
    // Fetch user data from the new backend endpoint
    const fetchUser = async () => {
      try {
        const response = await axios.get("https://chatnex-ai.onrender.com/api/auth/me", {
          withCredentials: true,
        });
        // The backend now returns a user object with a combined `name` property
        setUser(response.data.user);
      } catch (error) {
        console.error("Failed to fetch user data", error);
        // If the token is invalid or expired, you might want to redirect to the login page
        // navigate('/login');
      }
    };
    fetchUser();

    // Fetch chats
    axios
      .get("https://chatnex-ai.onrender.com/api/chat", { withCredentials: true })
      .then((res) => setChats(res.data.chats.reverse()))
      .catch(console.error);

    // Setup socket
    const tempSocket = io("https://chatnex-ai.onrender.com", { withCredentials: true });
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
    const title = newChatTitle.trim();
    if (!title) return;
    try {
      const response = await axios.post(
        "https://chatnex-ai.onrender.com/api/chat",
        { title },
        { withCredentials: true }
      );
      const chat = response.data.chat;
      setChats((prev) => [chat, ...prev]);
      setActiveChatId(chat._id);
      getMessages(chat._id);
      setSidebarOpen(false);
      setNewChatTitle("");
      setNewChatModalOpen(false);
    } catch (error) {
      console.error("Error creating chat:", error);
      toast.error("Failed to create chat.");
    }
  };

  // Fetch messages
  const getMessages = async (chatId) => {
    try {
      const res = await axios.get(
        `https://chatnex-ai.onrender.com/api/chat/messages/${chatId}`,
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

  const openDeleteConfirmation = (id) => {
    setChatToDelete(id);
    setDeleteModalOpen(true);
  };

  const confirmDeleteChat = async () => {
    if (!chatToDelete) return;
    try {
      await axios.delete(`https://chatnex-ai.onrender.com/api/chat/${chatToDelete}`, {
        withCredentials: true,
      });
      setChats((prev) => prev.filter((c) => c._id !== chatToDelete));
      if (activeChatId === chatToDelete) {
        setActiveChatId(null);
        setMessages([]);
      }
      toast.success("Chat deleted!");
    } catch (error) {
      console.error("Error deleting chat:", error);
      toast.error("Failed to delete chat.");
    } finally {
      setDeleteModalOpen(false);
      setChatToDelete(null);
    }
  };

  const sendMessage = async (e) => {
    e?.preventDefault?.();
    const text = input.trim();
    if (!text || !activeChatId || isSending) return;
    setIsSending(true);
    setMessages((prev) => [...prev, { type: "user", content: text }]);
    setInput("");
    socket.emit("ai-message", { chat: activeChatId, content: text });
  };

  const handleCopy = (text, index) => {
    navigator.clipboard.writeText(text);
    setCopiedIndex(index);
    setTimeout(() => setCopiedIndex(null), 1500);
  };

  const togglePinChat = (chatId) => {
    setPinnedChats((prev) => {
      if (prev.includes(chatId)) {
        return prev.filter((id) => id !== chatId);
      } else {
        return [...prev, chatId];
      }
    });
  };

  const UserAvatar = ({ user }) => {
    if (!user || !user.name) return null;
    const initials = user.name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase();
    return (
      <div className="w-8 h-8 rounded-full bg-blue-600 text-white flex items-center justify-center text-sm font-bold flex-shrink-0">
        {initials}
      </div>
    );
  };

  return (
    <div className="chat-layout h-screen flex flex-col bg-gray-100 dark:bg-gradient-to-br dark:from-black dark:to-[#35354b]">
      <header className="lg:hidden flex items-center justify-between px-4 py-3 bg-white dark:bg-[#141520] relative border-b border-gray-200 dark:border-gray-800">
        <button
          aria-label="Open sidebar"
          onClick={() => setSidebarOpen(true)}
          className="p-2 rounded-md text-gray-700 dark:text-gray-200 hover:bg-gray-200 dark:hover:bg-blue-600/30"
        >
          ☰
        </button>
        <img src="/logo.png" alt="Logo" className="h-10 w-auto" />
        <div className="absolute right-0 top-0 mt-3 mr-4">
          <button
            onClick={() => {
              document.cookie = "token=; Max-Age=0; path=/;";
              toast.error("Logged out!");
              setTimeout(() => {
                window.location.href = "/login";
              }, 400);
            }}
            className="px-3 py-2 text-sm rounded bg-gray-200 dark:bg-[#1f2937] border border-gray-300 dark:border-blue-700 text-blue-600 dark:text-blue-400 font-semibold hover:scale-90 transform transition-transform duration-200"
          >
            Logout
          </button>
        </div>
      </header>

      <div className="flex flex-1 overflow-hidden">
        <aside
          className={`fixed inset-y-0 left-0 z-20 w-72 transform bg-gray-50 dark:bg-[#141520] p-4 shadow-lg transition-transform
          lg:translate-x-0 lg:relative lg:flex-shrink-0 lg:h-full flex flex-col
          ${sidebarOpen ? "translate-x-0" : "-translate-x-full"}`}
        >
          <div className="flex items-center justify-between mb-4">
            <div className="hidden lg:flex items-center gap-3">
              <img src="/logo.png" alt="Logo" className="h-12 w-auto" />
            </div>
            <h2 className="text-gray-800 dark:text-gray-200 text-lg font-semibold lg:hidden">
              Chats
            </h2>
            <button
              onClick={() => setSidebarOpen(false)}
              className="p-2 text-gray-600 dark:text-gray-200 hover:text-red-500 dark:hover:text-red-400 lg:hidden"
              aria-label="Close sidebar"
            >
              ✕
            </button>
          </div>

          <button
            onClick={() => setNewChatModalOpen(true)}
            className="w-full flex items-center justify-center gap-2 text-sm px-3 py-3 mb-4 rounded-lg bg-blue-600 text-white hover:bg-blue-700 transition-colors duration-200 font-semibold"
          >
            <Plus size={18} /> New Chat
          </button>

          <div className="flex-1 flex flex-col overflow-y-auto custom-scrollbar">
            {filteredPinned.length > 0 && (
              <div className="mb-4">
                <h3 className="px-2 text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">
                  Pinned
                </h3>
                <ul className="space-y-1">
                  {filteredPinned.map((c) => (
                    <li key={c._id} className="relative group">
                      <div
                        role="button"
                        tabIndex="0"
                        onClick={() => selectChat(c._id)}
                        onKeyPress={(e) =>
                          e.key === "Enter" && selectChat(c._id)
                        }
                        className={`w-full flex items-center justify-between pl-3 pr-2 py-2 rounded-md text-left text-sm font-medium cursor-pointer ${
                          activeChatId === c._id
                            ? "bg-blue-600/20 text-blue-700 dark:bg-blue-600/40 dark:text-white"
                            : "text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-blue-500/20"
                        }`}
                      >
                        <span className="truncate min-w-0 pr-2">{c.title}</span>
                        <div className="flex items-center flex-shrink-0">
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              togglePinChat(c._id);
                            }}
                            className="p-1 text-blue-500"
                          >
                            <Pin size={14} className="fill-current" />
                          </button>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              openDeleteConfirmation(c._id);
                            }}
                            className="p-1 text-gray-500 dark:text-gray-400 hover:text-red-500 dark:hover:text-red-400 opacity-0 group-hover:opacity-100"
                          >
                            ✕
                          </button>
                        </div>
                      </div>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            <div>
              <button
                onClick={() => setIsRecentVisible(!isRecentVisible)}
                className="flex items-center justify-between w-full text-left text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white mb-2 p-2 rounded-md hover:bg-gray-200 dark:hover:bg-white/5"
              >
                <div className="flex items-center gap-2">
                  <Clock size={16} />
                  <span className="font-medium text-sm">Recent Chats</span>
                </div>
                <ChevronDown
                  size={18}
                  className={`transition-transform duration-300 ${
                    isRecentVisible ? "rotate-180" : ""
                  }`}
                />
              </button>

              <div
                className={`flex-1 flex flex-col overflow-hidden transition-all duration-300 ease-in-out ${
                  isRecentVisible ? "max-h-full" : "max-h-0"
                }`}
              >
                <div className="relative mb-3">
                  <Search
                    className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
                    size={18}
                  />
                  <input
                    type="text"
                    placeholder="Search chats..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-full bg-white dark:bg-black/30 border border-gray-300 dark:border-gray-700 rounded-md pl-10 pr-4 py-2 text-sm text-gray-800 dark:text-gray-200 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <ul className="flex-1 space-y-1 overflow-y-auto custom-scrollbar pr-1">
                  {filteredUnpinned.length > 0 ? (
                    filteredUnpinned.map((c) => (
                      <li key={c._id} className="relative group">
                        {/* The main clickable element is a DIV, not a BUTTON */}
                        <div
                          role="button"
                          tabIndex="0"
                          onClick={() => selectChat(c._id)}
                          onKeyPress={(e) =>
                            e.key === "Enter" && selectChat(c._id)
                          }
                          className={`w-full flex items-center justify-between pl-3 pr-2 py-2 rounded-md text-left text-sm font-medium cursor-pointer ${
                            activeChatId === c._id
                              ? "bg-blue-600/20 text-blue-700 dark:bg-blue-600/40 dark:text-white"
                              : "text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-blue-500/20"
                          }`}
                        >
                          <span className="truncate min-w-0 pr-2">
                            {c.title}
                          </span>

                          {/* These inner buttons are now valid because their parent is a DIV */}
                          <div className="flex items-center flex-shrink-0 opacity-0 group-hover:opacity-100 transition-opacity">
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                togglePinChat(c._id);
                              }}
                              className="p-1 text-gray-500 dark:text-gray-400 hover:text-blue-500 dark:hover:text-blue-400"
                            >
                              <Pin size={14} />
                            </button>
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                openDeleteConfirmation(c._id);
                              }}
                              className="p-1 text-gray-500 dark:text-gray-400 hover:text-red-500 dark:hover:text-red-400"
                            >
                              ✕
                            </button>
                          </div>
                        </div>
                      </li>
                    ))
                  ) : (
                    <li className="text-center text-gray-500 text-sm mt-4">
                      No chats found.
                    </li>
                  )}
                </ul>
              </div>
            </div>
          </div>

          {/* Sidebar Footer */}
          <div className="mt-auto pt-4 border-t border-gray-200 dark:border-gray-800">
            {/* User Profile Section */}
            {user && user.name && (
              <div className="p-2 rounded-lg mb-2 transition-colors">
                <div className="flex items-center gap-3">
                  <UserAvatar user={user} />
                  <span className="font-semibold text-sm text-gray-800 dark:text-gray-200 truncate min-w-0">
                    {user.name}
                  </span>
                </div>
              </div>
            )}

            <div className="flex items-center justify-between">
              <button
                onClick={() => {
                  document.cookie = "token=; Max-Age=0; path=/;";
                  toast.error("Logged out!");
                  setTimeout(() => {
                    window.location.href = "/login";
                  }, 400);
                }}
                className="hidden lg:block w-full px-3 py-2 text-sm rounded bg-gray-200 dark:bg-[#1f2937] border border-gray-300 dark:border-blue-700 text-blue-600 dark:text-blue-400 font-semibold hover:bg-gray-300 dark:hover:bg-[#293145]"
              >
                Logout
              </button>
            </div>
          </div>
        </aside>

        {sidebarOpen && (
          <div
            className="fixed inset-0 z-10 bg-black/40 lg:hidden"
            onClick={() => setSidebarOpen(false)}
          />
        )}

        {deleteModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm px-4">
            <div className="bg-white dark:bg-gradient-to-br dark:from-[#1e1f2a] dark:to-[#141520] rounded-xl w-full max-w-md p-6 shadow-2xl border border-gray-200 dark:border-gray-700">
              <div className="flex items-center gap-3 mb-4">
                <AlertTriangle className="text-red-500" size={24} />
                <h2 className="text-xl font-bold text-red-600 dark:text-red-400">
                  Confirm Deletion
                </h2>
              </div>
              <p className="text-gray-600 dark:text-gray-300 mb-6 text-sm">
                Are you sure you want to delete this chat? This action cannot be
                undone.
              </p>
              <div className="flex justify-end gap-3">
                <button
                  onClick={() => setDeleteModalOpen(false)}
                  className="px-5 py-2 rounded-lg bg-gray-200 dark:bg-gray-700 text-gray-800 dark:text-gray-200 hover:bg-gray-300 dark:hover:bg-gray-600 transition-colors duration-200 font-semibold"
                >
                  Cancel
                </button>
                <button
                  onClick={confirmDeleteChat}
                  className="px-5 py-2 rounded-lg bg-red-600 text-white hover:bg-red-700 transition-colors duration-200 font-semibold"
                >
                  Delete
                </button>
              </div>
            </div>
          </div>
        )}

        {newChatModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm px-4">
            <div className="bg-white dark:bg-gradient-to-br dark:from-[#1e1f2a] dark:to-[#141520] rounded-xl w-full max-w-md p-6 shadow-2xl">
              <h2 className="text-2xl sm:text-3xl font-bold text-blue-600 dark:text-blue-400 mb-6 text-center">
                Enter Chat Title
              </h2>
              <input
                autoFocus
                value={newChatTitle}
                onChange={(e) => setNewChatTitle(e.target.value)}
                onKeyPress={(e) => e.key === "Enter" && createNewChat()}
                placeholder="Type your chat title..."
                className="w-full px-5 py-3 rounded-lg bg-gray-100 dark:bg-[#0f172a] border border-gray-300 dark:border-blue-600 text-gray-900 dark:text-gray-200 placeholder-gray-500 dark:placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-1 focus:ring-offset-white dark:focus:ring-offset-[#141520] mb-6 transition-all duration-300"
              />
              <div className="flex flex-col sm:flex-row justify-end gap-3">
                <button
                  onClick={createNewChat}
                  className="w-full sm:w-auto px-5 py-3 rounded-lg bg-gradient-to-r from-blue-500 to-blue-600 text-white hover:from-blue-600 hover:to-blue-700 shadow-lg transition-all duration-200"
                >
                  Create
                </button>
                <button
                  onClick={() => setNewChatModalOpen(false)}
                  className="w-full sm:w-auto px-5 py-3 rounded-lg bg-gray-600 text-gray-100 hover:bg-gray-700 dark:bg-gray-700 dark:text-gray-200 dark:hover:bg-gray-600 transition-colors duration-200"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        )}

        <main className="flex-1 flex flex-col w-full max-w-full md:max-w-2xl lg:max-w-xl xl:max-w-3xl 2xl:max-w-4xl mx-auto p-4 sm:p-6 text-gray-900 dark:text-gray-200 relative">
          {!messages.length ? (
            <div className="flex-1 flex flex-col justify-center items-center mt-10 sm:mt-20 text-center">
              <h1 className="text-xl sm:text-2xl md:text-3xl lg:text-4xl font-semibold text-blue-600 dark:text-blue-400">
                ChatNex
              </h1>
              <p className="text-gray-600 dark:text-gray-400 mt-4 sm:mt-5 text-sm sm:text-base">
                🚀{" "}
                {chats.length === 0 ? (
                  <>
                    Wanna start exploring, Commander? <br /> Head over to the
                    sidebar and hit{" "}
                    <span className="text-blue-500 dark:text-blue-400 font-semibold">
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
                      m.type === "user"
                        ? "text-blue-600 dark:text-blue-400"
                        : "text-green-600 dark:text-green-400"
                    }`}
                  >
                    {m.type === "user" ? "You" : "AI"}
                  </div>
                  <div
                    className={`relative group p-3 rounded-lg break-words max-w-[90%] sm:max-w-[80%] md:max-w-[75%] ${
                      m.type === "user"
                        ? "bg-blue-500 text-white"
                        : "bg-white dark:bg-blue-500/20 text-gray-800 dark:text-gray-200"
                    }`}
                  >
                    {m.type === "ai" ? (
                      <div className="prose prose-sm dark:prose-invert max-w-none">
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
                      className={`absolute bottom-2 right-2 p-1 rounded opacity-0 group-hover:opacity-100 transition ${
                        m.type === "user"
                          ? "bg-blue-600 hover:bg-blue-700 text-white"
                          : "bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 dark:hover:bg-gray-600"
                      } flex items-center`}
                      title="Copy message"
                    >
                      {copiedIndex === i ? (
                        <Check size={14} />
                      ) : (
                        <Copy size={14} />
                      )}
                    </button>
                    {copiedIndex === i && (
                      <span className="absolute -bottom-5 right-2 text-xs bg-gray-900 text-white px-2 py-1 rounded shadow">
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
                className="flex-1 px-3 py-2 rounded bg-white dark:bg-[#0f172a] border border-gray-300 dark:border-blue-600 text-gray-900 dark:text-gray-200 placeholder-gray-500 dark:placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
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
