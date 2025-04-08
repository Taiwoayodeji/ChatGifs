import React, { useState } from 'react';
import styled from '@emotion/styled';
import { useApp } from '../contexts/AppContext';

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
  padding: 1.5rem;
  border-radius: 20px;
  width: 100%;
  max-width: 400px;
  box-shadow: 0 4px 24px rgba(0, 0, 0, 0.1);
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

const InputGroup = styled.div`
  margin-bottom: 1rem;
  position: relative;
`;

const PasswordInputGroup = styled(InputGroup)`
  position: relative;
`;

const PasswordToggle = styled.button`
  position: absolute;
  right: 12px;
  top: 50%;
  transform: translateY(-50%);
  background: none;
  border: none;
  color: #86868b;
  cursor: pointer;
  padding: 4px;
  font-size: 1.2rem;
  display: flex;
  align-items: center;
  justify-content: center;
  height: 100%;
  margin-top: 0.5rem;
  
  &:hover {
    color: #1d1d1f;
  }
`;

const Label = styled.label`
  display: block;
  margin-bottom: 0.5rem;
  color: #1d1d1f;
  font-weight: 500;
`;

const Input = styled.input`
  width: 100%;
  padding: 0.625rem;
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
  padding: 0.625rem;
  background-color: #0071e3;
  color: white;
  border: none;
  border-radius: 12px;
  font-weight: 600;
  font-size: 0.95rem;
  cursor: pointer;
  transition: all 0.2s;
  margin-top: 0.5rem;
  
  &:hover {
    background-color: #0077ED;
  }
  
  &:active {
    transform: scale(0.98);
  }
`;

const SwitchText = styled.p`
  text-align: center;
  margin-top: 0.75rem;
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

interface SignInProps {
  onSwitchToSignUp: () => void;
}

const SignIn: React.FC<SignInProps> = ({ onSwitchToSignUp }) => {
  const { signIn, error: authError, isLoading } = useApp();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    
    try {
      await signIn(email, password);
    } catch (error) {
      setError('Invalid email or password. Please try again.');
    }
  };

  return (
    <Container>
      <Logo>
        <LogoText>ChatGifs</LogoText>
      </Logo>
      <Form onSubmit={handleSubmit}>
        <Title>
          Welcome Back 👋
        </Title>
        <Subtitle>Sign in to continue your journey</Subtitle>
        
        {(error || authError) && (
          <ErrorMessage>{error || authError}</ErrorMessage>
        )}
        
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
        
        <PasswordInputGroup>
          <Label>Password 🔒</Label>
          <Input
            type={showPassword ? "text" : "password"}
            placeholder="Enter your password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            disabled={isLoading}
          />
          <PasswordToggle
            type="button"
            onClick={() => setShowPassword(!showPassword)}
            disabled={isLoading}
          >
            {showPassword ? "👁️" : "🔒"}
          </PasswordToggle>
        </PasswordInputGroup>
        
        <Button type="submit" disabled={isLoading}>
          {isLoading ? 'Signing in...' : 'Sign In ✨'}
        </Button>
        <SwitchText>
          New here? {' '}
          <Link onClick={onSwitchToSignUp}>Create an account ✨</Link>
        </SwitchText>
        <SwitchText>
          Forgot password? {' '}
          <Link onClick={() => {}}>Reset here 🔄</Link>
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

export default SignIn; 