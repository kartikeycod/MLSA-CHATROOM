import express from "express";
import dotenv from "dotenv";
import cors from "cors";
import { StreamChat } from "stream-chat";

dotenv.config();

const app = express();
app.use(cors());
app.use(express.json());

// Environment Variables
const PORT = process.env.PORT || 4000;
const STREAM_API_KEY = process.env.STREAM_API_KEY;
const STREAM_API_SECRET = process.env.STREAM_API_SECRET;

if (!STREAM_API_KEY || !STREAM_API_SECRET) {
  throw new Error("❌ Missing Stream API credentials in .env");
}

// Stream Chat server client
const chatClient = StreamChat.getInstance(STREAM_API_KEY, STREAM_API_SECRET);

// ====================================================
// ✅ 1️⃣  Create or Get Token for User (UPDATED FOR FIREBASE UID)
// ====================================================
/**
 * Accepts the secure ID (Firebase UID) and generates a Stream Token.
 * @param {string} verifiedUserId The secure Firebase UID sent from the client.
 * @param {string} displayUsername The user's email/display name for the Stream profile.
 * @returns {object} { userId, token }
 */
async function createOrGetUserToken(verifiedUserId, displayUsername) {
  // 💡 KEY CHANGE: We use the verifiedUserId (Firebase UID) directly as the Stream User ID.
  const streamUserId = verifiedUserId; 

  // In App.jsx, the email is used as the nickname, so we use it here for the Stream display name.
  // We use the first part of the email if no displayUsername is explicitly passed.
  const name = displayUsername || verifiedUserId.split('@')[0];

  await chatClient.upsertUser({
    id: streamUserId,
    // Set the user's display name
    name: name, 
    // Use the standard 'user' role (permissions must be fixed in the Stream dashboard)
    role: "user", 
  });

  const token = chatClient.createToken(streamUserId);
  console.log(`✅ Token created for Stream User ID: ${streamUserId}`);
  return { userId: streamUserId, token };
}

app.post("/getToken", async (req, res) => {
  try {
    // 💡 The frontend now sends the Firebase UID in the 'username' field,
    // and the display name (email) is also available in that field.
    const verifiedUserId = req.body.username; 
    
    if (!verifiedUserId) {
        return res.status(400).json({ error: "Verified User ID required" });
    }

    // Pass the Firebase UID (which is the verified username) as the ID, 
    // and use it as the display name for the chat profile.
    const { userId, token } = await createOrGetUserToken(verifiedUserId, verifiedUserId);
    
    // The response userId MUST be the Firebase UID so ChatRoom.jsx connects correctly.
    res.json({ userId, apiKey: STREAM_API_KEY, streamToken: token });
  } catch (err) {
    console.error("Error generating token:", err);
    res.status(500).json({ error: "Token generation failed" });
  }
});

// ====================================================
// ✅ 2️⃣  PUBLIC CHAT CHANNEL (Global Room)
// ====================================================
app.post("/createPublicChannel", async (req, res) => {
  try {
    const { userId } = req.body;
    if (!userId) return res.status(400).json({ error: "Missing userId" });

    const channel = chatClient.channel("messaging", "global-public-chat", {
      name: "🌍 Global Public Chat",
      created_by_id: userId,
    });

    await channel.create();
    await channel.addMembers([userId]);

    res.json({ message: "Public channel ready", channelId: "global-public-chat" });
  } catch (err) {
    console.error("Public channel error:", err);
    res.status(500).json({ error: "Failed to create/join public chat" });
  }
});

// ====================================================
// ✅ 3️⃣  DIRECT MESSAGE (1-on-1 Chat)
// ====================================================
app.post("/createDM", async (req, res) => {
  try {
    const { userId, targetUserId } = req.body;
    if (!userId || !targetUserId) {
      return res.status(400).json({ error: "Missing user IDs" });
    }

    // Always sort member IDs to ensure consistent channel ID
    const members = [userId, targetUserId].sort();
    const channelId = `dm-${members.join("-")}`;

    const channel = chatClient.channel("messaging", channelId, {
      name: `DM: ${members.join(" & ")}`,
      created_by_id: userId,
      members,
      is_direct_message: true,
    });

    await channel.create();
    res.json({ message: "Direct Message channel ready", channelId });
  } catch (err) {
    console.error("DM channel error:", err);
    res.status(500).json({ error: "Failed to create DM channel" });
  }
});

// ====================================================
// ✅ 4️⃣  GROUP CHAT (Custom Room)
// ====================================================
app.post("/createGroup", async (req, res) => {
  try {
    const { userId, groupName, members } = req.body;
    if (!userId || !groupName || !Array.isArray(members) || members.length === 0) {
      return res.status(400).json({ error: "Missing groupName, userId, or members list" });
    }

    const safeGroupName = groupName.toLowerCase().replace(/[^a-z0-9_]/g, "_");
    const channelId = `group-${safeGroupName}-${Date.now()}`;

    const channel = chatClient.channel("messaging", channelId, {
      name: groupName,
      created_by_id: userId,
      members: [...new Set([userId, ...members])],
      is_group: true,
    });

    await channel.create();
    res.json({ message: "Group chat created", channelId });
  } catch (err) {
    console.error("Group chat error:", err);
    res.status(500).json({ error: "Failed to create group chat" });
  }
});

// ====================================================
// ✅ 5️⃣  Server Startup
// ====================================================
app.listen(PORT, () => {
  console.log(`🚀 ReliefChat backend running on http://localhost:${PORT}`);
});