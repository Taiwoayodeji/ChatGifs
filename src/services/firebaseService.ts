import { initializeApp, FirebaseApp } from 'firebase/app';
import { 
  getAuth, 
  signInWithEmailAndPassword, 
  createUserWithEmailAndPassword,
  signOut,
  onAuthStateChanged as firebaseOnAuthStateChanged,
  User as FirebaseUser,
  Auth,
  updateProfile
} from 'firebase/auth';
import { 
  getDatabase,
  ref,
  set,
  push,
  onValue,
  off,
  query,
  orderByChild,
  equalTo,
  Database,
  get,
  update,
  remove
} from 'firebase/database';
import { User, Chat, Message, FriendRequest } from '../types/index';

const firebaseConfig = {
  apiKey: process.env.REACT_APP_FIREBASE_API_KEY,
  authDomain: process.env.REACT_APP_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.REACT_APP_FIREBASE_PROJECT_ID,
  storageBucket: process.env.REACT_APP_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.REACT_APP_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.REACT_APP_FIREBASE_APP_ID,
  databaseURL: process.env.REACT_APP_FIREBASE_DATABASE_URL
};

// Debug Firebase configuration
console.log('Firebase Config:', {
  apiKey: process.env.REACT_APP_FIREBASE_API_KEY ? 'Present' : 'Missing',
  authDomain: process.env.REACT_APP_FIREBASE_AUTH_DOMAIN ? 'Present' : 'Missing',
  projectId: process.env.REACT_APP_FIREBASE_PROJECT_ID ? 'Present' : 'Missing',
  storageBucket: process.env.REACT_APP_FIREBASE_STORAGE_BUCKET ? 'Present' : 'Missing',
  messagingSenderId: process.env.REACT_APP_FIREBASE_MESSAGING_SENDER_ID ? 'Present' : 'Missing',
  appId: process.env.REACT_APP_FIREBASE_APP_ID ? 'Present' : 'Missing',
  databaseURL: process.env.REACT_APP_FIREBASE_DATABASE_URL ? 'Present' : 'Missing'
});

// Initialize Firebase with proper error handling
let app: FirebaseApp;
let auth: Auth;
let db: Database;

try {
  app = initializeApp(firebaseConfig);
  auth = getAuth(app);
  db = getDatabase(app);
} catch (error) {
  console.error('Firebase initialization error:', error);
  throw new Error('Failed to initialize Firebase services');
}

export { auth, db };

export const signIn = async (email: string, password: string) => {
  try {
    const userCredential = await signInWithEmailAndPassword(auth, email, password);
    return userCredential.user;
  } catch (error) {
    console.error('Error signing in:', error);
    throw error;
  }
};

export const signUp = async (email: string, password: string, fullName: string) => {
  try {
    const userCredential = await createUserWithEmailAndPassword(auth, email, password);
    const user = userCredential.user;
    
    // Set display name in Firebase Auth
    await updateProfile(user, {
      displayName: fullName
    });

    // Store user data in Realtime Database
    const userRef = ref(db, `users/${user.uid}`);
    await set(userRef, {
      email,
      fullName,
      createdAt: Date.now()
    });

    console.log('User created successfully:', user.uid);
    return user;
  } catch (error) {
    console.error('Error creating user:', error);
    throw error;
  }
};

export const signOutUser = () => {
  return signOut(auth);
};

export const onAuthStateChanged = firebaseOnAuthStateChanged;

export const sendMessage = async (chatId: string, content: string, type: 'text' | 'gif' = 'text') => {
  const currentUser = auth.currentUser;
  if (!currentUser) throw new Error('Not authenticated');

  console.log('Sending message to chat:', chatId);
  console.log('Current user:', currentUser.uid);

  // Verify the chat exists and user is a participant
  const chatRef = ref(db, `chats/${chatId}`);
  const chatSnapshot = await get(chatRef);
  
  if (!chatSnapshot.exists()) {
    console.error('Chat does not exist:', chatId);
    throw new Error('Chat does not exist');
  }

  const chat = chatSnapshot.val();
  console.log('Chat data:', chat);

  // Check if participants array exists and contains current user
  if (!chat.participants || !Array.isArray(chat.participants)) {
    console.error('Invalid participants array:', chat.participants);
    // Fix the participants array if it's invalid
    await update(ref(db, `chats/${chatId}`), {
      participants: [currentUser.uid, ...Object.keys(chat).filter(key => key !== 'participants')]
    });
  }

  if (!chat.participants.includes(currentUser.uid)) {
    console.error('User not in participants:', {
      userId: currentUser.uid,
      participants: chat.participants
    });
    // Add current user to participants if missing
    await update(ref(db, `chats/${chatId}`), {
      participants: [...chat.participants, currentUser.uid]
    });
  }

  // Create message with proper type
  const messageData = {
    senderId: currentUser.uid,
    content,
    type,
    timestamp: Date.now(),
    chatId
  };

  console.log('Creating message:', messageData);

  // Push message to chat
  const messageRef = push(ref(db, `chats/${chatId}/messages`));
  if (!messageRef.key) throw new Error('Failed to generate message ID');

  await set(messageRef, messageData);

  // Update chat's last message and timestamp
  await update(ref(db, `chats/${chatId}`), {
    lastMessage: {
      content,
      type,
      timestamp: Date.now()
    },
    updatedAt: Date.now()
  });

  console.log('Message sent successfully');
  return messageRef.key;
};

