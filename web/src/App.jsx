// In web/src/App.jsx

import { useState } from "react";
import axios from "axios";
import ChatRoom from "./components/ChatRoom";

export default function App() {
  const [nickname, setNickname] = useState("");
  // CHANGED: Renamed userData to chatCredentials for clarity
  const [chatCredentials, setChatCredentials] = useState(null); 
  const [loading, setLoading] = useState(false);

  const handleJoin = async () => {
    if (!nickname.trim()) return alert("Enter a nickname");
    setLoading(true);
    try {
      const res = await axios.post("http://localhost:4000/getToken", {
        username: nickname,
      });
      console.log("Token response:", res.data);
      
      // CHANGED: userData now holds Stream's credentials
      setChatCredentials(res.data); 
    } catch (err) {
      console.error(err);
      alert("Could not get Stream token. Check server logs.");
    } finally {
      setLoading(false);
    }
  };

  // CHANGED: Pass the new chatCredentials object
  if (chatCredentials) {
    return <ChatRoom nickname={nickname} chatCredentials={chatCredentials} />;
  }
  
  // Your original login UI remains the same
  return (
    <div className="flex flex-col items-center justify-center h-screen bg-gray-100">
      <h1 className="text-2xl font-bold mb-4">Join Anonymous Chat</h1>
      <input
        type="text"
        placeholder="Enter nickname"
        value={nickname}
        onChange={(e) => setNickname(e.target.value)}
        className="border p-2 rounded mb-3"
      />
      <button
        onClick={handleJoin}
        disabled={loading}
        className="bg-purple-600 text-white px-4 py-2 rounded"
      >
        {loading ? "Joining..." : "Join Chat"}
      </button>
    </div>
  );
}