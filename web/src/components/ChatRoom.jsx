// web/src/components/ChatRoom.jsx — FINAL FIXED VERSION
import React, { useState, useEffect } from "react";
import "./ChatRoom.css";
import {
  Chat,
  Channel,
  Window,
  ChannelHeader,
  MessageList,
  MessageInput,
  ChannelList,
  LoadingIndicator,
  useCreateChatClient,
} from "stream-chat-react";
import "stream-chat-react/dist/css/v2/index.css";

export default function ChatRoom({ nickname, chatCredentials }) {
  const { userId, apiKey, streamToken } = chatCredentials;

  const [activeChannel, setActiveChannel] = useState(null);
  const [creating, setCreating] = useState(false);
  const [showGroupModal, setShowGroupModal] = useState(false);
  const [groupName, setGroupName] = useState("");
  const [groupMembers, setGroupMembers] = useState("");
  const [dmTargetId, setDmTargetId] = useState("");

  // ✅ Initialize Stream client
  const client = useCreateChatClient({
    apiKey,
    tokenOrProvider: streamToken,
    userData: {
      id: userId, // must match backend token
      name: nickname,
    },
  });
  console.log("🟢 Frontend connecting as:", chatCredentials.userId);


  // ✅ Auto-join Global Chat (guaranteed join)
  useEffect(() => {
    if (!client) return;

    const setup = async () => {
      try {
        const global = client.channel("messaging", "global-public-chat", {
          name: "🌍 Global Public Chat",
          created_by_id: userId,
          members: [userId],
        });
        await global.create();
        await global.addMembers([userId]); // ensure membership
        await global.watch();
        setActiveChannel(global);
        console.log("✅ Joined global-public-chat as:", userId);
      } catch (err) {
        console.error("❌ Error setting up global chat:", err);
      }
    };

    setup();

    return () => {
      client.disconnectUser();
    };
  }, [client, userId]);

  // ✅ Channel List Filter
  const filters = { members: { $in: [userId] } };
  const sort = { last_message_at: -1 };

  // ✅ Create or open channels safely
  const createOrOpenChannel = async (type, identifier, members = []) => {
    if (!client) return;
    setCreating(true);

    try {
      let channelId, channelData;

      if (type === "public") {
        channelId = "global-public-chat";
        channelData = {
          name: "🌍 Global Public Chat",
          created_by_id: userId,
          members: [userId],
        };
      }

      if (type === "dm") {
        const targetUid = identifier.trim();
        if (!targetUid) throw new Error("Missing target user UID");

        const sorted = [userId, targetUid].sort();
        channelId = `dm-${sorted.join("-")}`;
        channelData = {
          name: `DM with ${targetUid}`,
          created_by_id: userId,
          members: sorted,
          is_direct_message: true,
        };
      }

      if (type === "group") {
        const safe = identifier.toLowerCase().replace(/[^a-z0-9_]/g, "_");
        channelId = `group-${safe}-${Date.now()}`;
        const memberUids = [...new Set([userId, ...members])];
        channelData = {
          name: identifier,
          created_by_id: userId,
          members: memberUids,
          is_group: true,
        };
      }

      const channel = client.channel("messaging", channelId, channelData);
      await channel.create();
      await channel.addMembers(channelData.members); // ensure everyone is added
      await channel.watch();

      console.log(`✅ Created/Joined ${type} channel: ${channelId}`);
      setActiveChannel(channel);
      setShowGroupModal(false);
      setGroupName("");
      setGroupMembers("");
      setDmTargetId("");
    } catch (err) {
      console.error(`❌ Channel error (${type}):`, err);
    } finally {
      setCreating(false);
    }
  };

  // ✅ Direct Message Handler
  const handleCreateDM = async (e) => {
    e.preventDefault();
    const id = dmTargetId.trim();
    if (!id) return;
    if (id === userId) {
      alert("You cannot DM yourself.");
      return;
    }
    createOrOpenChannel("dm", id);
  };

  // ✅ Group Handler
  const handleGroupCreate = (e) => {
    e.preventDefault();
    if (!groupName.trim()) return;
    const membersArray = groupMembers
      .split(",")
      .map((m) => m.trim())
      .filter((m) => m && m !== userId);
    createOrOpenChannel("group", groupName, membersArray);
  };

  // ✅ Loading
  if (!client || !activeChannel) {
    return (
      <div className="chat-loading-screen">
        <LoadingIndicator /> Connecting to chat as {nickname}...
      </div>
    );
  }

  // ✅ UI
  return (
    <Chat client={client} theme="messaging dark">
      <div className="chat-layout">
        {/* Sidebar */}
        <div className="chat-sidebar">
          <h2 className="sidebar-title">💬 Chats</h2>

          <ChannelList
            filters={filters}
            sort={sort}
            options={{ state: true, watch: true }}
            onSelect={(ch) => setActiveChannel(ch)}
          />

          <div className="new-chat-controls">
            <h3 className="new-chat-title">Start New Chat</h3>

            {/* 🌍 Global */}
            <button
              disabled={creating}
              onClick={() => createOrOpenChannel("public")}
              className="new-chat-button button-public"
            >
              🌍 Global Chat
            </button>

            {/* 💬 DM by UID */}
            <form onSubmit={handleCreateDM} className="dm-form">
              <input
                type="text"
                placeholder="Enter Firebase UID of user"
                className="new-chat-input"
                value={dmTargetId}
                onChange={(e) => setDmTargetId(e.target.value)}
                required
              />
              <button
                type="submit"
                disabled={creating}
                className="new-chat-button button-dm-start"
              >
                💬 Start DM
              </button>
            </form>

            {/* 👥 Group */}
            <button
              disabled={creating}
              className="new-chat-button button-group-create"
              onClick={() => setShowGroupModal(true)}
            >
              👥 Create Group
            </button>
          </div>
        </div>

        {/* Main Chat */}
        <div className="chat-main-window">
          <Channel channel={activeChannel} key={activeChannel.id}>
            <Window>
              <ChannelHeader />
              <MessageList />
              <MessageInput />
            </Window>
          </Channel>
        </div>
      </div>

      {/* Group Modal */}
      {showGroupModal && (
        <div className="modal-overlay">
          <div className="modal-card">
            <h3 className="modal-title">👥 Create Group Chat</h3>
            <form onSubmit={handleGroupCreate} className="modal-form">
              <input
                type="text"
                placeholder="Group name"
                className="modal-input"
                value={groupName}
                onChange={(e) => setGroupName(e.target.value)}
                required
              />
              <textarea
                placeholder="Add Firebase UIDs (comma separated)"
                className="modal-textarea"
                value={groupMembers}
                onChange={(e) => setGroupMembers(e.target.value)}
              />
              <div className="modal-actions">
                <button
                  type="button"
                  onClick={() => setShowGroupModal(false)}
                  className="modal-button button-cancel"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={creating}
                  className={`modal-button ${
                    creating
                      ? "button-create-loading"
                      : "button-create-primary"
                  }`}
                >
                  {creating ? "Creating..." : "Create"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </Chat>
  );
}