export const subscribeToMessages = (chatId: string, callback: (messages: Message[]) => void) => {
  const messagesRef = ref(db, `chats/${chatId}/messages`);
  const unsubscribe = onValue(messagesRef, (snapshot) => {
    const messages: Message[] = [];
    snapshot.forEach((childSnapshot) => {
      const data = childSnapshot.val();
      messages.push({
        id: childSnapshot.key || '',
        senderId: data.senderId,
        content: data.content,
        type: data.type,
        timestamp: data.timestamp,
        chatId
      });
    });
    // Sort messages by timestamp
    messages.sort((a, b) => a.timestamp - b.timestamp);
    callback(messages);
  });

  return () => off(messagesRef, 'value', unsubscribe);
};

export const createNewChat = async (otherUserId: string): Promise<Chat> => {
  const currentUser = auth.currentUser;
  if (!currentUser) throw new Error('Not authenticated');

  console.log('Creating chat between:', {
    currentUser: currentUser.uid,
    otherUser: otherUserId
  });

  // Check if users are friends
  const userFriendsRef = ref(db, `users/${currentUser.uid}/friends`);
  const friendsSnapshot = await get(userFriendsRef);
  const userFriends = friendsSnapshot.val() || {};

  if (!userFriends[otherUserId]) {
    throw new Error('Can only create chats with friends');
  }

  // Check if chat already exists
  const userChatsRef = ref(db, `userChats/${currentUser.uid}`);
  const userChatsSnapshot = await get(userChatsRef);
  const userChats = userChatsSnapshot.val() || {};

  for (const chatId of Object.keys(userChats)) {
    const chatRef = ref(db, `chats/${chatId}`);
    const chatSnapshot = await get(chatRef);
    const chat = chatSnapshot.val();

    if (chat.participants && chat.participants.includes(otherUserId)) {
      console.log('Found existing chat:', chatId);
      return { id: chatId, ...chat };
    }
  }

  // Create new chat
  const chatRef = push(ref(db, 'chats'));
  if (!chatRef.key) throw new Error('Failed to generate chat ID');

  const chatId = chatRef.key;
  const timestamp = Date.now();

  // Initialize chat with both participants
  const chatData = {
    id: chatId,
    participants: [currentUser.uid, otherUserId],
    createdAt: timestamp,
    updatedAt: timestamp,
    name: 'New Chat'
  };

  console.log('Creating new chat with data:', chatData);

  // Create chat and update userChats in a single transaction
  await update(ref(db), {
    [`chats/${chatId}`]: chatData,
    [`userChats/${currentUser.uid}/${chatId}`]: true,
    [`userChats/${otherUserId}/${chatId}`]: true
  });

  return chatData;
};

export const getChatMessages = async (chatId: string) => {
  const messagesRef = ref(db, `chats/${chatId}/messages`);
  const snapshot = await get(messagesRef);
  const messages = snapshot.val() || {};

  return Object.entries(messages)
    .map(([id, message]: [string, any]) => ({
      id,
      ...message
    }))
    .sort((a, b) => a.timestamp - b.timestamp);
};

export const getChats = async () => {
  const currentUser = auth.currentUser;
  if (!currentUser) throw new Error('Not authenticated');

  const chatsRef = ref(db, 'chats');
  const snapshot = await get(chatsRef);
  const chats = snapshot.val() || {};

  return Object.entries(chats)
    .filter(([_, chat]: [string, any]) => chat.participants?.[currentUser.uid])
    .map(([id, chat]: [string, any]) => ({
      id,
      ...chat
    }));
};

