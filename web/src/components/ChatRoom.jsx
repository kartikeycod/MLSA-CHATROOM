// web/src/components/ChatRoom.jsx
import React, { useState, useEffect } from "react";
import "./ChatRoom.css"
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
  const [dmTargetUsername, setDmTargetUsername] = useState(''); 

  // ✅ Initialize Stream client
  const client = useCreateChatClient({
    apiKey,
    tokenOrProvider: streamToken,
    userData: {
      id: userId,
      name: nickname,
    },
  });

  // ✅ Auto-join Global Chat
  useEffect(() => {
    if (!client) return;

    const setup = async () => {
      try {
        const globalChannel = client.channel("messaging", "global-public-chat", {
          name: "🌍 Global Public Chat",
          created_by_id: userId,
          members: [userId],
        });

        await globalChannel.create();
        await globalChannel.watch();

        console.log("✅ Joined global-public-chat");
        setActiveChannel(globalChannel);
      } catch (err) {
        console.error("Error setting up chat:", err);
      }
    };

    setup();

    return () => {
      client.disconnectUser();
      console.log("🔌 Stream client disconnected.");
    };
  }, [client, userId]);

  // ✅ Channel list filter
  const filters = { members: { $in: [userId] } };
  const sort = { last_message_at: -1 };

  // ✅ Function to create or open channels
  const createOrOpenChannel = async (type, identifier, members = []) => {
    if (!client) return;
    setCreating(true);

    try {
      let channelId, channelName, channelData;

      if (type === "public") {
        channelId = "global-public-chat";
        channelName = "🌍 Global Public Chat";
        channelData = { name: channelName, created_by_id: userId, members: [userId] };
      } else if (type === "dm") {
        const targetId = identifier.toLowerCase().trim();
        const membersSorted = [userId, targetId].sort();
        channelId = client.channel("messaging", { members: membersSorted }).id; 
        channelName = `💬 ${membersSorted.filter(m => m !== userId).join("")}`; 
        channelData = {
          name: channelName,
          created_by_id: userId,
          members: membersSorted,
          is_direct_message: true,
        };
      } else if (type === "group") {
        const safeName = identifier.toLowerCase().replace(/[^a-z0-9_]/g, "_");
        channelId = `group-${safeName}-${Date.now()}`;
        channelName = `👥 ${identifier}`;
        channelData = {
          name: channelName,
          created_by_id: userId,
          members: [...new Set([userId, ...members])],
          is_group: true,
        };
      }

      const newChannel = client.channel("messaging", channelId, channelData);
      await newChannel.create();
      await newChannel.watch();

      console.log(`✅ Created/Joined ${type} channel: ${channelId}`);
      setActiveChannel(newChannel);
      setShowGroupModal(false);
      setGroupName("");
      setGroupMembers("");
      setDmTargetUsername(""); 
    } catch (err) {
      console.error(`❌ Error creating ${type} channel:`, err);
    } finally {
      setCreating(false);
    }
  };

  // 🚀 Dedicated handler for 1-on-1 chat
  const handleCreateDM = (e) => {
    e.preventDefault();
    if (dmTargetUsername.trim() && dmTargetUsername.toLowerCase().trim() !== userId) {
      createOrOpenChannel("dm", dmTargetUsername.trim());
    } else if (dmTargetUsername.toLowerCase().trim() === userId) {
      alert("You cannot start a chat with yourself.");
    }
  };

  // ✅ Handle group creation
  const handleGroupCreate = (e) => {
    e.preventDefault();
    if (!groupName.trim()) return;

    const membersArray = groupMembers
      .split(",")
      .map((m) => m.trim().toLowerCase())
      .filter((m) => m && m !== userId);

    createOrOpenChannel("group", groupName, membersArray);
  };

  // ✅ Loading state
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

          {/* Channel List */}
          <ChannelList
            filters={filters}
            sort={sort}
            options={{ state: true, watch: true }}
            onSelect={(ch) => setActiveChannel(ch)}
          />

          {/* --- Start New Chat Controls --- */}
          <div className="new-chat-controls">
            <h3 className="new-chat-title">Start New Chat</h3>

            {/* 🌍 Global Chat */}
            <button
              disabled={creating}
              className="new-chat-button button-public"
              onClick={() => createOrOpenChannel("public")}
            >
              🌍 Global Chat
            </button>

            {/* 💬 Direct Message (Improved UX) */}
            <form onSubmit={handleCreateDM} className="dm-form">
              <input
                type="text"
                placeholder="Enter username for DM"
                className="new-chat-input"
                value={dmTargetUsername}
                onChange={(e) => setDmTargetUsername(e.target.value)}
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

            {/* 👥 Group Chat Creation */}
            <button
              disabled={creating}
              className="new-chat-button button-group-create"
              onClick={() => setShowGroupModal(true)}
            >
              👥 Create Group
            </button>
          </div>
        </div>

        {/* Main Chat Window */}
        <div className="chat-main-window">
          {/* 🔑 FIX: Add key={activeChannel.id} to force channel update */}
          <Channel channel={activeChannel} key={activeChannel.id}> 
            <Window>
              <ChannelHeader />
              <MessageList />
              <MessageInput />
            </Window>
          </Channel>
        </div>
      </div>

      {/* Group Chat Modal (omitted for brevity, no change) */}
      {showGroupModal && (
         <div className="modal-overlay">
          <div className="modal-card">
            <h3 className="modal-title">👥 Create Group Chat</h3>
            <form onSubmit={handleGroupCreate} className="modal-form">
              <input
                type="text"
                placeholder="Enter group name"
                className="modal-input"
                value={groupName}
                onChange={(e) => setGroupName(e.target.value)}
                required
              />
              <textarea
                placeholder="Add members (comma separated usernames)"
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
                  className={`modal-button ${creating ? "button-create-loading" : "button-create-primary"}`}
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