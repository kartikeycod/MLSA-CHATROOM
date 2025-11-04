import React from "react";
import { signInWithEmailAndPassword } from "firebase/auth";
import { auth } from "./firebase";

export default function VerifyTest() {
  const testVerification = async () => {
    try {
      const userCred = await signInWithEmailAndPassword(auth, "test@example.com", "password123");
      const token = await userCred.user.getIdToken();

      const res = await fetch("http://localhost:4000/verify", {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
      });

      const data = await res.json();
      console.log("Verification Response:", data);
    } catch (error) {
      console.error("❌ Error:", error);
    }
  };

  return (
    <div style={{ padding: 20 }}>
      <h1>🔐 Test Firebase Verification</h1>
      <button onClick={testVerification}>Run Test</button>
    </div>
  );
}
