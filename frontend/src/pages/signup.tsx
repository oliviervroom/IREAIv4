'use client';

import { useState } from 'react';
import { useRouter } from 'next/router';
import Head from 'next/head';
import Link from 'next/link';
import axios from 'axios';

const API_URL = process.env.NEXT_PUBLIC_API_URL;

if (!API_URL) {
  throw new Error('API_URL is not defined');
}

export default function SignUp() {
  const router = useRouter();
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    confirmPassword: '',
    name: '',
  });
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);
    
    // Password confirmation check
    if (formData.password !== formData.confirmPassword) {
      setError('Passwords do not match.');
      setIsLoading(false);
      return;
    }

    try {
      // Send data in JSON format using axios with proper headers
      const response = await axios.post(`${API_URL}/api/signup`, null, {
        params: {
          email: formData.email,
          password: formData.password,
          name: formData.name,
        },
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        }
      });

      console.log('Signup response:', response.data);
      router.push('/login?message=Account created successfully. Please log in.');
    } catch (err: any) {
      console.error('Signup error:', err);
      let errorMessage = 'Failed to sign up.';
      
      if (axios.isAxiosError(err)) {
        // Axios 에러에서 상세 메시지 추출
        errorMessage = err.response?.data?.detail || 
                      (err.response?.status === 500 ? 'Server error. Please try again later.' : 
                      (err.message || 'Failed to sign up.'));
                      
        // CORS 에러인 경우
        if (!err.response && err.message.includes('Network Error')) {
          errorMessage = 'Cannot connect to server. This might be a CORS issue or the server is down.';
        }
      }
      
      setError(errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <Head>
        <title>Sign Up - Rental Cashflow Pro</title>
        <meta name="description" content="Sign up for Rental Cashflow Pro" />
      </Head>

      <div className="min-h-screen flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8">
        <div className="max-w-md w-full space-y-8">
          <div>
            <h2 className="mt-6 text-center text-3xl font-extrabold text-gray-900">
              Sign Up
            </h2>
            <p className="mt-2 text-center text-sm text-gray-600">
              Already have an account?{' '}
              <Link href="/login" className="font-medium text-blue-600 hover:text-blue-500">
                Login
              </Link>
            </p>
          </div>
          <form className="mt-8 space-y-6" onSubmit={handleSubmit}>
            {error && (
              <div className="text-red-500 text-center text-sm">{error}</div>
            )}
            <div className="rounded-md shadow-sm -space-y-px">
              <div>
                <input
                  name="email"
                  type="email"
                  required
                  className="appearance-none rounded-none relative block w-full px-3 py-2 border border-gray-300 placeholder-gray-500 text-gray-900 rounded-t-md focus:outline-none focus:ring-blue-500 focus:border-blue-500 focus:z-10 sm:text-sm"
                  placeholder="Email address"
                  value={formData.email}
                  onChange={handleChange}
                  disabled={isLoading}
                />
              </div>
              <div>
                <input
                  name="name"
                  type="text"
                  required
                  className="appearance-none rounded-none relative block w-full px-3 py-2 border border-gray-300 placeholder-gray-500 text-gray-900 focus:outline-none focus:ring-blue-500 focus:border-blue-500 focus:z-10 sm:text-sm"
                  placeholder="Name"
                  value={formData.name}
                  onChange={handleChange}
                  disabled={isLoading}
                />
              </div>
              <div>
                <input
                  name="password"
                  type="password"
                  required
                  className="appearance-none rounded-none relative block w-full px-3 py-2 border border-gray-300 placeholder-gray-500 text-gray-900 focus:outline-none focus:ring-blue-500 focus:border-blue-500 focus:z-10 sm:text-sm"
                  placeholder="Password"
                  value={formData.password}
                  onChange={handleChange}
                  disabled={isLoading}
                />
              </div>
              <div>
                <input
                  name="confirmPassword"
                  type="password"
                  required
                  className="appearance-none rounded-none relative block w-full px-3 py-2 border border-gray-300 placeholder-gray-500 text-gray-900 rounded-b-md focus:outline-none focus:ring-blue-500 focus:border-blue-500 focus:z-10 sm:text-sm"
                  placeholder="Confirm password"
                  value={formData.confirmPassword}
                  onChange={handleChange}
                  disabled={isLoading}
                />
              </div>
            </div>

            <div>
              <button
                type="submit"
                className="group relative w-full flex justify-center py-2 px-4 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
                disabled={isLoading}
              >
                {isLoading ? 'Signing up...' : 'Sign Up'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
} 