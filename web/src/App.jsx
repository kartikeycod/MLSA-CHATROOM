// web/src/App.jsx - RESTORED WORKING POPUP VERSION (Stable)
import React, { useState } from "react";
import ChatRoom from "./components/ChatRoom";
import "./App.css";

// Firebase imports
import { auth, googleProvider } from "./firebase";
import { signInWithEmailAndPassword, signInWithPopup } from "firebase/auth";

const AuthView = ({
  handleAuth,
  loading,
  error,
  setEmail,
  setPassword,
  email,
  password,
}) => (
  <div className="join-card">
    <h1 className="join-title">🔒 ReliefChat Login</h1>

    {/* Google Sign-in */}
    <button
      onClick={() => handleAuth("google")}
      disabled={loading}
      className={`join-button google-button ${
        loading ? "join-button-loading" : ""
      }`}
    >
      {loading ? "Verifying..." : "Sign In with Google"}
    </button>

    <p className="or-divider">OR</p>

    {/* Email/Password Login */}
    <form
      onSubmit={(e) => {
        e.preventDefault();
        handleAuth("email");
      }}
    >
      <input
        type="email"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        placeholder="Enter your email"
        className="join-input"
        autoComplete="email"
        required
      />
      <input
        type="password"
        value={password}
        onChange={(e) => setPassword(e.target.value)}
        placeholder="Enter your password"
        className="join-input"
        autoComplete="current-password"
        required
      />
      <button
        type="submit"
        disabled={loading}
        className={`join-button ${
          loading ? "join-button-loading" : "join-button-primary"
        }`}
      >
        {loading ? "Logging In..." : "Login with Email"}
      </button>
    </form>

    {error && <p className="join-error-message">{error}</p>}

    <p className="join-footer-text">
      Powered by <span className="stream-highlight">Serenium</span>
    </p>
  </div>
);

const NicknameView = ({
  loading,
  error,
  handleNicknameSubmit,
  setDisplayName,
  defaultName,
}) => (
  <div className="join-card">
    <h1 className="join-title">👻 Choose Anonymous Name</h1>
    <p className="join-subtitle-anon">
      Your identity is verified, but you can choose a private nickname for the
      chat room.
    </p>

    <form onSubmit={handleNicknameSubmit}>
      <input
        type="text"
        onChange={(e) => setDisplayName(e.target.value)}
        placeholder={`e.g., ${defaultName}`}
        className="join-input"
        required
      />
      <button
        type="submit"
        disabled={loading}
        className={`join-button ${
          loading ? "join-button-loading" : "join-button-primary"
        }`}
      >
        {loading ? "Joining..." : "Enter Chat Anonymously"}
      </button>
    </form>

    {error && <p className="join-error-message">{error}</p>}
  </div>
);

export default function App() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [secureUserId, setSecureUserId] = useState(null);
  const [displayName, setDisplayName] = useState("");
  const [chatCredentials, setChatCredentials] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const defaultDisplayName = email.split("@")[0] || "GhostUser";

  // =============== AUTH PHASE ===============
  const handleAuth = async (method) => {
    setLoading(true);
    setError("");

    try {
      let user;

      if (method === "google") {
        const result = await signInWithPopup(auth, googleProvider);
        user = result.user;
      } else {
        if (!email.trim() || !password.trim()) {
          setError("Please enter both email and password.");
          setLoading(false);
          return;
        }
        const userCredential = await signInWithEmailAndPassword(
          auth,
          email,
          password
        );
        user = userCredential.user;
      }

      setSecureUserId(user.uid);
      setDisplayName(defaultDisplayName);
    } catch (err) {
      console.error("❌ Auth error:", err);
      if (err.code?.includes("auth/popup")) {
        setError("Popup blocked — please allow popups and try again.");
      } else if (err.code?.includes("auth")) {
        setError("Authentication failed. Check credentials or network.");
      } else {
        setError(err.message || "Unknown error occurred.");
      }
    } finally {
      setLoading(false);
    }
  };

  // =============== CHAT TOKEN PHASE ===============
  const handleNicknameSubmit = async (e) => {
    e.preventDefault();
    if (!displayName.trim()) return;

    setLoading(true);
    setError("");

    try {
      const res = await fetch("http://localhost:4000/getToken", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          username: secureUserId,
          displayName: displayName.trim(),
        }),
      });

      if (!res.ok) throw new Error("Failed to get chat token.");

      const data = await res.json();

      if (!data.apiKey || !data.streamToken)
        throw new Error("Invalid server credentials.");

      setChatCredentials(data);
    } catch (err) {
      console.error("❌ Chat join error:", err);
      setError("Chat service unavailable. Check your backend.");
    } finally {
      setLoading(false);
    }
  };

  // =============== RENDER LOGIC ===============
  if (chatCredentials)
    return <ChatRoom nickname={displayName} chatCredentials={chatCredentials} />;

  if (secureUserId)
    return (
      <div className="app-container">
        <NicknameView
          loading={loading}
          error={error}
          handleNicknameSubmit={handleNicknameSubmit}
          setDisplayName={setDisplayName}
          defaultName={defaultDisplayName}
        />
      </div>
    );

  return (
    <div className="app-container">
      <AuthView
        handleAuth={handleAuth}
        loading={loading}
        error={error}
        setEmail={setEmail}
        setPassword={setPassword}
        email={email}
        password={password}
      />
    </div>
  );
}
