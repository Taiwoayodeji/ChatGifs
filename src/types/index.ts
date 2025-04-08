export interface User {
  id: string;
  email: string;
  fullName: string;
  avatar?: string;
  createdAt: number;
}

export interface Message {
  id: string;
  senderId: string;
  content: string;
  type: 'text' | 'gif';
  timestamp: number;
  chatId: string;
}

export interface Chat {
  id: string;
  name: string;
  participants: string[];
  createdAt: number;
  updatedAt: number;
  lastMessage?: {
    content: string;
    type: 'text' | 'gif';
    timestamp: number;
  };
}

export interface FriendRequest {
  id: string;
  senderId: string;
  receiverId: string;
  senderName: string;
  receiverName: string;
  senderEmail: string;
  receiverEmail: string;
  status: 'pending' | 'accepted' | 'rejected';
  timestamp: number;
}

export interface GiphyGif {
  id: string;
  title: string;
  images: {
    fixed_height: {
      url: string;
      width: number;
      height: number;
    };
  };
} 