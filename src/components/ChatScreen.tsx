import React, { useState, useEffect, useRef, useCallback, ChangeEvent, MouseEvent, useMemo } from 'react';
import styled, { ThemeProvider } from 'styled-components';
import { useApp } from '../contexts/AppContext';
import { Message, FriendRequest, User, GiphyGif, Chat } from '../types/index';
import { searchGifs, getTrendingGifs } from '../services/gifService';
import { useNavigate } from 'react-router-dom';
import { ref, get, remove, update, onValue, off } from 'firebase/database';
import { db } from '../services/firebaseService';
import { 
  searchUsers, 
  removeFriend, 
  sendFriendRequest, 
  acceptFriendRequest, 
  rejectFriendRequest,
  updateUserOnlineStatus,
  subscribeToUserStatus,
  checkUserOnlineStatus,
  deleteUserAccount
} from '../services/firebaseService';
import { debounce } from 'lodash';

// Update theme types
const lightTheme = {
  // Background colors
  background: '#FFFFFF',
  card: '#F8F9FA',
  input: '#FFFFFF',
  modal: '#FFFFFF',
  
  // Text colors
  text: '#1A1A1A', // WCAG AAA for normal text
  secondaryText: '#4A4A4A', // WCAG AA for normal text
  placeholder: '#6C757D',
  
  // UI colors
  primary: '#007AFF', // Original blue color
  primaryHover: '#F5F5F7', // Light gray for hover
  secondary: '#6C757D',
  secondaryHover: '#5A6268',
  danger: '#DC3545', // WCAG AA for normal text
  dangerHover: '#C82333',
  success: '#28A745', // WCAG AA for normal text
  successHover: '#218838',
  
  // Border colors
  border: '#E5E5E5', // Original border color
  borderHover: '#CED4DA',
  
  // Focus states
  focus: '#007AFF',
  focusRing: 'rgba(0, 122, 255, 0.1)',
  
  // Status colors
  online: '#28A745',
  offline: '#6C757D',
  
  // Shadows
  shadow: '0 2px 4px rgba(0, 0, 0, 0.1)',
  shadowHover: '0 4px 8px rgba(0, 0, 0, 0.15)'
};

const darkTheme = {
  // Background colors
  background: '#121212',
  card: '#1E1E1E',
  input: '#2D2D2D',
  modal: '#1E1E1E',
  
  // Text colors
  text: '#FFFFFF', // WCAG AAA for normal text
  secondaryText: '#E0E0E0', // WCAG AA for normal text
  placeholder: '#A0A0A0',
  
  // UI colors
  primary: '#0A84FF', // Original dark theme blue
  primaryHover: '#2C2C2E', // Dark gray for hover
  secondary: '#868E96',
  secondaryHover: '#74808A',
  danger: '#FF6B6B', // WCAG AA for normal text
  dangerHover: '#FF5252',
  success: '#51CF66', // WCAG AA for normal text
  successHover: '#40C057',
  
  // Border colors
  border: '#2C2C2E', // Original dark border color
  borderHover: '#3D3D3D',
  
  // Focus states
  focus: '#0A84FF',
  focusRing: 'rgba(10, 132, 255, 0.1)',
  
  // Status colors
  online: '#51CF66',
  offline: '#868E96',
  
  // Shadows
  shadow: '0 2px 4px rgba(0, 0, 0, 0.3)',
  shadowHover: '0 4px 8px rgba(0, 0, 0, 0.4)'
};

const Container = styled.div`
  display: flex;
  height: 100vh;
  background-color: ${props => props.theme.background};
  overflow: hidden;
  color: ${props => props.theme.text};
`;

const Sidebar = styled.div`
  width: 280px;
  min-width: 280px;
  background-color: ${props => props.theme.card};
  border-right: 1px solid ${props => props.theme.border};
  display: flex;
  flex-direction: column;
  height: 100vh;
  transition: transform 0.3s ease;
  
  @media (max-width: 768px) {
    position: fixed;
    left: 0;
    top: 0;
    bottom: 0;
    z-index: 1000;
    transform: translateX(-100%);
    
    &.open {
      transform: translateX(0);
    }
  }
`;

const SidebarHeader = styled.div`
  padding: 1rem;
  border-bottom: 1px solid ${props => props.theme.border};
  background-color: ${props => props.theme.card};
`;

const SidebarContent = styled.div`
  flex: 1;
  display: flex;
  flex-direction: column;
  overflow: hidden;
  background-color: ${props => props.theme.card};
`;

const RecentChatsContainer = styled.div`
  flex: 1;
  overflow-y: auto;
  padding: 0 1rem;
  background-color: ${props => props.theme.card};
  
  &::-webkit-scrollbar {
    width: 6px;
  }

  &::-webkit-scrollbar-track {
    background: ${props => props.theme.card};
  }

  &::-webkit-scrollbar-thumb {
    background-color: ${props => props.theme.border};
    border-radius: 3px;
  }
`;

const SidebarFooter = styled.div`
  padding: 1rem;
  border-top: 1px solid ${props => props.theme.border};
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
  background-color: ${props => props.theme.card};
`;

const Logo = styled.div`
  font-size: 1.5rem;
  font-weight: 600;
  margin-bottom: 1.5rem;
  padding: 0.5rem;
  display: flex;
  align-items: center;
  gap: 0.5rem;
  color: ${props => props.theme.primary};
  cursor: pointer;
  transition: transform 0.2s ease;
  
  &:hover {
    transform: scale(1.05);
  }
  
  &::before {
    content: '💬';
    font-size: 1.8rem;
    color: ${props => props.theme.primary};
  }
`;

const LogoText = styled.span`
  color: ${props => props.theme.primary};
  font-weight: 700;
  letter-spacing: -0.5px;
`;

interface SidebarItemProps {
  $isActive?: boolean;
}

const SidebarItem = styled.div<SidebarItemProps>`
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.75rem 1rem;
  border-radius: 8px;
  cursor: pointer;
  transition: all 0.2s;
  color: ${props => props.theme.text};
  background-color: transparent;
  
  &:hover {
    background-color: ${props => props.theme.primaryHover};
    color: ${props => props.theme.text};
  }
`;

const MainContent = styled.div`
  flex: 1;
  display: flex;
  flex-direction: column;
  overflow: hidden;
  background-color: ${props => props.theme.background};
`;

const Header = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 1rem;
  background: ${props => props.theme.card};
  border-bottom: 1px solid ${props => props.theme.border};
  position: sticky;
  top: 0;
  z-index: 100;
`;

const HeaderLeft = styled.div`
  display: flex;
  align-items: center;
  gap: 0.5rem;
`;

const HeaderRight = styled.div`
  display: flex;
  align-items: center;
  gap: 0.5rem;
`;

const HeaderProfileCircle = styled.div`
  width: 40px;
  height: 40px;
  border-radius: 50%;
  background-color: ${props => props.theme.primary};
  color: white;
  display: flex;
  align-items: center;
  justify-content: center;
  font-weight: 600;
  flex-shrink: 0;
  margin-right: 1rem;
`;

const HeaderUserInfo = styled.div`
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
`;

const HeaderUserName = styled.div`
  font-weight: 600;
  color: ${props => props.theme.text};
  font-size: 1.1rem;
`;

const HeaderUserStatus = styled.div`
  color: ${props => props.theme.secondaryText};
  font-size: 0.9rem;
  opacity: 0.8;
  transition: opacity 0.2s;
`;

const HeaderWelcomeMessage = styled.div`
  font-size: 1rem;
  color: ${props => props.theme.secondaryText};
`;

const LogoutButton = styled.button`
  padding: 0.5rem 1rem;
  background-color: ${props => props.theme.danger};
  color: white;
  border: none;
  border-radius: 8px;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s;
  
  &:hover {
    background-color: ${props => props.theme.dangerHover};
  }
  
  &:focus {
    outline: none;
    box-shadow: 0 0 0 3px ${props => props.theme.focusRing};
  }
  
  &:active {
    transform: scale(0.98);
  }
`;

const Title = styled.h1`
  font-size: 1.5rem;
  color: #1d1d1f;
  margin: 0;
`;

const ChatContainer = styled.div`
  flex: 1;
  display: flex;
  flex-direction: column;
  padding: 1rem;
  height: calc(100vh - 5rem);
  overflow: hidden;
`;

const ChatHeader = styled.div`
  display: flex;
  align-items: center;
  gap: 1rem;
  padding: 1rem;
  background-color: white;
  border-bottom: 1px solid #e5e5e5;
  margin-bottom: 1rem;
  border-radius: 12px;
`;

const ChatProfileCircle = styled.div`
  width: 40px;
  height: 40px;
  border-radius: 50%;
  background-color: #007AFF;
  color: white;
  display: flex;
  align-items: center;
  justify-content: center;
  font-weight: 600;
  flex-shrink: 0;
`;

const ChatUserInfo = styled.div`
  display: flex;
  flex-direction: column;
`;

const ChatUserName = styled.div`
  font-weight: 600;
  color: #1d1d1f;
  font-size: 1.1rem;
