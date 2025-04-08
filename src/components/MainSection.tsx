import React from 'react';
import styled from '@emotion/styled';

const Container = styled.div`
  display: flex;
  min-height: 100vh;
  background-color: #f5f5f7;
`;

const Sidebar = styled.div`
  width: 280px;
  background-color: white;
  border-right: 1px solid rgb(241, 241, 241);
  padding: 1.5rem;
  display: flex;
  flex-direction: column;
`;

const Logo = styled.div`
  font-size: 1.5rem;
  font-weight: 600;
  margin-bottom: 1.5rem;
  padding: 0.5rem;
  display: flex;
  align-items: center;
  gap: 0.5rem;
  color: #0066FF;
  
  &::before {
    content: '💬';
    font-size: 1.8rem;
  }
`;

const LogoText = styled.span`
  background: linear-gradient(45deg, #0066FF, #00CCFF);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  font-weight: 700;
  letter-spacing: -0.5px;
  font-family: -apple-system, BlinkMacSystemFont, 'SF Pro Display', 'SF Pro Text', sans-serif;
`;

const SidebarItem = styled.div`
  padding: 0.75rem 1rem;
  border-radius: 8px;
  cursor: pointer;
  display: flex;
  align-items: center;
  gap: 0.75rem;
  color: #1d1d1f;
  font-weight: 500;
  transition: all 0.2s;
  
  &:hover {
    background-color: #f5f5f7;
  }
  
  &.active {
    background-color: #EEF3FF;
    color: #0066FF;
  }
`;

const MainContent = styled.div`
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 2rem;
  text-align: center;
`;

const Illustration = styled.div`
  width: 200px;
  height: 200px;
  margin-bottom: 2rem;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 5rem;
  animation: float 3s ease-in-out infinite;
  
  @keyframes float {
    0% { transform: translateY(0px); }
    50% { transform: translateY(-20px); }
    100% { transform: translateY(0px); }
  }
`;

const WelcomeMessage = styled.div`
  margin-bottom: 2rem;
`;

const Title = styled.h1`
  font-size: 2.5rem;
  font-weight: 700;
  color: #1d1d1f;
  margin-bottom: 1rem;
  background: linear-gradient(45deg, #0066FF, #00CCFF);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
`;

const Subtitle = styled.p`
  font-size: 1.25rem;
  color: #86868b;
  max-width: 500px;
  line-height: 1.5;
`;

const StartButton = styled.button`
  padding: 1rem 2rem;
  background: linear-gradient(45deg, #0066FF, #00CCFF);
  color: white;
  border: none;
  border-radius: 100px;
  font-size: 1.25rem;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s;
  display: flex;
  align-items: center;
  gap: 0.5rem;
  
  &:hover {
    transform: translateY(-2px);
    box-shadow: 0 4px 12px rgba(0, 102, 255, 0.2);
  }
  
  &:active {
    transform: translateY(0);
  }
`;

interface MainSectionProps {
  userName: string;
  onStartChat: () => void;
}

const MainSection: React.FC<MainSectionProps> = ({ userName, onStartChat }) => {
  return (
    <Container>
      <Sidebar>
        <Logo>
          <LogoText>ChatGifs</LogoText>
        </Logo>
        <SidebarItem className="active">
          ➕ New Chat
        </SidebarItem>
        <SidebarItem>
          🔍 Find Friends
        </SidebarItem>
        <SidebarItem>
          ⚙️ Settings
        </SidebarItem>
      </Sidebar>
      <MainContent>
        <Illustration>💬</Illustration>
        <WelcomeMessage>
          <Title>Welcome to ChatGifs, {userName}!</Title>
          <Subtitle>Start your first conversation by tapping the button below.</Subtitle>
        </WelcomeMessage>
        <StartButton onClick={onStartChat}>
          Start New Chat 🚀
        </StartButton>
      </MainContent>
    </Container>
  );
};

export default MainSection; 