import React, { createContext, useContext, useState, useEffect } from 'react';
import { User, Chat, Message, FriendRequest } from '../types/index';
import { onAuthStateChanged, signIn, signUp, signOutUser, createNewChat, sendMessage, subscribeToMessages, updateProfile, sendFriendRequest, acceptFriendRequest, rejectFriendRequest, getFriendRequests, getFriends, deleteUserAccount } from '../services/firebaseService';
import { searchGifs, getTrendingGifs } from '../services/gifService';
import { ref, get, push, set, query, orderByChild, equalTo, remove } from 'firebase/database';
import { db } from '../services/firebaseService';
import { auth } from '../services/firebaseService';
import { User as FirebaseUser } from 'firebase/auth';

interface AppContextType {
  user: User | null;
  setUser: (user: User | null) => void;
  currentChat: Chat | null;
  setCurrentChat: (chat: Chat | null) => void;
  messages: Message[];
  friends: User[];
  friendRequests: FriendRequest[];
  setFriendRequests: (requests: FriendRequest[]) => void;
  recentChats: Chat[];
  isLoadingFriends: boolean;
  isLoading: boolean;
  error: string | null;
  signIn: (email: string, password: string) => Promise<void>;
  signUp: (email: string, password: string, fullName: string) => Promise<void>;
  signOut: () => Promise<void>;
  deleteUserAccount: () => Promise<void>;
  createNewChat: (participants: string[]) => Promise<Chat | null>;
  sendNewMessage: (content: string, type?: 'text' | 'gif') => Promise<void>;
  loadFriendsData: () => Promise<void>;
  loadRecentChats: () => Promise<void>;
  handleSendFriendRequest: (friendId: string) => Promise<void>;
  handleAcceptRequest: (requestId: string) => Promise<void>;
  handleRejectRequest: (requestId: string) => Promise<void>;
  handleRemoveFriend: (friendId: string) => Promise<void>;
  setRecentChats: (chats: Chat[]) => void;
}

const AppContext = createContext<AppContextType | undefined>(undefined);