`;

const ChatUserStatus = styled.div`
  color: #666;
  font-size: 0.9rem;
`;

const MessageThread = styled.div`
  flex: 1;
  overflow-y: auto;
  padding: 1rem;
  display: flex;
  flex-direction: column;
  gap: 1rem;
  margin-bottom: 120px;
  background-color: ${props => props.theme.background};
  scroll-behavior: smooth;
  
  &::-webkit-scrollbar {
    width: 6px;
  }

  &::-webkit-scrollbar-track {
    background: ${props => props.theme.card};
  }

  &::-webkit-scrollbar-thumb {
    background-color: ${props => props.theme.border};
    border-radius: 3px;
  }
`;

const MessageContainer = styled.div<{ $isCurrentUser: boolean }>`
  display: flex;
  justify-content: ${props => props.$isCurrentUser ? 'flex-end' : 'flex-start'};
  margin: 8px 0;
`;

const MessageBubble = styled.div<{ $isCurrentUser: boolean }>`
  max-width: 70%;
  padding: 0;
  border-radius: 12px;
  background-color: transparent;
  position: relative;
`;

const GifImage = styled.img`
  max-width: 100%;
  max-height: 300px;
  border-radius: 12px;
  cursor: pointer;
  object-fit: contain;
  display: block;
`;

const TimeStamp = styled.div<{ $isCurrentUser: boolean }>`
  font-size: 0.75rem;
  color: #666;
  margin-top: 4px;
  text-align: ${props => props.$isCurrentUser ? 'right' : 'left'};
  padding: 0 8px;
`;

const InputContainer = styled.div`
  display: flex;
  gap: 0.5rem;
  padding: 1rem;
  background-color: ${props => props.theme.card};
  border-radius: 12px;
  border: 1px solid ${props => props.theme.border};
  box-shadow: ${props => props.theme.shadow};
  position: fixed;
  bottom: 1rem;
  left: 300px;
  right: 1rem;
  z-index: 1;
`;

const SearchBarContainer = styled.div`
  display: flex;
  gap: 0.5rem;
  width: 100%;
`;

const SearchContainer = styled.div`
  position: relative;
  flex: 1;
  display: flex;
  flex-direction: column;
`;

const SearchInput = styled.input`
  width: 100%;
  padding: 0.75rem 1rem;
  border: 1px solid ${props => props.theme.border};
  border-radius: 8px;
  font-size: 1rem;
  background-color: ${props => props.theme.input};
  color: ${props => props.theme.text};
  transition: all 0.2s;
  
  &:focus {
    outline: none;
    border-color: ${props => props.theme.focus};
    box-shadow: 0 0 0 3px ${props => props.theme.focusRing};
  }
  
  &::placeholder {
    color: ${props => props.theme.placeholder};
  }
`;

const ButtonContainer = styled.div`
  display: flex;
  gap: 0.5rem;
`;

const SendButton = styled.button`
  padding: 0.75rem 1.5rem;
  background-color: ${props => props.theme.primary};
  color: white;
  border: none;
  border-radius: 12px;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s;
  white-space: nowrap;
  
  &:disabled {
    background-color: ${props => props.theme.secondary};
    cursor: not-allowed;
  }
`;

const SearchResults = styled.div`
  position: absolute;
  bottom: 100%;
  left: 0;
  width: 100%;
  background: white;
  border-radius: 12px;
  box-shadow: 0 -4px 24px rgba(0, 0, 0, 0.1);
  max-height: 220px;
  overflow-x: auto;
  overflow-y: hidden;
  margin-bottom: 1.5rem;
  border: 1px solid #e5e5e5;
  z-index: 10;
  padding: 1rem;
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
`;

const ResultsHeader = styled.div`
  padding: 0.5rem;
  font-weight: 600;
  color: #1d1d1f;
  white-space: nowrap;
`;

const GifsGrid = styled.div`
  display: flex;
  gap: 0.75rem;
  padding: 0.5rem;
  overflow-x: auto;
  scrollbar-width: thin;
  scrollbar-color: #e5e5e5 white;

  &::-webkit-scrollbar {
    height: 6px;
  }

  &::-webkit-scrollbar-track {
    background: white;
  }

  &::-webkit-scrollbar-thumb {
    background-color: #e5e5e5;
    border-radius: 3px;
  }
`;

const GifResult = styled.div`
  cursor: pointer;
  border-radius: 8px;
  overflow: hidden;
  aspect-ratio: 1;
  transition: transform 0.2s ease;
  
  &:hover {
    transform: scale(0.95);
  }
  
  img {
    width: 100%;
    height: 100%;
    object-fit: cover;
  }
`;

const SelectedGifPreview = styled.div`
  position: absolute;
  bottom: 100%;
  left: 0;
  width: min(280px, 100%);
  display: flex;
  justify-content: center;
  align-items: center;
  padding: 0.75rem;
  border: 1px solid #e5e5e5;
  border-radius: 16px;
  background-color: white;
  margin-bottom: 1.5rem;
  box-shadow: 0 -4px 24px rgba(0, 0, 0, 0.1);
  z-index: 10;

  @media (max-width: 768px) {
    width: 100%;
  }
  
  img {
    width: 100%;
    height: auto;
    border-radius: 12px;
    object-fit: contain;
  }
`;

const CloseButton = styled.button`
  background: none;
  border: none;
  width: 32px;
  height: 32px;
  border-radius: 50%;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.2s;
  color: #666;
  font-size: 1.5rem;
  padding: 0;

  &:hover {
    background-color: #f0f0f0;
    color: #1d1d1f;
    transform: scale(1.1);
  }

  &:active {
    transform: scale(0.95);
  }
`;

const TrendingButton = styled.button`
  padding: 0.75rem 1.5rem;
  background-color: ${props => props.theme.card};
  color: ${props => props.theme.text};
  border: 1px solid ${props => props.theme.border};
  border-radius: 12px;
  font-weight: 600;
  font-size: 0.95rem;
  cursor: pointer;
  transition: all 0.2s;
  white-space: nowrap;
  
  &:disabled {
    background-color: ${props => props.theme.secondary};
    color: ${props => props.theme.secondaryText};
    cursor: not-allowed;
  }
`;

const ModalOverlay = styled.div`
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background-color: rgba(0, 0, 0, 0.5);
  display: flex;
  justify-content: center;
  align-items: center;
  z-index: 1000;
  backdrop-filter: blur(5px);
  padding: 2rem;
`;

const ModalContent = styled.div`
  background-color: ${props => props.theme.modal};
  border-radius: 16px;
    width: 100%;
  max-width: 575px;
  max-height: 90vh;
  overflow-y: auto;
  box-shadow: ${props => props.theme.shadow};
  animation: modalSlideIn 0.3s ease-out;
  display: flex;
  flex-direction: column;

  @keyframes modalSlideIn {
    from {
      transform: translateY(-20px);
      opacity: 0;
    }
    to {
      transform: translateY(0);
      opacity: 1;
    }
  }
`;

const ModalHeader = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 1.5rem 2rem;
  border-bottom: 1px solid ${props => props.theme.border};
  background-color: ${props => props.theme.card};
  border-radius: 16px 16px 0 0;
  position: sticky;
  top: 0;
  z-index: 1;

  h2 {
    margin: 0;
    color: ${props => props.theme.text};
    font-size: 1.5rem;
  font-weight: 600;
  }
`;

const ModalBody = styled.div`
  padding: 2rem;
  display: flex;
  flex-direction: column;
  gap: 1.5rem;
  background-color: ${props => props.theme.modal};
`;

const ModalSection = styled.div`
  display: flex;
  flex-direction: column;
  gap: 1rem;
  padding: 1.5rem;
  background-color: ${props => props.theme.card};
  border-radius: 12px;
  margin-bottom: 1rem;
  border: 1px solid ${props => props.theme.border};
  box-shadow: ${props => props.theme.shadow};
`;

const ModalTitle = styled.h3`
  color: ${props => props.theme.text};
  font-size: 1.25rem;
  font-weight: 600;
  margin: 0 0 0.5rem 0;
`;

const ModalDescription = styled.p`
  color: ${props => props.theme.secondaryText};
  font-size: 1rem;
  line-height: 1.5;
  margin: 0 0 1rem 0;
`;

const ModalFooter = styled.div`
  padding: 1.5rem 2rem;
  border-top: 1px solid ${props => props.theme.border};
  background-color: ${props => props.theme.card};
  border-radius: 0 0 16px 16px;
  display: flex;
  justify-content: flex-end;
  gap: 1rem;
  position: sticky;
  bottom: 0;
`;

const ModalInput = styled.input`
    width: 100%;
  padding: 1rem 1.25rem;
  border: 1px solid ${props => props.theme.border};
  border-radius: 8px;
  font-size: 1rem;
  transition: all 0.2s;
  background-color: ${props => props.theme.input};
  color: ${props => props.theme.text};
  
  &:focus {
    outline: none;
    border-color: ${props => props.theme.focus};
    box-shadow: 0 0 0 3px ${props => props.theme.focusRing};
  }
  
  &::placeholder {
    color: ${props => props.theme.placeholder};
  }
`;