export const sendFriendRequest = async (receiverId: string): Promise<void> => {
  if (!auth.currentUser) throw new Error('Not authenticated');

  try {
    const requestId = crypto.randomUUID();
    const senderRef = ref(db, `users/${auth.currentUser.uid}`);
    const receiverRef = ref(db, `users/${receiverId}`);
    const [senderSnapshot, receiverSnapshot] = await Promise.all([
      get(senderRef),
      get(receiverRef)
    ]);
    const senderData = senderSnapshot.val();
    const receiverData = receiverSnapshot.val();

    if (!senderData || !receiverData) throw new Error('User data not found');

    const requestData: FriendRequest = {
      id: requestId,
      senderId: auth.currentUser.uid,
      receiverId,
      senderName: senderData.fullName,
      receiverName: receiverData.fullName,
      senderEmail: senderData.email,
      receiverEmail: receiverData.email,
      status: 'pending',
      timestamp: Date.now()
    };

    // Add request to receiver's friend requests
    await set(ref(db, `friendRequests/${receiverId}/${requestId}`), requestData);
    
    // Add request to sender's sent requests
    await set(ref(db, `sentRequests/${auth.currentUser.uid}/${requestId}`), requestData);

  } catch (error) {
    console.error('Error sending friend request:', error);
    throw error;
  }
};

export const acceptFriendRequest = async (requestId: string): Promise<void> => {
  try {
    const user = auth.currentUser;
    if (!user) throw new Error('User not authenticated');

    // Get the request from friendRequests
    const requestRef = ref(db, `friendRequests/${user.uid}/${requestId}`);
    const requestSnapshot = await get(requestRef);
    const request = requestSnapshot.val();

    if (!request) throw new Error('Request not found');

    // Update both users' friends lists
    await Promise.all([
      // Add to current user's friends list
      set(ref(db, `users/${user.uid}/friends/${request.senderId}`), {
        id: request.senderId,
        createdAt: Date.now()
      }),
      // Add to sender's friends list
      set(ref(db, `users/${request.senderId}/friends/${user.uid}`), {
        id: user.uid,
        createdAt: Date.now()
      }),
      // Update request status to accepted
      update(requestRef, { status: 'accepted' }),
      // Update sent request status
      update(ref(db, `sentRequests/${request.senderId}/${requestId}`), { status: 'accepted' })
    ]);
  } catch (error) {
    console.error('Error accepting friend request:', error);
    throw error;
  }
};

export const rejectFriendRequest = async (requestId: string): Promise<void> => {
  if (!auth.currentUser) throw new Error('Not authenticated');

  try {
    const requestRef = ref(db, `friendRequests/${auth.currentUser.uid}/${requestId}`);
    const requestSnapshot = await get(requestRef);
    
    if (!requestSnapshot.exists()) {
      throw new Error('Friend request not found');
    }

    const request = requestSnapshot.val();

    // Update request status to rejected
    await Promise.all([
      update(requestRef, { status: 'rejected' }),
      update(ref(db, `sentRequests/${request.senderId}/${requestId}`), { status: 'rejected' })
    ]);
  } catch (error) {
    console.error('Error rejecting friend request:', error);
    throw error;
  }
};

export const getFriendRequests = async (): Promise<FriendRequest[]> => {
  try {
    const user = auth.currentUser;
    if (!user) throw new Error('User not authenticated');

    // Get both received and sent requests
    const [receivedSnapshot, sentSnapshot] = await Promise.all([
      get(ref(db, `friendRequests/${user.uid}`)),
      get(ref(db, `sentRequests/${user.uid}`))
    ]);

    const receivedRequests = receivedSnapshot.exists() ? Object.values(receivedSnapshot.val()) : [];
    const sentRequests = sentSnapshot.exists() ? Object.values(sentSnapshot.val()) : [];

    // Get user information for all requests
    const allRequests = [
      ...receivedRequests.map(async (request: any) => {
        const senderRef = ref(db, `users/${request.senderId}`);
        const senderSnapshot = await get(senderRef);
        const senderData = senderSnapshot.val();
        
        return {
          ...request,
          senderName: senderData?.fullName || 'Unknown User',
          senderEmail: senderData?.email || 'No email',
          timestamp: request.createdAt || request.timestamp || Date.now()
        };
      }),
      ...sentRequests.map(async (request: any) => {
        const receiverRef = ref(db, `users/${request.receiverId}`);
        const receiverSnapshot = await get(receiverRef);
        const receiverData = receiverSnapshot.val();
        
        return {
          ...request,
          receiverName: receiverData?.fullName || 'Unknown User',
          receiverEmail: receiverData?.email || 'No email',
          timestamp: request.createdAt || request.timestamp || Date.now()
        };
      })
    ];

    // Wait for all requests to be processed
    const processedRequests = await Promise.all(allRequests);

    // Filter and return pending requests
    return processedRequests
      .filter((request: any) => request.status === 'pending')
      .map((request: any) => ({
        id: request.id,
        senderId: request.senderId,
        senderName: request.senderName,
        senderEmail: request.senderEmail,
        receiverId: request.receiverId,
        receiverName: request.receiverName,
        receiverEmail: request.receiverEmail,
        status: request.status,
        timestamp: request.timestamp
      }));
  } catch (error) {
    console.error('Error getting friend requests:', error);
    return [];
  }
};

