import { useState, useEffect } from 'react';
import { Message } from '../types/index';

interface UseNewMessageIndicatorProps {
  chatId: string;
  messages: Message[];
  currentChatId: string | null;
  lastMessageTimestamps: Record<string, number>;
  currentUserId: string | null;
}

export const useNewMessageIndicator = ({
  chatId,
  messages,
  currentChatId,
  lastMessageTimestamps,
  currentUserId
}: UseNewMessageIndicatorProps) => {
  // Get the last message for this chat
  const chatMessages = messages.filter(m => m.chatId === chatId);
  const lastMessage = chatMessages[chatMessages.length - 1];
  
  // Show new message indicator if:
  // 1. There is a last message
  // 2. The message is a GIF
  // 3. The message is from someone else (not current user)
  // 4. The message is newer than the last viewed timestamp
  // 5. The chat is not currently open
  const lastViewed = lastMessageTimestamps[chatId] || 0;
  const showNewMessage = lastMessage && 
    lastMessage.type === 'gif' &&
    lastMessage.senderId !== currentUserId &&
    new Date(lastMessage.timestamp).getTime() > lastViewed &&
    currentChatId !== chatId;
  
  return {
    showNewMessage,
    lastMessage
  };
}; 