const ModalButton = styled.button`
  padding: 0.6rem 1.03rem;
  border-radius: 8px;
  border: none;
  background-color: ${props => props.theme.primary};
  color: white;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s;
  font-size: 0.8rem;
  min-width: 82px;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 0.34rem;

  &:hover {
    background-color: ${props => props.theme.primary}80;
  }

  &:focus {
    outline: none;
    box-shadow: 0 0 0 3px ${props => props.theme.focusRing};
  }

  &:active {
    transform: translateY(0);
  }

  &:disabled {
    background-color: ${props => props.theme.secondary};
    cursor: not-allowed;
    transform: none;
  }
`;

const SecondaryButton = styled(ModalButton)`
  background-color: transparent;
  color: ${props => props.theme.secondaryText};
  border: 1px solid ${props => props.theme.border};

  &:hover {
    background-color: ${props => props.theme.card};
    color: ${props => props.theme.text};
  }
`;

const DangerButton = styled(ModalButton)`
  background-color: ${props => props.theme.danger};
  
  &:hover {
    background-color: ${props => props.theme.dangerHover};
  }
`;

const LoadingMessage = styled.div`
  position: fixed;
  bottom: 120px;
  left: 300px;
  right: 20px;
  background: ${props => props.theme.card};
  border-radius: 12px;
  box-shadow: ${props => props.theme.shadow};
  padding: 3rem 2rem;
  color: ${props => props.theme.secondaryText};
  font-size: 1.1rem;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 1rem;
  z-index: 10;
`;

const EmptyState = styled.div`
  position: fixed;
  bottom: 120px;
  left: 300px;
  right: 20px;
  background: ${props => props.theme.card};
  border-radius: 12px;
  box-shadow: ${props => props.theme.shadow};
  padding: 3rem 2rem;
  color: ${props => props.theme.secondaryText};
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 1rem;
  z-index: 10;

  p {
  margin: 0;
  font-size: 1.1rem;
    line-height: 1.5;
  }
`;

interface FriendItemProps {
  $isSelected?: boolean;
}

const FriendItem = styled.div<FriendItemProps>`
  display: flex;
  align-items: center;
  padding: 1rem 1.25rem;
  border-radius: 8px;
  background-color: ${props => props.$isSelected ? props.theme.primaryHover : props.theme.card};
  margin-bottom: 0.75rem;
  transition: all 0.2s;
  cursor: pointer;
  border: 1px solid ${props => props.theme.border};
  color: ${props => props.$isSelected ? 'white' : props.theme.text};

  &:hover {
    background-color: ${props => props.theme.primaryHover};
    transform: translateX(4px);
    color: white;
  }

  &:last-child {
    margin-bottom: 0;
  }
`;

const FriendInfo = styled.div`
  flex: 1;
  padding-right: 1rem;
`;

const FriendName = styled.div`
  font-weight: 600;
  color: ${props => props.theme.text};
  margin-bottom: 0.25rem;
  font-size: 1.1rem;
`;

const FriendEmail = styled.div`
  font-size: 0.95rem;
  color: ${props => props.theme.secondaryText};
  line-height: 1.4;
`;

const FriendActions = styled.div`
  display: flex;
  gap: 0.75rem;
`;

const SectionTitle = styled.p`
  color: ${props => props.theme.secondaryText};
  font-size: 0.9rem;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.5px;
  margin: 1.5rem 0 0.75rem;
  padding: 0 0.5rem;
`;

const DangerZone = styled(ModalSection)`
  background-color: ${props => props.theme.danger}15;
  border: 1px solid ${props => props.theme.danger}30;
`;

const DangerTitle = styled(ModalTitle)`
  color: ${props => props.theme.danger};
`;

const OnboardingContainer = styled.div`
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 2rem;
  text-align: center;
  background-color: ${props => props.theme.card};
  border-radius: 12px;
  margin: 2rem;
  border: 1px solid ${props => props.theme.border};
  box-shadow: ${props => props.theme.shadow};
`;

const WelcomeIllustration = styled.div`
  width: 200px;
  height: 200px;
  margin-bottom: 2rem;
  background-color: ${props => props.theme.primary};
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  color: white;
  font-size: 4rem;
  box-shadow: ${props => props.theme.shadow};
`;

const WelcomeTitle = styled.h1`
  font-size: 2rem;
  color: ${props => props.theme.text};
  margin-bottom: 1rem;
  font-weight: 600;
`;

const WelcomeMessage = styled.p`
  font-size: 1.1rem;
  color: ${props => props.theme.secondaryText};
  margin-bottom: 2rem;
  max-width: 400px;
  line-height: 1.5;
`;

const StartChatButton = styled(ModalButton)`
  padding: 1rem 2rem;
  font-size: 1.1rem;
  min-width: 200px;
  background-color: ${props => props.theme.primary};
  color: white;
  
  &:hover {
    background-color: ${props => props.theme.primary}80;
  }
`;

const FriendsList = styled.div`
  display: flex;
  flex-direction: column;
  gap: 1rem;
  margin: 1rem 0;
  max-height: 400px;
  overflow-y: auto;
  padding-right: 1rem;

  &::-webkit-scrollbar {
    width: 6px;
  }

  &::-webkit-scrollbar-track {
    background: #f0f0f0;
    border-radius: 3px;
  }

  &::-webkit-scrollbar-thumb {
    background: #ddd;
    border-radius: 3px;
  }
`;

const FriendAvatar = styled.div`
  width: 40px;
  height: 40px;
  border-radius: 50%;
  background-color: #007AFF;
  color: white;
  display: flex;
  align-items: center;
  justify-content: center;
  font-weight: 600;
  margin-right: 1rem;
  flex-shrink: 0;
`;

const EditButton = styled.button`
  background: none;
  border: none;
  color: #007AFF;
  cursor: pointer;
  font-size: 0.9rem;
  padding: 0.5rem;
  margin-left: 0.5rem;
  transition: color 0.2s;
  
  &:hover {
    color: #0056b3;
  }
`;

const BaseButton = styled.button`
  border: none;
  border-radius: 4px;
  cursor: pointer;
  font-weight: 500;
  transition: background-color 0.2s;
`;

const RequestAvatar = styled.div`
  width: 40px;
  height: 40px;
  border-radius: 50%;
  background-color: ${props => props.theme.primary};
  color: white;
  display: flex;
  align-items: center;
  justify-content: center;
  font-weight: 600;
  margin-right: 12px;
  flex-shrink: 0;
`;

const RequestStatus = styled.span`
  font-size: 0.75rem;
  color: ${props => props.theme.secondaryText};
  margin-top: 0.25rem;
  font-style: italic;
`;

const AcceptButton = styled.button`
  background-color: ${props => props.theme.success};
  color: white;
  padding: 0.46rem 0.91rem;
  border: none;
  border-radius: 4px;
  cursor: pointer;
  font-weight: 500;
  transition: all 0.2s;
  font-size: 0.8rem;
  
  &:hover {
    background-color: ${props => props.theme.successHover};
  }
`;

const RejectButton = styled.button`
  background-color: ${props => props.theme.danger};
  color: white;
  padding: 0.46rem 0.91rem;
  border: none;
  border-radius: 4px;
  cursor: pointer;
  font-weight: 500;
  transition: all 0.2s;
  font-size: 0.8rem;
  
  &:hover {
    background-color: ${props => props.theme.dangerHover};
  }
`;

const FriendRequestItem = styled.div`
  display: flex;
  align-items: center;
  padding: 12px 16px;
  border-bottom: 1px solid ${props => props.theme.border};
  background-color: ${props => props.theme.card};
  transition: all 0.2s;
  border-radius: 8px;
  margin-bottom: 8px;

  &:hover {
    background-color: ${props => props.theme.primaryHover};
    transform: translateX(4px);
    color: white;
  }
`;

const RequestInfo = styled.div`
  display: flex;
  flex-direction: column;
  gap: 4px;
  flex: 1;
`;

const RequestName = styled.span`
  font-weight: 500;
  color: ${props => props.theme.text};
  font-size: 1rem;
`;

const RequestEmail = styled.span`
  font-size: 0.875rem;
  color: ${props => props.theme.secondaryText};
`;

const RequestActions = styled.div`
  display: flex;
  gap: 8px;
  margin-left: auto;
`;

const SearchResultItem = styled.div`
  display: flex;
  align-items: center;
  padding: 12px 16px;
  border-bottom: 1px solid ${props => props.theme.border};
  background-color: ${props => props.theme.card};
  transition: all 0.2s;
  border-radius: 8px;
  margin-bottom: 8px;

  &:hover {
    background-color: ${props => props.theme.primaryHover};
    transform: translateX(4px);
    color: white;
  }
`;

const SearchResultInfo = styled.div`
  display: flex;
  flex-direction: column;
  gap: 4px;
  flex: 1;
`;

const SearchResultName = styled.span`
  font-weight: 500;
  color: ${props => props.theme.text};
`;