export const getSentRequests = async (): Promise<FriendRequest[]> => {
  try {
    const user = auth.currentUser;
    if (!user) throw new Error('User not authenticated');

    const requestsRef = ref(db, `friendRequests`);
    const snapshot = await get(requestsRef);

    if (!snapshot.exists()) return [];

    const requests = snapshot.val();
    const processedRequests = await Promise.all(
      Object.values(requests)
        .filter((request: any) => request.status === 'pending')
        .map(async (request: any) => {
          const receiverRef = ref(db, `users/${request.receiverId}`);
          const receiverSnapshot = await get(receiverRef);
          const receiverData = receiverSnapshot.val();

          return {
            id: request.id,
            senderId: request.senderId,
            senderName: request.senderName,
            senderEmail: request.senderEmail,
            receiverId: request.receiverId,
            receiverName: receiverData?.fullName || 'Unknown User',
            receiverEmail: receiverData?.email || 'No email',
            status: request.status,
            timestamp: request.createdAt || request.timestamp || Date.now()
          };
        })
    );

    return processedRequests;
  } catch (error) {
    console.error('Error getting sent requests:', error);
    return [];
  }
};

export const searchUsers = async (searchTerm: string) => {
  const currentUser = auth.currentUser;
  if (!currentUser) throw new Error('Not authenticated');

  try {
    const usersRef = ref(db, 'users');
    const snapshot = await get(usersRef);
    const users = snapshot.val() || {};

    return Object.entries(users)
      .filter(([userId, userData]) => {
        if (userId === currentUser.uid) return false;
        const user = userData as User;
        const searchLower = searchTerm.toLowerCase();
        return (
          user.email.toLowerCase().includes(searchLower) ||
          user.fullName.toLowerCase().includes(searchLower)
        );
      })
      .map(([userId, userData]) => ({
        id: userId,
        ...(userData as Omit<User, 'id'>)
      }));
  } catch (error) {
    console.error('Error searching users:', error);
    throw new Error('Failed to search users');
  }
};

export const addFriend = async (userId: string, friendId: string): Promise<void> => {
  try {
    const userFriendsRef = ref(db, `users/${userId}/friends/${friendId}`);
    const friendFriendsRef = ref(db, `users/${friendId}/friends/${userId}`);
    
    const timestamp = Date.now();
    
    await Promise.all([
      set(userFriendsRef, {
        id: friendId,
        createdAt: timestamp
      }),
      set(friendFriendsRef, {
        id: userId,
        createdAt: timestamp
      })
    ]);
  } catch (error) {
    console.error('Error adding friend:', error);
    throw error;
  }
};

export const removeFriend = async (userId: string, friendId: string): Promise<void> => {
  try {
    const userFriendsRef = ref(db, `users/${userId}/friends/${friendId}`);
    const friendFriendsRef = ref(db, `users/${friendId}/friends/${userId}`);
    
    await Promise.all([
      remove(userFriendsRef),
      remove(friendFriendsRef)
    ]);
  } catch (error) {
    console.error('Error removing friend:', error);
    throw error;
  }
};

export const getFriends = async (): Promise<User[]> => {
  if (!auth.currentUser) return [];

  try {
    const userRef = ref(db, `users/${auth.currentUser.uid}/friends`);
    const snapshot = await get(userRef);
    
    if (!snapshot.exists()) return [];

    const friendsData = snapshot.val();
    const friendsList: User[] = [];

    for (const friendId in friendsData) {
      const friendRef = ref(db, `users/${friendId}`);
      const friendSnapshot = await get(friendRef);
      
      if (friendSnapshot.exists()) {
        const friendData = friendSnapshot.val();
        friendsList.push({
          id: friendId,
          email: friendData.email,
          fullName: friendData.fullName,
          createdAt: friendData.createdAt
        });
      }
    }

    return friendsList;
  } catch (error) {
    console.error('Error fetching friends:', error);
    return [];
  }
};

