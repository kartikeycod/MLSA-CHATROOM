import express from "express";
import dotenv from "dotenv";
import cors from "cors";
// NEW: Import the StreamChat server SDK
import { StreamChat } from "stream-chat"; 

// Load environment variables
dotenv.config();

const app = express();
app.use(cors());
app.use(express.json());

// 🔑 Stream Environment Variables
const PORT = process.env.PORT || 4000;
const STREAM_API_KEY = process.env.STREAM_API_KEY;
const STREAM_API_SECRET = process.env.STREAM_API_SECRET; 

// Initialize the Stream Chat server client
const chatClient = new StreamChat(STREAM_API_KEY, STREAM_API_SECRET);

// --- Stream Backend API Function ---

/**
 * ✅ Step 1: Creates or gets user data and generates a secure user token.
 * Stream automatically handles user creation and token generation on the server.
 * @param {string} username - The user's desired unique identifier (will be lowercased).
 * @returns {Promise<string>} The generated Stream user token.
 */
async function createOrGetStreamUserToken(username) {
  if (!STREAM_API_SECRET || !STREAM_API_KEY) {
      throw new Error("Missing Stream API keys in environment variables.");
  }
  
  // Stream recommends using lowercase IDs
  const userId = username.toLowerCase().replace(/[^a-z0-9]/g, '_'); 

  try {
    // 1. Create User (or update if they exist)
    const users = [
        { id: userId, name: username }
    ];

    // Upsert (update/insert) the user in Stream's database
    await chatClient.upsertUsers(users);

    // 2. Generate Token
    // The token is generated server-side using the secret key
    const token = chatClient.createToken(userId);

    console.log(`✅ Stream token generated for user ID: ${userId}`);
    return token;
    
  } catch (error) {
    console.error("STREAM TOKEN ERROR:", error);
    throw new Error("Could not get Stream token.");
  }
}

// --- API Routes ---

// ✅ Step 2: API route to get token (Same endpoint as before)
app.post("/getToken", async (req, res) => {
  try {
    const { username } = req.body;
    if (!username || username.trim() === "") {
      return res.status(400).json({ error: "Username required" });
    }
    
    // Use the new Stream function
    const token = await createOrGetStreamUserToken(username.trim());
    
    // The client needs the username (as userId), the API key, and the token
    res.json({ 
        userId: username.toLowerCase().replace(/[^a-z0-9]/g, '_'), 
        apiKey: STREAM_API_KEY,
        streamToken: token 
    });
    
  } catch (err) {
    console.error("Error in /getToken route:", err.message);
    res.status(500).json({ error: "Could not get Stream token" });
  }
});


// --- Server Start ---
app.listen(PORT, async () => {
  console.log(`🚀 Stream Server running on http://localhost:${PORT}`);
  // Removed Mesibo ensureGlobalRoom() call
});