const SearchResultEmail = styled.span`
  font-size: 0.875rem;
  color: ${props => props.theme.secondaryText};
`;

const SearchResultActions = styled.div`
  display: flex;
  gap: 8px;
`;

const IconButton = styled.button`
  background: none;
  border: none;
  width: 32px;
  height: 32px;
  border-radius: 50%;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.2s;
  color: #666;
  font-size: 16px;
  margin: 0 4px;
  
  &:hover {
    background-color: #f0f0f0;
    color: #1d1d1f;
    transform: scale(1.1);
  }

  &:active {
    transform: scale(0.95);
  }
`;

interface RecentChatItemProps {
  $isActive?: boolean;
}

const RecentChatItem = styled.div<RecentChatItemProps>`
  display: flex;
  align-items: center;
  gap: 0.75rem;
  padding: 0.75rem 1rem;
  border-radius: 8px;
  cursor: pointer;
  transition: all 0.2s;
  color: ${props => props.theme.text};
  background-color: transparent;
  border: 1px solid ${props => props.$isActive ? props.theme.border : 'transparent'};
  
  &:hover {
    background-color: ${props => props.theme.primaryHover};
    transform: translateX(4px);
    color: ${props => props.theme.text};
  }

  &:not(:last-child) {
    margin-bottom: 0.5rem;
  }
`;

const RecentChatAvatar = styled.div`
  width: 40px;
  height: 40px;
  border-radius: 50%;
  background-color: ${props => props.theme.primary};
  color: white;
  display: flex;
  align-items: center;
  justify-content: center;
  font-weight: 600;
  flex-shrink: 0;
  font-size: 1.1rem;
`;

const RecentChatInfo = styled.div`
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
`;

const RecentChatName = styled.div`
  font-weight: 600;
  color: ${props => props.theme.text};
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  font-size: 0.95rem;
`;

const RecentChatPreview = styled.div`
  font-size: 0.85rem;
  color: ${props => props.theme.secondaryText};
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  opacity: 0.8;
`;

const GifSearchContainer = styled.div`
  position: relative;
  flex: 1;
`;

const GifSearchInput = styled.input`
  width: 100%;
  padding: 0.75rem 1rem;
  border: 1px solid ${props => props.theme.border};
  border-radius: 8px;
  font-size: 1rem;
  margin-bottom: 1rem;
  background-color: ${props => props.theme.input};
  color: ${props => props.theme.text};
  transition: all 0.2s;
  
  &:focus {
    outline: none;
    border-color: ${props => props.theme.focus};
    box-shadow: 0 0 0 3px ${props => props.theme.focusRing};
  }
  
  &::placeholder {
    color: ${props => props.theme.placeholder};
  }
`;

const GifResultsContainer = styled.div`
  position: fixed;
  bottom: 120px;
  left: 300px;
  width: 400px;
  background: ${props => props.theme.card};
  border-radius: 12px;
  box-shadow: ${props => props.theme.shadow};
  max-height: 350px;
  overflow-y: auto;
  z-index: 10;
  border: 1px solid ${props => props.theme.border};
`;

const GifResultsHeader = styled.div`
  padding: 1rem;
  border-bottom: 1px solid ${props => props.theme.border};
  font-weight: 600;
  color: ${props => props.theme.text};
  display: flex;
  justify-content: space-between;
  align-items: center;
`;

const GifResultsGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 0.75rem;
  padding: 1rem;
  background-color: ${props => props.theme.card};
`;

const GifPreviewContainer = styled.div`
  position: fixed;
  bottom: 120px;
  left: 300px;
  width: 400px;
  background: ${props => props.theme.card};
  border-radius: 12px;
  box-shadow: ${props => props.theme.shadow};
  z-index: 10;
  padding: 1rem;
  border: 1px solid ${props => props.theme.border};
`;

const GifPreview = styled.div`
  width: 100%;
  height: 200px;
  border-radius: 8px;
  overflow: hidden;
  position: relative;
  background-color: ${props => props.theme.background};
  
  img {
    width: 100%;
    height: 100%;
    object-fit: contain;
    display: block;
    border-radius: 8px;
  }
`;

const PreviewHeader = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 0.5rem;
  
  span {
    font-weight: 600;
    color: ${props => props.theme.text};
  }
`;

const DeleteButton = styled(CloseButton)`
  position: absolute;
  top: 4px;
  right: 4px;
  background: ${props => props.theme.danger}80;
  color: white;
  width: 24px;
  height: 24px;
  font-size: 1rem;

  &:hover {
    background: ${props => props.theme.danger};
    color: white;
  }
`;

interface ModalProps {
  onClose: () => void;
  children: React.ReactNode;
}

const Modal: React.FC<ModalProps> = ({ onClose, children }) => {
  return (
    <ModalOverlay onClick={onClose}>
      <ModalContent onClick={(e: MouseEvent) => e.stopPropagation()}>
        {children}
      </ModalContent>
    </ModalOverlay>
  );
};

// Add new styled component for error messages
const ErrorMessage = styled.div`
  background-color: #ffebee;
  color: #d32f2f;
  padding: 1rem;
  border-radius: 8px;
  margin: 1rem 0;
  display: flex;
  align-items: center;
  gap: 0.5rem;
  font-size: 0.9rem;

  &::before {
    content: '⚠️';
  }
`;

const RecentChatActions = styled.div`
  display: flex;
  align-items: center;
  gap: 0.5rem;
  margin-left: auto;
`;

// Add this near the top of the file
const isBrowser = typeof window !== 'undefined';

