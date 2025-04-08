import React, { useEffect, useState } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AppProvider } from './contexts/AppContext';
import SignIn from './components/SignIn';
import SignUp from './components/SignUp';
import ChatScreen from './components/ChatScreen';
import { auth } from './services/firebaseService';
import { onAuthStateChanged } from 'firebase/auth';

const App: React.FC = () => {
  const [isLoading, setIsLoading] = useState(true);
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      setIsAuthenticated(!!user);
      setIsLoading(false);
    });

    return () => unsubscribe();
  }, []);

  if (isLoading) {
    return (
      <div style={{ 
        display: 'flex', 
        justifyContent: 'center', 
        alignItems: 'center', 
        height: '100vh',
        backgroundColor: '#f5f5f7'
      }}>
        <div style={{ 
          textAlign: 'center',
          padding: '2rem',
          backgroundColor: 'white',
          borderRadius: '12px',
          boxShadow: '0 4px 24px rgba(0, 0, 0, 0.1)'
        }}>
          <h2 style={{ color: '#1d1d1f', marginBottom: '1rem' }}>Loading...</h2>
          <p style={{ color: '#666' }}>Please wait while we set up your chat experience</p>
        </div>
      </div>
    );
  }

  return (
    <Router>
      <AppProvider>
        <Routes>
          <Route 
            path="/" 
            element={isAuthenticated ? <Navigate to="/chat" /> : <SignIn onSwitchToSignUp={() => window.location.href = '/signup'} />} 
          />
          <Route 
            path="/signup" 
            element={isAuthenticated ? <Navigate to="/chat" /> : <SignUp onSwitchToSignIn={() => window.location.href = '/'} />} 
          />
          <Route 
            path="/chat" 
            element={isAuthenticated ? <ChatScreen /> : <Navigate to="/" />} 
          />
          <Route path="*" element={<Navigate to="/" />} />
        </Routes>
      </AppProvider>
    </Router>
  );
};

export default App;