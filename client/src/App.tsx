import { useState, useEffect, useCallback } from 'react';
import { trpc } from '@/utils/trpc';
import './App.css';
import { LoginForm } from '@/components/LoginForm';
import { RegisterForm } from '@/components/RegisterForm';
import { ChatApp } from '@/components/ChatApp';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import type { User } from '../../server/src/schema';

function App() {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [showRegister, setShowRegister] = useState(false);

  // Update user presence on mount and cleanup
  useEffect(() => {
    const updatePresence = async (isOnline: boolean) => {
      if (currentUser) {
        try {
          await trpc.updateUserPresence.mutate({
            userId: currentUser.id,
            presence: { is_online: isOnline }
          });
        } catch (error) {
          console.error('Failed to update presence:', error);
        }
      }
    };

    if (currentUser) {
      updatePresence(true);
      
      // Set user offline when they close the tab/browser
      const handleBeforeUnload = () => updatePresence(false);
      window.addEventListener('beforeunload', handleBeforeUnload);
      
      return () => {
        updatePresence(false);
        window.removeEventListener('beforeunload', handleBeforeUnload);
      };
    }
  }, [currentUser]);

  const handleLogin = useCallback(async (email: string, password: string) => {
    setIsLoading(true);
    try {
      const user = await trpc.loginUser.mutate({ email, password });
      setCurrentUser(user);
    } catch (error) {
      console.error('Login failed:', error);
      throw error;
    } finally {
      setIsLoading(false);
    }
  }, []);

  const handleRegister = useCallback(async (username: string, email: string, password: string, fullName: string | null) => {
    setIsLoading(true);
    try {
      const user = await trpc.registerUser.mutate({
        username,
        email,
        password,
        full_name: fullName
      });
      setCurrentUser(user);
    } catch (error) {
      console.error('Registration failed:', error);
      throw error;
    } finally {
      setIsLoading(false);
    }
  }, []);

  const handleLogout = useCallback(async () => {
    if (currentUser) {
      try {
        await trpc.updateUserPresence.mutate({
          userId: currentUser.id,
          presence: { is_online: false }
        });
      } catch (error) {
        console.error('Failed to update presence on logout:', error);
      }
    }
    setCurrentUser(null);
  }, [currentUser]);

  // If user is logged in, show the chat app
  if (currentUser) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-green-50 to-blue-50">
        <div className="container mx-auto h-screen max-w-7xl">
          <div className="flex items-center justify-between p-4 border-b bg-white shadow-sm">
            <div className="flex items-center space-x-4">
              <h1 className="text-2xl font-bold text-green-600">💬 WhatsApp Clone</h1>
              <div className="flex items-center space-x-2 text-sm text-gray-600">
                <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                <span>Online as {currentUser.full_name || currentUser.username}</span>
              </div>
            </div>
            <Button onClick={handleLogout} variant="outline">
              Logout
            </Button>
          </div>
          <ChatApp currentUser={currentUser} />
        </div>
      </div>
    );
  }

  // Show authentication forms
  return (
    <div className="min-h-screen bg-gradient-to-br from-green-50 to-blue-50 flex items-center justify-center p-4">
      <Card className="w-full max-w-md shadow-lg">
        <CardHeader className="text-center">
          <CardTitle className="text-2xl font-bold text-green-600">
            💬 WhatsApp Clone
          </CardTitle>
          <p className="text-gray-600">Connect with friends and family</p>
        </CardHeader>
        <CardContent>
          <Tabs value={showRegister ? "register" : "login"} onValueChange={(value) => setShowRegister(value === "register")}>
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="login">Login</TabsTrigger>
              <TabsTrigger value="register">Register</TabsTrigger>
            </TabsList>
            <TabsContent value="login" className="mt-6">
              <LoginForm onLogin={handleLogin} isLoading={isLoading} />
            </TabsContent>
            <TabsContent value="register" className="mt-6">
              <RegisterForm onRegister={handleRegister} isLoading={isLoading} />
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
}

export default App;