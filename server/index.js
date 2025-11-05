// ReliefChat Backend – FINAL FIXED VERSION 💬
import express from "express";
import dotenv from "dotenv";
import cors from "cors";
import { StreamChat } from "stream-chat";

dotenv.config();

const app = express();
app.use(cors());
app.use(express.json());

const PORT = process.env.PORT || 4000;
const STREAM_API_KEY = process.env.STREAM_API_KEY;
const STREAM_API_SECRET = process.env.STREAM_API_SECRET;

if (!STREAM_API_KEY || !STREAM_API_SECRET) {
  throw new Error("❌ Missing Stream API credentials in .env");
}

const chatClient = StreamChat.getInstance(STREAM_API_KEY, STREAM_API_SECRET);

// -------------------------------------------------------------
// Helper: always ensure the user is a member of the channel
// -------------------------------------------------------------
async function ensureMember(channel, userId) {
  try {
    await channel.addMembers([userId]);
    console.log(`✅ ensured membership for ${userId} in ${channel.id}`);
  } catch (err) {
    console.log(`ℹ️ membership check skipped: ${err.message}`);
  }
}

// -------------------------------------------------------------
// 1️⃣ Create or get token for a Firebase UID
// -------------------------------------------------------------
async function createOrGetUserToken(firebaseUid, displayName) {
  const userId = firebaseUid.trim();
  const name = displayName || "Anonymous";

  await chatClient.upsertUser({
    id: userId,
    name,
    role: "user",
  });

  const token = chatClient.createToken(userId);
  console.log(`✅ Token created for userId: ${userId}`);
  return { userId, token };
}

// -------------------------------------------------------------
// /getToken – main entry for frontend
// -------------------------------------------------------------
app.post("/getToken", async (req, res) => {
  try {
    const { username, displayName } = req.body;
    if (!username)
      return res.status(400).json({ error: "Verified User ID required" });

    const { userId, token } = await createOrGetUserToken(
      username,
      displayName
    );

    // ensure Global Chat exists + membership
    const globalChannel = chatClient.channel("messaging", "global-public-chat", {
      name: "🌍 Global Public Chat",
      created_by_id: userId,
    });

    try {
      await globalChannel.create();
    } catch (err) {
      if (!String(err).includes("already")) {
        console.log("⚠️ global chat create:", err.message);
      }
    }

    await ensureMember(globalChannel, userId);

    res.json({ userId, apiKey: STREAM_API_KEY, streamToken: token });
  } catch (err) {
    console.error("❌ Token generation failed:", err);
    res.status(500).json({ error: "Token generation failed" });
  }
});

// -------------------------------------------------------------
// 2️⃣ Public chat endpoint (optional reuse)
// -------------------------------------------------------------
app.post("/createPublicChannel", async (req, res) => {
  try {
    const { userId } = req.body;
    if (!userId) return res.status(400).json({ error: "Missing userId" });

    const channel = chatClient.channel("messaging", "global-public-chat", {
      name: "🌍 Global Public Chat",
      created_by_id: userId,
    });

    try {
      await channel.create();
    } catch {}
    await ensureMember(channel, userId);

    res.json({ message: "Public channel ready", channelId: "global-public-chat" });
  } catch (err) {
    console.error("❌ Public channel error:", err);
    res.status(500).json({ error: "Failed to create/join public chat" });
  }
});

// -------------------------------------------------------------
// 3️⃣ Direct Message (1-on-1)
// -------------------------------------------------------------
app.post("/createDM", async (req, res) => {
  try {
    const { userId, targetUserId } = req.body;
    if (!userId || !targetUserId)
      return res.status(400).json({ error: "Missing user IDs" });

    const members = [userId, targetUserId].sort();
    const channelId = `dm-${members.join("-")}`;

    const channel = chatClient.channel("messaging", channelId, {
      name: `DM: ${members.join(" & ")}`,
      created_by_id: userId,
      members,
      is_direct_message: true,
    });

    try {
      await channel.create();
    } catch {}
    await ensureMember(channel, userId);
    await ensureMember(channel, targetUserId);

    console.log(`✅ DM ready: ${channelId}`);
    res.json({ message: "DM ready", channelId });
  } catch (err) {
    console.error("❌ DM error:", err);
    res.status(500).json({ error: "Failed to create DM" });
  }
});

// -------------------------------------------------------------
// 4️⃣ Group chat
// -------------------------------------------------------------
app.post("/createGroup", async (req, res) => {
  try {
    const { userId, groupName, members } = req.body;
    if (!userId || !groupName || !Array.isArray(members) || members.length === 0)
      return res.status(400).json({ error: "Missing data" });

    const safeName = groupName.toLowerCase().replace(/[^a-z0-9_]/g, "_");
    const channelId = `group-${safeName}-${Date.now()}`;

    const channel = chatClient.channel("messaging", channelId, {
      name: groupName,
      created_by_id: userId,
      members: [...new Set([userId, ...members])],
      is_group: true,
    });

    try {
      await channel.create();
    } catch {}
    await ensureMember(channel, userId);
    for (const m of members) await ensureMember(channel, m);

    console.log(`✅ Group chat created: ${channelId}`);
    res.json({ message: "Group chat created", channelId });
  } catch (err) {
    console.error("❌ Group error:", err);
    res.status(500).json({ error: "Failed to create group" });
  }
});

// -------------------------------------------------------------
// 5️⃣ Health + start
// -------------------------------------------------------------
app.get("/health", (_req, res) => res.json({ ok: true }));

app.listen(PORT, () =>
  console.log(`🚀 ReliefChat backend running on http://localhost:${PORT}`)
);
