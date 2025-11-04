// web/src/components/ChatRoom.jsx

import React, { useState, useEffect } from "react";
// Import Stream components and hook
import { 
  Chat, 
  Channel, 
  Window, 
  ChannelHeader, 
  MessageList, 
  MessageInput, 
  ChannelList,
  useCreateChatClient // Hook for initializing the client
} from "stream-chat-react";
import "stream-chat-react/dist/css/v2/index.css"; // The required Stream Chat CSS

// Component to handle the chat display
export default function ChatRoom({ nickname, chatCredentials }) {
  const { userId, apiKey, streamToken } = chatCredentials;
  const [channel, setChannel] = useState(null);

  // 1. Initialize Stream Client & Connect User
  // useCreateChatClient handles the async connection process
  const client = useCreateChatClient({
    apiKey,
    tokenOrProvider: streamToken,
    userData: { 
      id: userId, 
      name: nickname,
      // Optional: Add an image if you have a URL
      // image: 'https://example.com/image.png' 
    },
  });

  // 2. Set up the Public Global Channel
  useEffect(() => {
    // Only proceed once the client is ready
    if (client) {
      
      // Define the channel using a consistent ID for the Public Chat
      const publicChannelId = 'global-public-chat';
      
      // Create a 'messaging' channel instance
      const newChannel = client.channel(
        'messaging', 
        publicChannelId, 
        {
          name: 'Anonymous Global Chat', // Display name
          members: [userId], // Add the user to the channel members list
        }
      );
      
      // The watch() call creates the channel if it doesn't exist AND subscribes the user
      newChannel.watch().then(() => {
        setChannel(newChannel);
        console.log(`Joined and watching channel: ${publicChannelId}`);
      }).catch(error => {
        console.error("Error creating/watching channel:", error);
      });
      
    }
  }, [client, userId]); // Re-run when client or userId changes
  
  // Clean-up function to disconnect the user when the component unmounts
  useEffect(() => {
    return () => {
        if (client) {
            client.disconnectUser();
            console.log("Stream client disconnected.");
        }
    };
  }, [client]);


  // 3. Render the UI
  if (!client || !channel) {
    // Show a loading indicator until the client is connected and the channel is set
    return (
      <div className="flex items-center justify-center h-screen text-lg">
        Connecting to Chat as {nickname}...
      </div>
    );
  }

  // Once client and channel are ready, render the Chat UI
  return (
    // The main Stream Chat provider component
    <Chat client={client} theme="messaging light">
      <div className="flex h-screen">
        
        {/* Channel List - Optional, but useful for finding other chats */}
        <div className="w-1/4">
          <ChannelList
            filters={{ members: { $in: [userId] } }}
            sort={{ last_message_at: -1 }}
            // You can add a preview component here to list channels
          />
        </div>
        
        {/* Main Chat Window */}
        <div className="w-3/4">
          <Channel channel={channel}>
            <Window>
              <ChannelHeader />
              <MessageList />
              <MessageInput />
            </Window>
          </Channel>
        </div>
        
      </div>
    </Chat>
  );
}