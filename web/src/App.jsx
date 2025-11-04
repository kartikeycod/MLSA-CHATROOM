// web/src/App.jsx - FINAL VERSION WITH SECURE ANONYMITY
import React, { useState } from "react";
import ChatRoom from "./components/ChatRoom";
import "./App.css";

// 🔑 IMPORT AUTH SERVICE & GOOGLE TOOLS
import { auth, googleProvider } from './firebase'; 
import { signInWithEmailAndPassword, signInWithPopup } from "firebase/auth";

// --- NEW COMPONENTS FOR THE TWO VIEWS ---

// View 1: Secure Login (Email/Google)
const AuthView = ({ handleAuth, loading, error, setEmail, setPassword, email, password }) => (
    <div className="join-card">
        <h1 className="join-title">🔒 ReliefChat Login</h1>

        {/* 🚀 GOOGLE SIGN-IN BUTTON */}
        <button
            onClick={() => handleAuth('google')}
            disabled={loading}
            className={`join-button google-button ${loading ? "join-button-loading" : ""}`}
        >
            {loading ? "Verifying..." : "Sign In with Google"}
        </button>

        <p className="or-divider">OR</p>

        <form onSubmit={(e) => { e.preventDefault(); handleAuth('email'); }}>
            {/* 🔒 EMAIL INPUT */}
            <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="Enter your email"
                className="join-input"
                required
            />
            {/* 🔒 PASSWORD INPUT */}
            <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Enter your password"
                className="join-input"
                required
            />
            
            <button
                type="submit"
                disabled={loading}
                className={`join-button ${loading ? "join-button-loading" : "join-button-primary"}`}
            >
                {loading ? "Logging In..." : "Login with Email"}
            </button>
        </form>

        {error && (<p className="join-error-message">{error}</p>)}

        <p className="join-footer-text">
            Powered by <span className="stream-highlight">Serenium</span>
        </p>
    </div>
);

// View 2: Anonymity/Display Name Selector
const NicknameView = ({ loading, error, handleNicknameSubmit, setDisplayName, defaultName }) => (
    <div className="join-card">
        <h1 className="join-title">👻 Choose Anonymous Name</h1>

        <p className="join-subtitle-anon">
            Your identity is verified, but you can choose a private nickname for the chat room.
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
                className={`join-button ${loading ? "join-button-loading" : "join-button-primary"}`}
            >
                {loading ? "Joining..." : "Enter Chat Anonymously"}
            </button>
        </form>

        {error && (<p className="join-error-message">{error}</p>)}
    </div>
);


export default function App() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState(""); 
  
  // 🔑 Holds the secure UID after successful Firebase Auth (Phase 1)
  const [secureUserId, setSecureUserId] = useState(null); 
  // 👻 Holds the final chosen nickname (Phase 2)
  const [displayName, setDisplayName] = useState(""); 
  
  const [chatCredentials, setChatCredentials] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  
  // Name derived from auth (used as suggestion for anonymity)
  const defaultDisplayName = email.split('@')[0] || "GhostUser"; 


  // ==========================================================
  // ✅ PHASE 1: FIREBASE AUTHENTICATION
  // ==========================================================
  const handleAuth = async (method) => {
    setLoading(true);
    setError("");

    try {
        let user;
        
        if (method === 'google') {
            const result = await signInWithPopup(auth, googleProvider);
            user = result.user;
        } else { // email/password
            if (!email.trim() || !password.trim()) {
                setError("Please enter both email and password.");
                setLoading(false);
                return;
            }
            const userCredential = await signInWithEmailAndPassword(auth, email, password);
            user = userCredential.user;
        }

        // Success: Store the secure UID and move to nickname selection
        setSecureUserId(user.uid);
        setDisplayName(defaultDisplayName); // Set suggestion
        
    } catch (err) {
      console.error("❌ Error during authentication:", err);
      if (err.code && err.code.includes('auth')) {
        setError("Authentication failed: Invalid credentials or network error.");
      } else {
        setError(`Connection failed: ${err.message || "Check your backend server."}`);
      }
    } finally {
      setLoading(false);
    }
  };


  // ==========================================================
  // ✅ PHASE 2 & 3: NICKNAME SUBMISSION & CHAT JOIN
  // ==========================================================
  const handleNicknameSubmit = async (e) => {
    e.preventDefault();
    if (!displayName.trim()) return;

    setLoading(true);
    setError("");

    try {
        // 1. 🔑 FETCH STREAM TOKEN using the verified UID
        const res = await fetch("http://localhost:4000/getToken", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            // Sending the secure UID and the ANONYMOUS display name
            body: JSON.stringify({ 
                username: secureUserId, 
                displayName: displayName.trim() 
            }), 
        });

        if (!res.ok) {
            throw new Error("Failed to get chat token from server.");
        }

        const data = await res.json();

        if (!data.apiKey || !data.streamToken) {
            throw new Error("Invalid credentials from server");
        }

        // ✅ Success: Store credentials and enter chat
        setChatCredentials(data);
    } catch (err) {
        console.error("❌ Error joining chat:", err);
        setError("Chat service error. Please check your backend.");
    } finally {
        setLoading(false);
    }
  };


  // ==========================================================
  // ✅ RENDERING LOGIC
  // ==========================================================

  // If connected, show chat interface
  if (chatCredentials) {
    return <ChatRoom nickname={displayName} chatCredentials={chatCredentials} />; 
  }
  
  // If authenticated but nickname not chosen, show Nickname view
  if (secureUserId) {
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
  }


  // Default: Show Authentication View
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