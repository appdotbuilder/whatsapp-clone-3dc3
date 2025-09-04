import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';

interface RegisterFormProps {
  onRegister: (username: string, email: string, password: string, fullName: string | null) => Promise<void>;
  isLoading: boolean;
}

export function RegisterForm({ onRegister, isLoading }: RegisterFormProps) {
  const [formData, setFormData] = useState({
    username: '',
    email: '',
    password: '',
    confirmPassword: '',
    fullName: ''
  });
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!formData.username || !formData.email || !formData.password) {
      setError('Please fill in all required fields');
      return;
    }

    if (formData.password !== formData.confirmPassword) {
      setError('Passwords do not match');
      return;
    }

    if (formData.password.length < 6) {
      setError('Password must be at least 6 characters');
      return;
    }

    if (formData.username.length < 3) {
      setError('Username must be at least 3 characters');
      return;
    }

    try {
      await onRegister(
        formData.username,
        formData.email,
        formData.password,
        formData.fullName || null
      );
    } catch (err) {
      console.error('Registration error:', err);
      setError('Registration failed. Please try again.');
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {error && (
        <Alert variant="destructive">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}
      
      <div className="space-y-2">
        <Label htmlFor="register-username">Username *</Label>
        <Input
          id="register-username"
          type="text"
          value={formData.username}
          onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
            setFormData(prev => ({ ...prev, username: e.target.value }))
          }
          placeholder="Choose a username"
          required
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="register-fullname">Full Name</Label>
        <Input
          id="register-fullname"
          type="text"
          value={formData.fullName}
          onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
            setFormData(prev => ({ ...prev, fullName: e.target.value }))
          }
          placeholder="Your full name (optional)"
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="register-email">Email *</Label>
        <Input
          id="register-email"
          type="email"
          value={formData.email}
          onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
            setFormData(prev => ({ ...prev, email: e.target.value }))
          }
          placeholder="Enter your email"
          required
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="register-password">Password *</Label>
        <Input
          id="register-password"
          type="password"
          value={formData.password}
          onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
            setFormData(prev => ({ ...prev, password: e.target.value }))
          }
          placeholder="Create a password (min 6 chars)"
          required
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="register-confirm-password">Confirm Password *</Label>
        <Input
          id="register-confirm-password"
          type="password"
          value={formData.confirmPassword}
          onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
            setFormData(prev => ({ ...prev, confirmPassword: e.target.value }))
          }
          placeholder="Confirm your password"
          required
        />
      </div>

      <Button type="submit" disabled={isLoading} className="w-full bg-green-600 hover:bg-green-700">
        {isLoading ? 'Creating Account...' : 'Create Account'}
      </Button>
    </form>
  );
}