const ChatScreen: React.FC = () => {
  const {
    user,
    currentChat,
    messages,
    friends,
    friendRequests,
    setFriendRequests,
    isLoadingFriends,
    error: contextError,
    sendNewMessage,
    setCurrentChat,
    handleSendFriendRequest,
    handleAcceptRequest,
    handleRejectRequest,
    handleRemoveFriend,
    loadFriendsData: loadFriends,
    createNewChat,
    loadRecentChats,
    signOut,
    recentChats,
    setRecentChats,
    setUser,
    deleteUserAccount
  } = useApp();

  const [messageInput, setMessageInput] = useState('');
  const [showGifModal, setShowGifModal] = useState(false);
  const [showFriendsModal, setShowFriendsModal] = useState(false);
  const [showNewChatModal, setShowNewChatModal] = useState(false);
  const [selectedFriend, setSelectedFriend] = useState<string | null>(null);
  const [showProfileModal, setShowProfileModal] = useState(false);
  const [showSettingsModal, setShowSettingsModal] = useState(false);
  const [showDeactivateConfirm, setShowDeactivateConfirm] = useState(false);
  const [isEditingName, setIsEditingName] = useState(false);
  const [editedName, setEditedName] = useState(user?.fullName || '');
  const [activeTab, setActiveTab] = useState<string>(() => {
    const savedTab = localStorage.getItem(`activeTab_${user?.id}`);
    return savedTab || 'chat';
  });

  const [selectedGif, setSelectedGif] = useState<GiphyGif | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [searchResults, setSearchResults] = useState<User[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const messageThreadRef = useRef<HTMLDivElement>(null);
  const [gifSearchTerm, setGifSearchTerm] = useState('');
  const [gifResults, setGifResults] = useState<GiphyGif[]>([]);
  const [isSearchingGifs, setIsSearchingGifs] = useState(false);
  const [trendingGifs, setTrendingGifs] = useState<GiphyGif[]>([]);
  const [isLoadingTrending, setIsLoadingTrending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [openedChats, setOpenedChats] = useState<Set<string>>(() => {
    const saved = localStorage.getItem(`openedChats_${user?.id}`);
    return saved ? new Set(JSON.parse(saved)) : new Set();
  });

  const [lastMessageTimestamps, setLastMessageTimestamps] = useState<Record<string, number>>(() => {
    const saved = localStorage.getItem(`lastMessageTimestamps_${user?.id}`);
    return saved ? JSON.parse(saved) : {};
  });

  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [theme, setTheme] = useState<'light' | 'dark'>(() => {
    const savedTheme = localStorage.getItem('theme');
    return (savedTheme as 'light' | 'dark') || 'light';
  });

  const [onlineStatus, setOnlineStatus] = useState<Record<string, boolean>>({});
  const statusUnsubscribers = useRef<Record<string, () => void>>({});
  const refreshInterval = useRef<NodeJS.Timeout>();
  const isMounted = useRef(true);
  const lastStatusUpdate = useRef<Record<string, number>>({});
  const statusDebounceTime = 5000; // Increased to 5 seconds
  const statusUpdateQueue = useRef<Record<string, boolean>>({});

  // Update localStorage whenever lastSeen changes
  useEffect(() => {
    if (user?.id) {
      localStorage.setItem(`lastSeen_${user.id}`, JSON.stringify({}));
    }
  }, [user?.id]);

  // Update localStorage whenever activeTab changes
  useEffect(() => {
    if (user?.id) {
      localStorage.setItem(`activeTab_${user.id}`, activeTab);
    }
  }, [activeTab, user?.id]);

  // Update localStorage whenever lastMessageTimestamps changes
  useEffect(() => {
    if (user?.id) {
      localStorage.setItem(`lastMessageTimestamps_${user.id}`, JSON.stringify(lastMessageTimestamps));
    }
  }, [lastMessageTimestamps, user?.id]);

  // Update theme in localStorage when it changes
  useEffect(() => {
    localStorage.setItem('theme', theme);
  }, [theme]);

  // Optimize online status updates
  const updateOnlineStatus = useCallback(async (friendId: string) => {
    try {
      const isOnline = await checkUserOnlineStatus(friendId);
      if (isMounted.current) {
        setOnlineStatus(prev => ({
          ...prev,
          [friendId]: isOnline
        }));
      }
    } catch (error) {
      console.error('Error checking online status:', error);
    }
  }, [checkUserOnlineStatus]);

  // Update the useEffect for online status
  useEffect(() => {
    isMounted.current = true;

    if (user?.id) {
      // Set current user as online
      updateUserOnlineStatus(user.id, true);

      // Initial status check for all friends
      const checkInitialStatus = async () => {
        const statusUpdates: Record<string, boolean> = {};
        
        for (const friend of friends) {
          try {
            const isOnline = await checkUserOnlineStatus(friend.id);
            if (isMounted.current) {
              statusUpdates[friend.id] = isOnline;
            }
          } catch (error) {
            console.error('Error checking online status:', error);
          }
        }
        
        if (isMounted.current && Object.keys(statusUpdates).length > 0) {
          setOnlineStatus(prev => ({
            ...prev,
            ...statusUpdates
          }));
        }
      };

      checkInitialStatus();

      // Set up cleanup for when component unmounts
      return () => {
        isMounted.current = false;
        updateUserOnlineStatus(user.id, false);
      };
    }
  }, [user?.id]); // Remove friends from dependencies

  // Optimize the processQueue function
  const processQueue = useCallback(() => {
    if (Object.keys(statusUpdateQueue.current).length > 0) {
      setOnlineStatus(prev => ({
        ...prev,
        ...statusUpdateQueue.current
      }));
      statusUpdateQueue.current = {};
    }
  }, []);

  // Update the useEffect for processing queue
  useEffect(() => {
    const queueInterval = setInterval(processQueue, statusDebounceTime);
    return () => clearInterval(queueInterval);
  }, []); // Remove dependencies since processQueue is stable

  const handleTabClick = (tab: string) => {
    setActiveTab(tab);
    switch (tab) {
      case 'new-chat':
        setShowNewChatModal(true);
        break;
      case 'profile':
        setShowProfileModal(true);
        break;
      case 'friends':
        setShowFriendsModal(true);
        break;
      case 'settings':
        setShowSettingsModal(true);
        break;
      default:
        break;
    }
  };

  // Update the useEffect for messages
  useEffect(() => {
    if (isBrowser && messageThreadRef.current && currentChat) {
      messageThreadRef.current.scrollTop = messageThreadRef.current.scrollHeight;
    }
  }, [messages, currentChat]);

  useEffect(() => {
    if (user) {
      loadFriends();
    }
  }, [user, loadFriends]);

  // Move handleNewMessage outside of useEffect
  const handleNewMessage = useCallback((newMessage: Message) => {
    if (!newMessage || !newMessage.chatId) return;
    
    // Only update lastMessageTimestamps if the message is from a friend
    if (newMessage.senderId !== user?.id) {
      setLastMessageTimestamps(prev => ({
        ...prev,
        [newMessage.chatId]: Date.now()
      }));
    }
  }, [user?.id]);

  // Update the useEffect for messages
  useEffect(() => {
    if (!isBrowser) return;

    const messageListener = (snapshot: any) => {
      try {
        const newMessage = snapshot.val();
        handleNewMessage(newMessage);
      } catch (error) {
        console.error('Error handling new message:', error);
      }
    };

    const messageRef = ref(db, 'messages');
    onValue(messageRef, messageListener);

    return () => {
      try {
        off(messageRef, 'value', messageListener);
      } catch (error) {
        console.error('Error cleaning up message listener:', error);
      }
    };
  }, []); // Remove handleNewMessage from dependencies

  // Move handleNewGifMessage outside of useEffect
  const handleNewGifMessage = useCallback((newMessage: Message) => {
    if (!newMessage || !newMessage.chatId) return;
    
    // Only update lastMessageTimestamps if the message is from a friend and is a GIF
    if (newMessage.senderId !== user?.id && newMessage.type === 'gif') {
      setLastMessageTimestamps(prev => ({
        ...prev,
        [newMessage.chatId]: Date.now()
      }));
    }
  }, [user?.id]);

  // Update the useEffect for GIF messages
  useEffect(() => {
    if (!isBrowser) return;

    const messageListener = (snapshot: any) => {
      try {
        const newMessage = snapshot.val();
        handleNewGifMessage(newMessage);
      } catch (error) {
        console.error('Error handling new message:', error);
      }
    };

    const messageRef = ref(db, 'messages');
    onValue(messageRef, messageListener);

    return () => {
      try {
        off(messageRef, 'value', messageListener);
      } catch (error) {
        console.error('Error cleaning up message listener:', error);
      }
    };
  }, []); // Remove handleNewGifMessage from dependencies

  const handleSelectGif = useCallback((gif: GiphyGif) => {
    setSelectedGif(gif);
    setGifResults([]);
    setTrendingGifs([]);
  }, []);

  const handleSendGif = useCallback(async () => {
    if (selectedGif && user && currentChat) {
      try {
        setError(null);
        await sendNewMessage(selectedGif.images.fixed_height.url, 'gif');
        setSelectedGif(null);
        setGifResults([]);
        setTrendingGifs([]);
        setGifSearchTerm('');
      } catch (error) {
        console.error('Error sending GIF:', error);
        setError(error instanceof Error ? error.message : 'Failed to send GIF');
      }
    }
  }, [selectedGif, user, currentChat, sendNewMessage]);

  const handleCancelPreview = useCallback(() => {
    setSelectedGif(null);
    setGifResults([]);
    setTrendingGifs([]);
  }, []);

  const handleSearchFocus = () => {
    if (gifSearchTerm.trim()) {
      handleGifSearch(gifSearchTerm);
    }
  };

  const handleSendMessage = async () => {
    if (messageInput.trim() && user && currentChat) {
      try {
        setError(null);
        await sendNewMessage(messageInput);
        setMessageInput('');
        
        // Update last message timestamp for this chat
        setLastMessageTimestamps((prev: Record<string, number>) => ({
          ...prev,
          [currentChat.id]: Date.now()
        }));
        
        // Update opened chats
        setOpenedChats((prev: Set<string>) => {
          const newSet = new Set(prev);
          newSet.add(currentChat.id);
          return newSet;
        });
      } catch (error) {
        console.error('Error sending message:', error);
        setError(error instanceof Error ? error.message : 'Failed to send message');
      }
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      if (selectedGif) {
        handleSendGif();
      }
    }
  };

  const handleNewChat = async () => {
    if (!selectedFriend || !user) return;

    try {
      setError(null);
      
      // Check if a chat already exists with this friend
      const existingChat = recentChats.find(chat => 
        chat.participants.includes(selectedFriend) && 
        chat.participants.includes(user?.id || '')
      );

      if (existingChat) {
        // If chat exists, just set it as current chat
        setCurrentChat(existingChat);
        setShowNewChatModal(false);
        setShowFriendsModal(false);
        setSelectedFriend(null);
        return;
      }

      // If no existing chat, create a new one
      const newChat = await createNewChat([selectedFriend]);
      
      if (newChat) {
        setCurrentChat(newChat);
        setShowNewChatModal(false);
        setShowFriendsModal(false);
        setSelectedFriend(null);
        await loadRecentChats();
      }
    } catch (error) {
      console.error('Error creating chat:', error);
      setError(error instanceof Error ? error.message : 'Failed to create chat');
    }
  };

  const handleEditName = async () => {
    if (editedName.trim() && editedName !== user?.fullName) {
      try {
        // Update the name in the database
        const userRef = ref(db, `users/${user?.id}`);
        await update(userRef, {
          fullName: editedName
        });
        
        // Update the local state
        if (user) {
          setUser({
            ...user,
            fullName: editedName
          });
        }
        setIsEditingName(false);
        
        // Update the welcome message in the header
        const headerWelcomeMessage = document.querySelector('.header-welcome-message');
        if (headerWelcomeMessage) {
          headerWelcomeMessage.textContent = `Welcome, ${editedName}!`;
        }
      } catch (error) {
        console.error('Error updating name:', error);
        setError('Failed to update name. Please try again.');
      }
    }
  };

  const handleDeactivateAccount = async () => {
    try {
      await deleteUserAccount();
      setShowDeactivateConfirm(false);
    } catch (error) {
      console.error('Error deactivating account:', error);
      setError('Failed to deactivate account. Please try again.');
    }
  };

  const onAcceptRequest = async (requestId: string) => {
    try {
      await handleAcceptRequest(requestId);
      // Reload both friend requests and friends list
      await loadFriends();
      // Show success message
      console.log('Friend request accepted successfully');
    } catch (error) {
      console.error('Error accepting friend request:', error);
    }
  };

  const onRejectRequest = async (requestId: string) => {
    try {
      await handleRejectRequest(requestId);
      // Reload friend requests
      await loadFriends();
      // Show success message
      console.log('Friend request rejected successfully');
    } catch (error) {
      console.error('Error rejecting friend request:', error);
    }
  };

  const onDeleteRequest = async (requestId: string) => {
    try {
      // Get all friend requests
      const requestsRef = ref(db, 'friendRequests');
      const snapshot = await get(requestsRef);
      const requestsData = snapshot.val() || {};

      // Find the request that matches the current request ID
      const request = requestsData[requestId];
      if (!request) {
        console.error('Friend request not found in database');
        // Remove from local state anyway
        const updatedRequests = friendRequests.filter(req => req.id !== requestId);
        setFriendRequests(updatedRequests);
        return;
      }

      // Create a batch operation to delete the request from all locations
      const updates: Record<string, null> = {
        [`friendRequests/${requestId}`]: null,
        [`users/${request.senderId}/sentRequests/${requestId}`]: null,
        [`users/${request.receiverId}/receivedRequests/${requestId}`]: null
      };

      // Update the database in a single batch operation
      await update(ref(db), updates);

      // Update local state
      const updatedRequests = friendRequests.filter(req => req.id !== requestId);
      setFriendRequests(updatedRequests);

      // Reload friends data to ensure everything is in sync
      await loadFriends();

      console.log('Friend request deleted successfully');
    } catch (error) {
      console.error('Error deleting friend request:', error);
      setError('Failed to delete friend request');
    }
  };

  const onRemoveFriend = async (friendId: string) => {
    if (!user) return;
    
    try {
      await handleRemoveFriend(friendId);
      await loadFriends();
    } catch (error) {
      console.error('Error removing friend:', error);
    }
  };

  const onSendFriendRequest = async (userId: string) => {
    if (!user) return;
    
    try {
      // Check if request already exists (either sent or received)
      const existingRequest = friendRequests.find(
        request => 
          // Check if user has already sent a request
          (request.senderId === user.id && request.status === 'pending') ||
          // Check if user has already received a request from this user
          (request.receiverId === user.id && request.senderId === userId && request.status === 'pending')
      );
      
      if (existingRequest) {
        console.log('Friend request already exists');
        return;
      }

      // Send the friend request using the context function
      await handleSendFriendRequest(userId);
      
      // Update the UI
      await loadFriends();
      setSearchResults(searchResults.filter(result => result.id !== userId));
      
      console.log('Friend request sent successfully');
    } catch (error) {
      console.error('Error sending friend request:', error);
    }
  };

  const debouncedSearch = useCallback(
    debounce(async (term: string) => {
      if (term.trim()) {
        setIsSearching(true);
        try {
          const results = await searchUsers(term);
          const filteredResults = results.filter(
            result => result.id !== user?.id && 
            !friends.some(friend => friend.id === result.id)
          );
          setSearchResults(filteredResults);
        } catch (error) {
          console.error('Error searching users:', error);
        } finally {
          setIsSearching(false);
        }
      } else {
        setSearchResults([]);
      }
    }, 300),
    [user?.id, friends]
  );

  const handleSearch = (term: string) => {
    setSearchTerm(term);
    debouncedSearch(term);
  };

  const handleGifSearch = useCallback(async (term: string) => {
    setGifSearchTerm(term);
    if (term.trim()) {
      setIsSearchingGifs(true);
      try {
        const results = await searchGifs(term);
        setGifResults(results);
      } catch (error) {
        console.error('Error searching GIFs:', error);
      } finally {
        setIsSearchingGifs(false);
      }
    }
  }, []);

  const handleLoadTrending = useCallback(async () => {
    try {
      setIsLoadingTrending(true);
      const trending = await getTrendingGifs();
      setTrendingGifs(trending);
    } catch (error) {
      console.error('Error loading trending GIFs:', error);
    } finally {
      setIsLoadingTrending(false);
    }
  }, []);

  const renderMessage = (message: Message) => {
    const isCurrentUser = message.senderId === user?.id;
    const timeString = new Date(message.timestamp).toLocaleTimeString([], { 
      hour: '2-digit', 
      minute: '2-digit' 
    });
    
    return (
      <MessageContainer key={message.id} $isCurrentUser={isCurrentUser}>
        <MessageBubble $isCurrentUser={isCurrentUser}>
          <GifImage 
            src={message.content} 
            alt="GIF" 
            onClick={() => window.open(message.content, '_blank')}
          />
          <TimeStamp $isCurrentUser={isCurrentUser}>
            {timeString}
          </TimeStamp>
        </MessageBubble>
      </MessageContainer>
    );
  };

  const onDeleteChat = async (chatId: string) => {
    try {
      // Only delete if explicitly requested
      if (!chatId) return;

      // Remove chat from database
      const chatRef = ref(db, `chats/${chatId}`);
      await remove(chatRef);

      // Update local state
      setRecentChats(recentChats.filter((chat: Chat) => chat.id !== chatId));
      
      // If the deleted chat was the current chat, clear it
      if (currentChat?.id === chatId) {
        setCurrentChat(null);
      }
      
      console.log('Chat deleted successfully');
    } catch (error) {
      console.error('Error deleting chat:', error);
      setError('Failed to delete chat. Please try again.');
    }
  };

  // Clear alert and update last seen when chat is opened
  const handleChatClick = useCallback(async (chat: Chat) => {
    if (currentChat?.id === chat.id) return;
    
    setCurrentChat(chat);
    setActiveTab('chat');
    
    // Batch state updates
    setOpenedChats(prev => {
      const newSet = new Set(prev);
      newSet.add(chat.id);
      return newSet;
    });
    
    setLastMessageTimestamps(prev => ({
      ...prev,
      [chat.id]: Date.now()
    }));
    
    // Update online status for participants
    const otherParticipants = chat.participants
      .filter(id => id !== user?.id)
      .map(id => friends.find(f => f.id === id))
      .filter(Boolean) as User[];

    for (const participant of otherParticipants) {
      try {
        const isOnline = await checkUserOnlineStatus(participant.id);
        if (isMounted.current) {
          setOnlineStatus(prev => ({
            ...prev,
            [participant.id]: isOnline
          }));
        }
      } catch (error) {
        console.error('Error checking online status:', error);
      }
    }
    
    // Scroll to last message after messages are loaded
    setTimeout(() => {
      if (messageThreadRef.current) {
        messageThreadRef.current.scrollTop = messageThreadRef.current.scrollHeight;
      }
    }, 100);
  }, [currentChat?.id, user?.id, friends, checkUserOnlineStatus]);

  const handleThemeChange = (newTheme: 'light' | 'dark') => {
    setTheme(newTheme);
  };

  const getOnlineStatus = (userId: string) => {
    return onlineStatus[userId] ? 'Online' : 'Offline';
  };

  // Update the HeaderUserStatus component usage
  const renderHeaderUserStatus = (): React.ReactNode => {
    if (!currentChat) return null;
    
    const otherParticipants = currentChat.participants
      .filter((id: string) => id !== user?.id)
      .map((id: string) => friends.find(f => f.id === id))
      .filter(Boolean) as User[];
    
    if (otherParticipants.length === 0) return null;
    
    const participantId = otherParticipants[0].id;
    const isOnline = onlineStatus[participantId];
    
    return (
      <HeaderUserStatus>
        {isOnline ? 'Online' : 'Offline'}
      </HeaderUserStatus>
    );
  };

  const handleLogoClick = () => {
    setCurrentChat(null);
    setActiveTab('chat');
  };

  // Fix the useEffect for recent chats
  useEffect(() => {
    // Initial load of recent chats
    if (user) {
      loadRecentChats();
    }

    // Set up interval to refresh recent chats every 1.5 seconds
    const refreshInterval = setInterval(() => {
      if (user) {
        loadRecentChats();
      }
    }, 1500);

    // Cleanup interval on unmount
    return () => {
      clearInterval(refreshInterval);
    };
  }, [user?.id]); // Only depend on user.id

  return (
    <ThemeProvider theme={theme === 'light' ? lightTheme : darkTheme}>
    <Container>
        <Sidebar className={isSidebarOpen ? 'open' : ''}>
          <SidebarHeader>
            <Logo onClick={handleLogoClick}>
              <LogoText>ChatGifs</LogoText>
            </Logo>
            <SidebarItem
              $isActive={activeTab === 'new-chat'}
              onClick={() => handleTabClick('new-chat')}
            >
        ➕ New Chat
        </SidebarItem>
          </SidebarHeader>

          <SidebarContent>
            {recentChats.length > 0 && (
              <>
                <SectionTitle>Recent Chats</SectionTitle>
                <RecentChatsContainer>
                  {recentChats.map((chat) => {
                    // Find the other participant(s) in the chat
                    const otherParticipants = chat.participants
                      .filter((id: string) => id !== user?.id)
                      .map((id: string) => friends.find(f => f.id === id))
                      .filter(Boolean);
                    
                    // Get the display name for the chat
                    const chatName = otherParticipants.length > 0
                      ? (otherParticipants as User[]).map(p => p?.fullName || user?.fullName || 'Unknown User').join(', ')
                      : user?.fullName || 'Unknown User';
                    
                    // Get the avatar letter(s)
                    const avatarLetters = otherParticipants.length > 0
                      ? otherParticipants[0]?.fullName?.charAt(0) || user?.fullName?.charAt(0) || '?'
                      : user?.fullName?.charAt(0) || '?';
                    
                    return (
                      <RecentChatItem
                        key={chat.id}
                        $isActive={currentChat?.id === chat.id}
                        onClick={() => handleChatClick(chat)}
                      >
                        <RecentChatAvatar>
                          {avatarLetters}
                        </RecentChatAvatar>
                        <RecentChatInfo>
                          <RecentChatName>
                            {chatName}
                          </RecentChatName>
                          <RecentChatPreview>
                            {(() => {
                              try {
                                const lastMessageTime = lastMessageTimestamps[chat.id] || 0;
                                const lastOpenedTime = openedChats.has(chat.id) ? lastMessageTime : 0;
                                const hasNewGif = !openedChats.has(chat.id) || messages.some(
                                  m => m.chatId === chat.id && 
                                  m.timestamp > lastOpenedTime && 
                                  m.type === 'gif' &&
                                  m.senderId !== user?.id
                                );
                                return hasNewGif ? 'New ChatGif' : 'ChatGif';
                              } catch (error) {
                                console.error('Error rendering RecentChatPreview:', error);
                                return 'ChatGif';
                              }
                            })()}
                          </RecentChatPreview>
                        </RecentChatInfo>
                        <RecentChatActions>
                          <IconButton
                            onClick={(e) => {
                              e.stopPropagation();
                              onDeleteChat(chat.id);
                            }}
                            title="Delete Chat"
                          >
                            🗑️
                          </IconButton>
                        </RecentChatActions>
                      </RecentChatItem>
                    );
                  })}
                </RecentChatsContainer>
              </>
            )}
          </SidebarContent>

          <SidebarFooter>
            <SidebarItem
              $isActive={activeTab === 'profile'}
              onClick={() => handleTabClick('profile')}
            >
              🧑🏽‍🦱 My Profile
        </SidebarItem>
            <SidebarItem
              $isActive={activeTab === 'friends'}
              onClick={() => handleTabClick('friends')}
            >
              👤 Friends {friendRequests.length > 0 && `(${friendRequests.length})`}
        </SidebarItem>
            <SidebarItem
              $isActive={activeTab === 'settings'}
              onClick={() => handleTabClick('settings')}
            >
         ⚙️ Settings
        </SidebarItem>
          </SidebarFooter>
      </Sidebar>

      <MainContent>
          <Header>
            <HeaderLeft>
              <IconButton 
                onClick={() => setIsSidebarOpen(!isSidebarOpen)}
                style={{ display: 'none' }}
                className="mobile-only"
              >
                ☰
              </IconButton>
              {currentChat && (() => {
                const otherParticipants = currentChat.participants
                  .filter((id: string) => id !== user?.id)
                  .map((id: string) => friends.find(f => f.id === id))
                  .filter(Boolean) as User[];
                
                if (otherParticipants.length === 0) return null;
                
                const participant = otherParticipants[0];
                return (
                  <>
                    <HeaderProfileCircle>
                      {participant.fullName?.charAt(0)?.toUpperCase()}
                    </HeaderProfileCircle>
                    <HeaderUserInfo>
                      <HeaderUserName>
                        {otherParticipants.map(p => p.fullName).join(', ')}
                      </HeaderUserName>
                      <HeaderUserStatus>
                        {onlineStatus[participant.id] ? 'Online' : 'Offline'}
                      </HeaderUserStatus>
                    </HeaderUserInfo>
                  </>
                );
              })()}
            </HeaderLeft>
            <HeaderRight>
              <HeaderWelcomeMessage className="header-welcome-message">
                Welcome, {user?.fullName || 'User'}!
              </HeaderWelcomeMessage>
              <LogoutButton onClick={signOut}>
                Logout
              </LogoutButton>
            </HeaderRight>
          </Header>
          
          {!currentChat ? (
            <OnboardingContainer>
              <WelcomeIllustration>
                💬
              </WelcomeIllustration>
              <WelcomeTitle>
                Welcome to ChatGifs, {user?.fullName?.split(' ')[0] || 'there'}! 👋
              </WelcomeTitle>
              <WelcomeMessage>
                Start your first conversation by tapping the button below. Share GIFs, connect with friends, and have fun chatting!
              </WelcomeMessage>
              <StartChatButton onClick={() => setShowNewChatModal(true)}>
                Start New Chat
              </StartChatButton>
            </OnboardingContainer>
          ) : (
            <ChatContainer>
              <MessageThread ref={messageThreadRef}>
                {messages
                  .filter(m => m.chatId === currentChat?.id)
                  .map(renderMessage)}
        </MessageThread>

              {selectedGif ? (
                <GifPreviewContainer>
                  <PreviewHeader>
                    <span>Selected GIF</span>
                    <DeleteButton onClick={handleCancelPreview}>×</DeleteButton>
                  </PreviewHeader>
                  <GifPreview>
                    <img 
                      src={selectedGif.images.fixed_height.url} 
                      alt={selectedGif.title}
                      width={selectedGif.images.fixed_height.width}
                      height={selectedGif.images.fixed_height.height}
                    />
                  </GifPreview>
                </GifPreviewContainer>
              ) : (gifResults.length > 0 || trendingGifs.length > 0) ? (
                <GifResultsContainer>
                  <GifResultsHeader>
                    <span>{gifResults.length > 0 ? 'Search Results' : 'Trending GIFs'}</span>
                    <CloseButton onClick={() => {
                      setGifResults([]);
                      setTrendingGifs([]);
                      setGifSearchTerm('');
                    }}>×</CloseButton>
                  </GifResultsHeader>
                  
                  <GifResultsGrid>
                    {(gifResults.length > 0 ? gifResults : trendingGifs).map((gif) => (
                      <GifResult
                        key={gif.id}
                        onClick={() => handleSelectGif(gif)}
                      >
                        <img 
                          src={gif.images.fixed_height.url} 
                          alt={gif.title} 
                          width={gif.images.fixed_height.width}
                          height={gif.images.fixed_height.height}
                        />
                      </GifResult>
                    ))}
                  </GifResultsGrid>
                </GifResultsContainer>
              ) : gifSearchTerm && !isSearchingGifs ? (
                <EmptyState>
                  <p>No GIFs found</p>
                </EmptyState>
              ) : null}

        <InputContainer>
                <SearchBarContainer>
          <SearchContainer>
          <SearchInput
            type="text"
            placeholder="Search for GIFs..."
              value={gifSearchTerm}
              onChange={(e: ChangeEvent<HTMLInputElement>) => handleGifSearch(e.target.value)}
              onKeyDown={handleKeyPress}
              onFocus={handleSearchFocus}
            />
          </SearchContainer>
          <ButtonContainer>
            <TrendingButton
              onClick={handleLoadTrending}
              disabled={isLoadingTrending}
            >
              🎬 Trending
            </TrendingButton>
            <SendButton
              onClick={handleSendGif}
              disabled={!selectedGif || !user || !currentChat}
            >
              Send GIF
            </SendButton>
          </ButtonContainer>
        </SearchBarContainer>
        </InputContainer>
            </ChatContainer>
          )}
      </MainContent>

        {/* Modals */}
        {showNewChatModal && (
          <Modal onClose={() => setShowNewChatModal(false)}>
            <ModalHeader>
              <h2>👥 Start a New Chat</h2>
              <CloseButton onClick={() => setShowNewChatModal(false)}>×</CloseButton>
            </ModalHeader>
            <ModalBody>
              <ModalSection>
                <ModalTitle>Select a Friend</ModalTitle>
                <ModalDescription>
                  Choose a friend to start chatting with
                </ModalDescription>
                <FriendsList>
                  {friends.map((friend) => {
                    // Check if a chat already exists with this friend
                    const existingChat = recentChats.find(chat => 
                      chat.participants.includes(friend.id) && 
                      chat.participants.includes(user?.id || '')
                    );

                    return (
                      <FriendItem
                        key={friend.id}
                        $isSelected={selectedFriend === friend.id}
                        onClick={() => !existingChat && setSelectedFriend(friend.id)}
                      >
                        <RequestAvatar>
                          {friend?.fullName?.charAt(0) || '?'}
                        </RequestAvatar>
                        <RequestInfo>
                          <RequestName>{friend?.fullName || 'Unknown User'}</RequestName>
                          <RequestEmail>{friend?.email || 'No email'}</RequestEmail>
                          {existingChat && (
                            <RequestStatus>Chat already exists</RequestStatus>
                          )}
                        </RequestInfo>
                      </FriendItem>
                    );
                  })}
                </FriendsList>
              </ModalSection>
            </ModalBody>
            <ModalFooter>
              <SecondaryButton onClick={() => setShowNewChatModal(false)}>
                Cancel
              </SecondaryButton>
              <ModalButton
                onClick={handleNewChat}
                disabled={!selectedFriend || recentChats.some(chat => 
                  chat.participants.includes(selectedFriend) && 
                  chat.participants.includes(user?.id || '')
                )}
              >
                Start Chat
              </ModalButton>
            </ModalFooter>
          </Modal>
        )}

        {showProfileModal && (
          <Modal onClose={() => setShowProfileModal(false)}>
            <ModalHeader>
              <h2>👤 Profile</h2>
              <CloseButton onClick={() => setShowProfileModal(false)}>×</CloseButton>
            </ModalHeader>
            <ModalBody>
              <ModalSection>
                <ModalTitle>Your Information</ModalTitle>
                <div style={{ textAlign: 'center', marginBottom: '1.5rem' }}>
                  <FriendAvatar style={{ margin: '0 auto 1rem', width: '80px', height: '80px', fontSize: '2rem' }}>
                    {user?.fullName?.charAt(0) || '?'}
                  </FriendAvatar>
                  {isEditingName ? (
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem' }}>
                      <ModalInput
                        value={editedName}
                        onChange={(e: ChangeEvent<HTMLInputElement>) => setEditedName(e.target.value)}
                        style={{ width: 'auto', margin: '0' }}
                        autoFocus
                      />
                      <EditButton onClick={handleEditName}>Save</EditButton>
                      <EditButton onClick={() => {
                        setIsEditingName(false);
                        setEditedName(user?.fullName || '');
                      }}>Cancel</EditButton>
                    </div>
                  ) : (
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      <FriendName style={{ fontSize: '1.25rem', marginBottom: '0.5rem' }}>
                        {user?.fullName}
                      </FriendName>
                      <EditButton onClick={() => {
                        setIsEditingName(true);
                        setEditedName(user?.fullName || '');
                      }}>Edit</EditButton>
                    </div>
                  )}
                  <FriendEmail>{user?.email}</FriendEmail>
                </div>
              </ModalSection>
              <DangerZone>
                <DangerTitle>Danger Zone</DangerTitle>
                <ModalDescription>
                  Once you deactivate your account, there is no going back. Please be certain.
                </ModalDescription>
                <DangerButton onClick={() => setShowDeactivateConfirm(true)}>
                  Deactivate Account
                </DangerButton>
              </DangerZone>
            </ModalBody>
          </Modal>
        )}

        {showFriendsModal && (
          <Modal onClose={() => setShowFriendsModal(false)}>
            <ModalHeader>
              <h2>👥 Friends</h2>
              <CloseButton onClick={() => setShowFriendsModal(false)}>×</CloseButton>
            </ModalHeader>
            <ModalBody>
              <ModalSection>
                <ModalTitle>Search Users</ModalTitle>
                <ModalDescription>
                  Search for users to add as friends
                </ModalDescription>
                <ModalInput
                  type="text"
                  placeholder="Search users..."
                  value={searchTerm}
                  onChange={(e: ChangeEvent<HTMLInputElement>) => handleSearch(e.target.value)}
                />
                {searchResults.length > 0 && (
                  <FriendsList>
                    {searchResults.map((result) => {
                      // Check if a request already exists (either sent or received)
                      const existingRequest = friendRequests.find(
                        request => 
                          (request.senderId === user?.id && request.receiverId === result.id && request.status === 'pending') ||
                          (request.receiverId === user?.id && request.senderId === result.id && request.status === 'pending')
                      );

                      return (
                        <SearchResultItem key={result.id}>
                          <RequestAvatar>
                            {result.fullName.charAt(0)}
                          </RequestAvatar>
                          <SearchResultInfo>
                            <SearchResultName>{result.fullName}</SearchResultName>
                            <RequestEmail>{result.email}</RequestEmail>
                          </SearchResultInfo>
                          <SearchResultActions>
                            <ModalButton
                              onClick={() => onSendFriendRequest(result.id)}
                              disabled={!!existingRequest}
                            >
                              Add
                            </ModalButton>
                          </SearchResultActions>
                        </SearchResultItem>
                      );
                    })}
                  </FriendsList>
                )}
              </ModalSection>

              {friends.length > 0 && (
                <ModalSection>
                  <ModalTitle>Your Friends ({friends.length})</ModalTitle>
                  <FriendsList>
                    {friends.map((friend) => (
                      <FriendItem key={friend.id}>
                        <RequestAvatar>
                          {friend?.fullName?.charAt(0) || '?'}
                        </RequestAvatar>
                        <RequestInfo>
                          <RequestName>{friend?.fullName || 'Unknown User'}</RequestName>
                          <RequestEmail>{friend?.email || 'No email'}</RequestEmail>
                        </RequestInfo>
                        <RequestActions>
                          <IconButton
                            onClick={() => onRemoveFriend(friend.id)}
                            title="Remove Friend"
                          >
                            🗑️
                          </IconButton>
                        </RequestActions>
                      </FriendItem>
                    ))}
                  </FriendsList>
                </ModalSection>
              )}

              {friendRequests.length > 0 && (
                <ModalSection>
                  <ModalTitle>Friend Requests ({friendRequests.length})</ModalTitle>
                  <FriendsList>
                    {friendRequests.map((request) => {
                      const isSentRequest = request.senderId === user?.id;
                      const displayName = isSentRequest ? request.receiverName : request.senderName;
                      const displayEmail = isSentRequest ? request.receiverEmail : request.senderEmail;
                      
                      return (
                        <FriendRequestItem key={request.id}>
                          <RequestAvatar>
                            {displayName?.charAt(0)}
                          </RequestAvatar>
                          <RequestInfo>
                            <RequestName>{displayName}</RequestName>
                            <RequestEmail>{displayEmail}</RequestEmail>
                            {isSentRequest && (
                              <RequestStatus>Sent</RequestStatus>
                            )}
                          </RequestInfo>
                          <RequestActions>
                            {!isSentRequest ? (
                              <>
                                <AcceptButton
                                  onClick={() => onAcceptRequest(request.id)}
                                  title="Accept friend request"
                                >
                                  Accept
                                </AcceptButton>
                                <RejectButton
                                  onClick={() => onRejectRequest(request.id)}
                                  title="Reject friend request"
                                >
                                  Reject
                                </RejectButton>
                              </>
                            ) : null}
                          </RequestActions>
                        </FriendRequestItem>
                      );
                    })}
                  </FriendsList>
                </ModalSection>
              )}
            </ModalBody>
          </Modal>
        )}

        {showSettingsModal && (
          <Modal onClose={() => setShowSettingsModal(false)}>
            <ModalHeader>
              <h2>⚙️ Settings</h2>
              <CloseButton onClick={() => setShowSettingsModal(false)}>×</CloseButton>
            </ModalHeader>
            <ModalBody>
              <ModalSection>
                <ModalTitle>Theme</ModalTitle>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <input 
                    type="radio" 
                    id="light" 
                    name="theme" 
                    checked={theme === 'light'}
                    onChange={() => handleThemeChange('light')}
                  />
                  <label 
                    htmlFor="light" 
                    style={{ color: theme === 'light' ? lightTheme.text : darkTheme.text }}
                  >
                    Light
                  </label>
                  <input 
                    type="radio" 
                    id="dark" 
                    name="theme" 
                    checked={theme === 'dark'}
                    onChange={() => handleThemeChange('dark')}
                    style={{ marginLeft: '1rem' }} 
                  />
                  <label 
                    htmlFor="dark" 
                    style={{ color: theme === 'light' ? lightTheme.text : darkTheme.text }}
                  >
                    Dark
                  </label>
                </div>
              </ModalSection>
            </ModalBody>
            <ModalFooter>
              <ModalButton onClick={() => setShowSettingsModal(false)}>
                Save Changes
              </ModalButton>
            </ModalFooter>
          </Modal>
        )}

        {showDeactivateConfirm && (
          <Modal onClose={() => setShowDeactivateConfirm(false)}>
            <ModalHeader>
              <h2>⚠️ Confirm Deactivation</h2>
              <CloseButton onClick={() => setShowDeactivateConfirm(false)}>×</CloseButton>
            </ModalHeader>
            <ModalBody>
              <ModalSection>
                <DangerTitle>Are you sure?</DangerTitle>
                <ModalDescription>
                  This action cannot be undone. All your data will be permanently deleted.
                </ModalDescription>
              </ModalSection>
              <ModalFooter>
                <SecondaryButton onClick={() => setShowDeactivateConfirm(false)}>
                  Cancel
                </SecondaryButton>
                <DangerButton onClick={handleDeactivateAccount}>
                  Deactivate Account
                </DangerButton>
              </ModalFooter>
            </ModalBody>
          </Modal>
        )}
    </Container>
    </ThemeProvider>
  );
};

export default ChatScreen;