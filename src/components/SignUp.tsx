import React, { useState } from 'react';
import styled from '@emotion/styled';
import { useApp } from '../contexts/AppContext';
import MainSection from './MainSection';

// Reuse the same styled components from SignIn.tsx with the same reduced spacing
const Container = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  min-height: 100vh;
  background-color: #f5f5f7;
  color: #1d1d1f;
  font-family: -apple-system, BlinkMacSystemFont, 'SF Pro Display', 'SF Pro Text', sans-serif;
`;

const Form = styled.form`
  background-color: white;
  padding: 2rem;
  border-radius: 20px;
  width: 100%;
  max-width: 400px;
  box-shadow: 0 4px 24px rgba(0, 0, 0, 0.1);
  max-height: 90vh;
  overflow-y: auto;
  
  /* Styling for the scrollbar */
  &::-webkit-scrollbar {
    width: 8px;
  }

  &::-webkit-scrollbar-track {
    background: #f1f1f1;
    border-radius: 4px;
  }

  &::-webkit-scrollbar-thumb {
    background: #c1c1c1;
    border-radius: 4px;
  }

  &::-webkit-scrollbar-thumb:hover {
    background: #a8a8a8;
  }
`;

const Title = styled.div`
  font-size: 1.75rem;
  font-weight: 600;
  margin-bottom: 0.25rem;
  text-align: center;
  color: #1d1d1f;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 0.5rem;
`;

const Subtitle = styled.p`
  text-align: center;
  color: #86868b;
  margin-bottom: 1.25rem;
  font-size: 1rem;
`;

const InputRow = styled.div`
  display: flex;
  gap: 1rem;
`;

const InputGroup = styled.div`
  margin-bottom: 0.75rem;
  flex: 1;
  
  &:last-of-type {
    margin-bottom: 1rem;
  }
`;

const Label = styled.label`
  display: block;
  margin-bottom: 0.25rem;
  color: #1d1d1f;
  font-weight: 500;
  font-size: 0.9rem;
`;

const Input = styled.input`
  width: 100%;
  padding: 0.75rem;
  margin-bottom: 0.25rem;
  border: 1px solid #d2d2d7;
  border-radius: 12px;
  background-color: #ffffff;
  color: #1d1d1f;
  font-size: 0.95rem;
  transition: all 0.2s;
  
  &:focus {
    outline: none;
    border-color: #0071e3;
    box-shadow: 0 0 0 4px rgba(0, 113, 227, 0.1);
  }
`;

const Button = styled.button`
  width: 100%;
  padding: 0.75rem;
  background-color: #0071e3;
  color: white;
  border: none;
  border-radius: 12px;
  font-weight: 600;
  font-size: 0.95rem;
  cursor: pointer;
  transition: all 0.2s;
  margin-top: 0.75rem;
  
  &:hover {
    background-color: #0077ED;
  }
  
  &:active {
    transform: scale(0.98);
  }
`;

const SwitchText = styled.p`
  text-align: center;
  margin-top: 1rem;
  color: #86868b;
  font-size: 0.9rem;
`;

const Link = styled.span`
  color: #0071e3;
  cursor: pointer;
  font-weight: 500;
  
  &:hover {
    text-decoration: underline;
  }
`;

const Logo = styled.div`
  font-size: 2rem;
  font-weight: 600;
  margin-bottom: 1.5rem;
  padding: 0.5rem;
  display: flex;
  align-items: center;
  gap: 0.5rem;
  color: #0066FF;
  
  &::before {
    content: '💬';
    font-size: 2.2rem;
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

interface SignUpProps {
  onSwitchToSignIn: () => void;
}

const SignUp: React.FC<SignUpProps> = ({ onSwitchToSignIn }) => {
  const { signUp, error: authError, isLoading } = useApp();
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    // Validate password
    if (password.length < 6) {
      setError('Password must be at least 6 characters long');
      return;
    }

    if (password !== confirmPassword) {
      setError('Passwords do not match');
      return;
    }

    // Validate email
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      setError('Please enter a valid email address');
      return;
    }

    try {
      console.log('Attempting to sign up...');
      await signUp(email, password, fullName);
      console.log('Sign up successful');
    } catch (error: any) {
      console.error('Sign up error:', error);
      if (error.code === 'auth/email-already-in-use') {
        setError('This email is already registered. Please sign in instead.');
      } else if (error.code === 'auth/invalid-email') {
        setError('Please enter a valid email address');
      } else if (error.code === 'auth/weak-password') {
        setError('Password is too weak. Please use a stronger password');
      } else {
        setError('Failed to create account. Please try again.');
      }
    }
  };

  return (
    <Container>
      <Logo>
        <LogoText>ChatGifs</LogoText>
      </Logo>
      <Form onSubmit={handleSubmit}>
        <Title>
          Create Account 🌟
        </Title>
        <Subtitle>Join us today and start chatting!</Subtitle>
        
        {(error || authError) && (
          <ErrorMessage>{error || authError}</ErrorMessage>
        )}
        
        <InputGroup>
          <Label>Full Name 👤</Label>
          <Input
            type="text"
            placeholder="Enter your full name"
            value={fullName}
            onChange={(e) => setFullName(e.target.value)}
            required
            disabled={isLoading}
          />
        </InputGroup>
        
        <InputGroup>
          <Label>Email 📧</Label>
          <Input
            type="email"
            placeholder="Enter your email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            disabled={isLoading}
          />
        </InputGroup>
        
        <InputGroup>
          <Label>Password 🔒</Label>
          <Input
            type="password"
            placeholder="Create a password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            disabled={isLoading}
          />
        </InputGroup>

        <InputGroup>
          <Label>Confirm Password 🔐</Label>
          <Input
            type="password"
            placeholder="Confirm your password"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            required
            disabled={isLoading}
          />
        </InputGroup>
        
        <Button type="submit" disabled={isLoading}>
          {isLoading ? 'Creating account...' : 'Sign Up ✨'}
        </Button>
        <SwitchText>
          Already have an account? {' '}
          <Link onClick={onSwitchToSignIn}>Sign in here 👋</Link>
        </SwitchText>
      </Form>
    </Container>
  );
};

const ErrorMessage = styled.div`
  color: #ff3b30;
  background-color: #ffebeb;
  padding: 0.75rem;
  border-radius: 8px;
  margin-bottom: 1rem;
  font-size: 0.9rem;
`;

export default SignUp;