export const AppProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [currentChat, setCurrentChat] = useState<Chat | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [friends, setFriends] = useState<User[]>([]);
  const [friendRequests, setFriendRequests] = useState<FriendRequest[]>([]);
  const [recentChats, setRecentChats] = useState<Chat[]>([]);
  const [isLoadingFriends, setIsLoadingFriends] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser: FirebaseUser | null) => {
      if (firebaseUser) {
        const userRef = ref(db, `users/${firebaseUser.uid}`);
        const snapshot = await get(userRef);
        const userData = snapshot.val();
        
        setUser({
          id: firebaseUser.uid,
          email: firebaseUser.email || '',
          fullName: userData?.fullName || firebaseUser.displayName || 'Anonymous',
          avatar: userData?.avatar,
          createdAt: userData?.createdAt || Date.now()
        });
      } else {
        setUser(null);
      }
    });

    return () => unsubscribe();
  }, []);

  const loadFriendsData = async () => {
    if (!user) return;

    try {
      setIsLoadingFriends(true);
      setError(null);
      
      // Load both friend requests and friends list
      const [requests, friendsList] = await Promise.all([
        getFriendRequests(),
        getFriends()
      ]);
      
      setFriendRequests(requests);
      setFriends(friendsList);
      
      console.log('Friends data loaded successfully');
    } catch (error) {
      console.error('Error loading friends data:', error);
      setError('Failed to load friends data. Please try again.');
      
      // Retry after a delay
      setTimeout(() => {
        loadFriendsData();
      }, 3000);
    } finally {
      setIsLoadingFriends(false);
    }
  };

  // Only load data when user changes
  useEffect(() => {
    if (user) {
      console.log('User changed, loading friends data...');
      loadFriendsData();
    } else {
      // Clear data when user logs out
      setFriends([]);
      setFriendRequests([]);
    }
  }, [user]);

  const handleSignIn = async (email: string, password: string) => {
    try {
      setIsLoading(true);
      await signIn(email, password);
      setError(null);
    } catch (error) {
      setError('Failed to sign in. Please check your credentials.');
      throw error;
    } finally {
      setIsLoading(false);
    }
  };

  const handleSignUp = async (email: string, password: string, fullName: string) => {
    try {
      setIsLoading(true);
      await signUp(email, password, fullName);
      setError(null);
    } catch (error) {
      setError('Failed to sign up. Please try again.');
      throw error;
    } finally {
      setIsLoading(false);
    }
  };

  const handleSignOut = async () => {
    try {
      setIsLoading(true);
      await signOutUser();
      setUser(null);
      setCurrentChat(null);
      setMessages([]);
      setError(null);
    } catch (error) {
      setError('Failed to sign out. Please try again.');
      throw error;
    } finally {
      setIsLoading(false);
    }
  };

  const createNewChat = async (participants: string[]) => {
    try {
      setIsLoading(true);
      setError(null);
      const chatRef = push(ref(db, 'chats'));
      const chatId = chatRef.key;
      
      if (!chatId) throw new Error('Failed to create chat');
      
      const newChat = {
        id: chatId,
        name: 'New Chat',
        participants,
        createdAt: Date.now(),
        updatedAt: Date.now()
      };
      
      await set(chatRef, newChat);
      setError(null);
      return newChat;
    } catch (error) {
      setError(error instanceof Error ? error.message : 'Failed to create chat');
      return null;
    } finally {
      setIsLoading(false);
    }
  };

  const handleSendMessage = async (content: string, type: 'text' | 'gif' = 'text') => {
    if (!user || !currentChat) return;
    
    try {
      setIsLoading(true);
      console.log('Sending message:', { content, type, chatId: currentChat.id }); // Debug log
      const messageId = await sendMessage(currentChat.id, content, type);
      console.log('Message sent successfully:', messageId); // Debug log
      setError(null);
    } catch (error) {
      console.error('Error sending message:', error); // Debug log
      setError('Failed to send message. Please try again.');
      throw error;
    } finally {
      setIsLoading(false);
    }
  };

  const loadRecentChats = async () => {
    if (!user) return;

    try {
      console.log('Loading recent chats for user:', user.id);
      setIsLoadingFriends(true);
      const chatsRef = ref(db, 'chats');
      const snapshot = await get(chatsRef);
      
      if (!snapshot.exists()) {
        console.log('No chats found in database');
        setRecentChats([]);
        return;
      }

      const chats = snapshot.val();
      const userChats: Chat[] = [];

      for (const chatId in chats) {
        const chat = chats[chatId];
        
        // Check if the user is in the participants array
        if (chat.participants && Array.isArray(chat.participants) && chat.participants.includes(user.id)) {
          userChats.push({
            id: chatId,
            name: chat.name || 'Chat',
            participants: chat.participants,
            createdAt: chat.createdAt,
            updatedAt: chat.updatedAt || chat.createdAt
          });
        }
      }

      // Sort chats by most recent
      userChats.sort((a, b) => (b.updatedAt || b.createdAt) - (a.updatedAt || a.createdAt));
      
      // Update recent chats without affecting current chat
      setRecentChats(prevChats => {
        const newChats = [...userChats];
        // If we have a current chat, make sure it's in the list
        if (currentChat && !newChats.some(chat => chat.id === currentChat.id)) {
          newChats.push(currentChat);
        }
        return newChats;
      });
    } catch (error) {
      console.error('Error loading recent chats:', error);
    } finally {
      setIsLoadingFriends(false);
    }
  };

  // Load recent chats when user changes
  useEffect(() => {
    if (user) {
      loadRecentChats();
    }
  }, [user]);

  // Update messages when current chat changes
  useEffect(() => {
    if (!currentChat) {
      return;
    }

    const unsubscribe = subscribeToMessages(currentChat.id, (newMessages) => {
      setMessages(prevMessages => {
        // Only update messages for the current chat
        const otherChatMessages = prevMessages.filter(m => m.chatId !== currentChat.id);
        const updatedMessages = [...otherChatMessages, ...newMessages];
        
        // Sort messages by timestamp
        updatedMessages.sort((a, b) => a.timestamp - b.timestamp);
        
        return updatedMessages;
      });
    });

    return () => unsubscribe();
  }, [currentChat]);

  const handleSendFriendRequest = async (friendId: string): Promise<void> => {
    try {
      setIsLoading(true);
      setError(null);
      await sendFriendRequest(friendId);
      await loadFriendsData();
    } catch (error) {
      setError(error instanceof Error ? error.message : 'Failed to send friend request');
      throw error;
    } finally {
      setIsLoading(false);
    }
  };

  const handleAcceptRequest = async (requestId: string) => {
    try {
      setIsLoadingFriends(true);
      setError(null);
      
      // Accept the friend request
      await acceptFriendRequest(requestId);
      
      // Reload both friend requests and friends list
      const [updatedRequests, updatedFriends] = await Promise.all([
        getFriendRequests(),
        getFriends()
      ]);
      
      setFriendRequests(updatedRequests);
      setFriends(updatedFriends);
      
      console.log('Friend request accepted successfully');
    } catch (error) {
      console.error('Error accepting friend request:', error);
      setError('Failed to accept friend request. Please try again.');
    } finally {
      setIsLoadingFriends(false);
    }
  };

  const handleRejectRequest = async (requestId: string) => {
    try {
      setIsLoadingFriends(true);
      setError(null);
      
      // Reject the friend request
      await rejectFriendRequest(requestId);
      
      // Reload friend requests
      const updatedRequests = await getFriendRequests();
      setFriendRequests(updatedRequests);
      
      console.log('Friend request rejected successfully');
    } catch (error) {
      console.error('Error rejecting friend request:', error);
      setError('Failed to reject friend request. Please try again.');
    } finally {
      setIsLoadingFriends(false);
    }
  };

  const handleRemoveFriend = async (friendId: string) => {
    if (!user) return;

    try {
      setIsLoading(true);
      setError(null);

      // Remove friend from current user's friends list
      const userFriendsRef = ref(db, `users/${user.id}/friends/${friendId}`);
      await remove(userFriendsRef);

      // Remove current user from friend's friends list
      const friendFriendsRef = ref(db, `users/${friendId}/friends/${user.id}`);
      await remove(friendFriendsRef);

      // Update local state
      setFriends(prevFriends => prevFriends.filter(friend => friend.id !== friendId));
      
      console.log('Friend removed successfully');
    } catch (error) {
      console.error('Error removing friend:', error);
      setError('Failed to remove friend. Please try again.');
      throw error;
    } finally {
      setIsLoading(false);
    }
  };

  const handleDeleteAccount = async () => {
    try {
      setIsLoading(true);
      setError(null);
      await deleteUserAccount();
      setUser(null);
      setCurrentChat(null);
      setMessages([]);
      setFriends([]);
      setFriendRequests([]);
      setRecentChats([]);
    } catch (error) {
      console.error('Error deleting account:', error);
      setError('Failed to delete account. Please try again.');
      throw error;
    } finally {
      setIsLoading(false);
    }
  };

  const value = {
    user,
    setUser,
    currentChat,
    setCurrentChat,
    messages,
    friends,
    friendRequests,
    setFriendRequests,
    recentChats,
    isLoadingFriends,
    isLoading,
    error,
    signIn: handleSignIn,
    signUp: handleSignUp,
    signOut: handleSignOut,
    deleteUserAccount: handleDeleteAccount,
    createNewChat,
    sendNewMessage: handleSendMessage,
    loadFriendsData,
    loadRecentChats,
    handleSendFriendRequest,
    handleAcceptRequest,
    handleRejectRequest,
    handleRemoveFriend,
    setRecentChats
  };

  return (
    <AppContext.Provider value={value}>
      {children}
    </AppContext.Provider>
  );
};

export const useApp = () => {
  const context = useContext(AppContext);
  if (context === undefined) {
    throw new Error('useApp must be used within an AppProvider');
  }
  return context;
}; 