// Update online status with proper timing
export const updateUserOnlineStatus = async (userId: string, isOnline: boolean): Promise<void> => {
  try {
    const userRef = ref(db, `users/${userId}`);
    const updates: Record<string, any> = {
      isOnline,
      lastOnlineUpdate: Date.now()
    };
    
    if (!isOnline) {
      updates.lastSeen = Date.now();
    }
    
    await update(userRef, updates);
  } catch (error) {
    console.error('Error updating user online status:', error);
  }
};

// Subscribe to user status with proper cleanup
export const subscribeToUserStatus = (userId: string, callback: (isOnline: boolean) => void) => {
  const userRef = ref(db, `users/${userId}`);
  let isSubscribed = true;
  let lastStatus = false;
  
  const unsubscribe = onValue(userRef, (snapshot) => {
    if (!isSubscribed) return;
    
    const data = snapshot.val();
    if (data) {
      const isOnline = data.isOnline;
      const lastOnlineUpdate = data.lastOnlineUpdate || 0;
      const currentTime = Date.now();
      
      // Consider user offline if no update in last 5 minutes (increased from 3)
      const isActuallyOnline = isOnline && (currentTime - lastOnlineUpdate < 300000);
      
      // Only trigger callback if status actually changed
      if (isActuallyOnline !== lastStatus) {
        lastStatus = isActuallyOnline;
        callback(isActuallyOnline);
      }
    } else {
      if (lastStatus !== false) {
        lastStatus = false;
        callback(false);
      }
    }
  });
  
  return () => {
    isSubscribed = false;
    off(userRef, 'value', unsubscribe);
  };
};

// Check user online status with proper error handling
export const checkUserOnlineStatus = async (userId: string): Promise<boolean> => {
  try {
    const userRef = ref(db, `users/${userId}`);
    const snapshot = await get(userRef);
    const userData = snapshot.val();
    
    if (!userData) return false;
    
    // Consider user online if:
    // 1. They are explicitly marked as online
    // 2. Their last online update was within the last 5 minutes
    const isOnline = userData.isOnline || 
      (userData.lastOnlineUpdate && 
       Date.now() - userData.lastOnlineUpdate < 300000); // 5 minutes
    
    return isOnline;
  } catch (error) {
    console.error('Error checking user online status:', error);
    return false;
  }
};

export const deleteUserAccount = async () => {
  try {
    const currentUser = auth.currentUser;
    if (!currentUser) {
      throw new Error('No user is currently signed in');
    }

    const userId = currentUser.uid;

    // Delete user's chats
    const chatsRef = ref(db, 'chats');
    const chatsSnapshot = await get(chatsRef);
    if (chatsSnapshot.exists()) {
      const chats = chatsSnapshot.val();
      for (const chatId in chats) {
        if (chats[chatId].participants.includes(userId)) {
          await remove(ref(db, `chats/${chatId}`));
        }
      }
    }

    // Delete user's friend requests
    const requestsRef = ref(db, 'friendRequests');
    const requestsSnapshot = await get(requestsRef);
    if (requestsSnapshot.exists()) {
      const requests = requestsSnapshot.val();
      for (const requestId in requests) {
        if (requests[requestId].senderId === userId || requests[requestId].receiverId === userId) {
          await remove(ref(db, `friendRequests/${requestId}`));
        }
      }
    }

    // Remove user from friends' lists
    const usersRef = ref(db, 'users');
    const usersSnapshot = await get(usersRef);
    if (usersSnapshot.exists()) {
      const users = usersSnapshot.val();
      for (const otherUserId in users) {
        if (users[otherUserId].friends && users[otherUserId].friends[userId]) {
          await remove(ref(db, `users/${otherUserId}/friends/${userId}`));
        }
      }
    }

    // Delete user's messages
    const messagesRef = ref(db, 'messages');
    const messagesSnapshot = await get(messagesRef);
    if (messagesSnapshot.exists()) {
      const messages = messagesSnapshot.val();
      for (const messageId in messages) {
        if (messages[messageId].senderId === userId) {
          await remove(ref(db, `messages/${messageId}`));
        }
      }
    }

    // Delete user data from users collection
    await remove(ref(db, `users/${userId}`));

    // Delete the user's authentication account
    await currentUser.delete();

  } catch (error) {
    console.error('Error deleting user account:', error);
    throw error;
  }
};

export { updateProfile }; 