"use client";

import Link from 'next/link';
import { useAuth } from '@/context/AuthContext';
import { useRouter } from 'next/navigation';
import { FileText, Pencil, HardDrive, LogOut, Loader2 } from 'lucide-react';

export default function Home() {
  const { user, loading, logout } = useAuth();
  const router = useRouter();

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gradient-to-br from-indigo-50 via-white to-purple-50">
        <div className="text-center">
          <Loader2 className="animate-spin h-12 w-12 text-indigo-600 mx-auto mb-4" />
          <p className="text-gray-600 font-medium">Loading...</p>
        </div>
      </div>
    );
  }

  // Not logged in - Show Hero Page
  if (!user) {
    return (
      <main className="min-h-screen bg-gradient-to-br from-indigo-50 via-white to-purple-50">
        {/* Header */}
        <header className="border-b bg-white/80 backdrop-blur-md">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <div className="w-8 h-8 bg-gradient-to-br from-indigo-600 to-purple-600 rounded-lg"></div>
              <h1 className="text-2xl font-bold bg-gradient-to-r from-indigo-600 to-purple-600 bg-clip-text text-transparent">
                ACe Toolkit
              </h1>
            </div>
            <div className="flex items-center space-x-4">
              <Link
                href="/auth/login"
                className="px-4 py-2 text-gray-700 hover:text-indigo-600 font-medium transition-colors"
              >
                Sign In
              </Link>
              <Link
                href="/auth/register"
                className="px-6 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 font-medium transition-colors shadow-md hover:shadow-lg"
              >
                Get Started
              </Link>
            </div>
          </div>
        </header>

        {/* Hero Section */}
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-24">
          <div className="text-center mb-16">
            <h2 className="text-5xl font-extrabold text-gray-900 mb-6">
              Your All-in-One Productivity Suite
            </h2>
            <p className="text-xl text-gray-600 max-w-3xl mx-auto mb-8">
              Create stunning diagrams, take organized notes, and manage your files - all in one place.
            </p>
            <Link
              href="/auth/register"
              className="inline-block px-8 py-4 bg-indigo-600 text-white text-lg rounded-lg hover:bg-indigo-700 font-semibold transition-all shadow-lg hover:shadow-xl transform hover:-translate-y-1"
            >
              Start for Free
            </Link>
          </div>

          {/* Features Grid */}
          <div className="grid md:grid-cols-3 gap-8 mt-20">
            <div className="bg-white rounded-xl p-8 shadow-lg hover:shadow-xl transition-shadow border border-gray-100">
              <div className="w-12 h-12 bg-indigo-100 rounded-lg flex items-center justify-center mb-4">
                <Pencil className="w-6 h-6 text-indigo-600" />
              </div>
              <h3 className="text-xl font-bold text-gray-900 mb-3">Mermaid Editor</h3>
              <p className="text-gray-600">
                Create beautiful flowcharts, sequence diagrams, and more with our powerful Mermaid editor.
              </p>
            </div>

            <div className="bg-white rounded-xl p-8 shadow-lg hover:shadow-xl transition-shadow border border-gray-100">
              <div className="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center mb-4">
                <FileText className="w-6 h-6 text-purple-600" />
              </div>
              <h3 className="text-xl font-bold text-gray-900 mb-3">Notes App</h3>
              <p className="text-gray-600">
                Take organized notes with rich text formatting and easy categorization.
              </p>
            </div>

            <div className="bg-white rounded-xl p-8 shadow-lg hover:shadow-xl transition-shadow border border-gray-100 opacity-60">
              <div className="w-12 h-12 bg-pink-100 rounded-lg flex items-center justify-center mb-4">
                <HardDrive className="w-6 h-6 text-pink-600" />
              </div>
              <h3 className="text-xl font-bold text-gray-900 mb-3">Drive (Coming Soon)</h3>
              <p className="text-gray-600">
                Store and manage your files securely in the cloud.
              </p>
            </div>
          </div>
        </div>

        {/* Footer */}
        <footer className="border-t mt-24 py-8 bg-white">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center text-gray-600">
            <p>&copy; 2026 ACe Toolkit. All rights reserved.</p>
          </div>
        </footer>
      </main>
    );
  }

  // Logged in - Show Apps Dashboard
  return (
    <main className="min-h-screen bg-gradient-to-br from-indigo-50 via-white to-purple-50">
      {/* Header */}
      <header className="border-b bg-white/80 backdrop-blur-md">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <div className="w-8 h-8 bg-gradient-to-br from-indigo-600 to-purple-600 rounded-lg"></div>
            <h1 className="text-2xl font-bold bg-gradient-to-r from-indigo-600 to-purple-600 bg-clip-text text-transparent">
              ACe Toolkit
            </h1>
          </div>
          <div className="flex items-center space-x-4">
            <span className="text-sm text-gray-600">
              Welcome, <span className="font-medium text-gray-900">{user.email}</span>
            </span>
            <button
              onClick={logout}
              className="p-2 text-gray-600 hover:text-red-600 transition-colors rounded-lg hover:bg-gray-100"
              title="Logout"
            >
              <LogOut size={20} />
            </button>
          </div>
        </div>
      </header>

      {/* Apps Grid */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        <h2 className="text-3xl font-bold text-gray-900 mb-8">Your Apps</h2>

        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
          {/* Mermaid Editor */}
          <Link
            href="/mermaid"
            className="group bg-white rounded-xl p-8 shadow-lg hover:shadow-xl transition-all border border-gray-100 hover:border-indigo-200 transform hover:-translate-y-1"
          >
            <div className="w-14 h-14 bg-indigo-100 rounded-xl flex items-center justify-center mb-4 group-hover:bg-indigo-200 transition-colors">
              <Pencil className="w-7 h-7 text-indigo-600" />
            </div>
            <h3 className="text-xl font-bold text-gray-900 mb-2">Mermaid Editor</h3>
            <p className="text-gray-600 text-sm">
              Create and edit flowcharts and diagrams with live preview.
            </p>
            <div className="mt-4 text-indigo-600 font-medium text-sm group-hover:translate-x-1 inline-block transition-transform">
              Open Editor →
            </div>
          </Link>

          {/* Notes App */}
          <Link
            href="/notes"
            className="group bg-white rounded-xl p-8 shadow-lg hover:shadow-xl transition-all border border-gray-100 hover:border-purple-200 transform hover:-translate-y-1"
          >
            <div className="w-14 h-14 bg-purple-100 rounded-xl flex items-center justify-center mb-4 group-hover:bg-purple-200 transition-colors">
              <FileText className="w-7 h-7 text-purple-600" />
            </div>
            <h3 className="text-xl font-bold text-gray-900 mb-2">Notes</h3>
            <p className="text-gray-600 text-sm">
              Take and organize your notes with ease.
            </p>
            <div className="mt-4 text-purple-600 font-medium text-sm group-hover:translate-x-1 inline-block transition-transform">
              Open Notes →
            </div>
          </Link>

          {/* Drive - Coming Soon */}
          <div className="bg-white rounded-xl p-8 shadow-lg border border-gray-100 opacity-60 cursor-not-allowed">
            <div className="w-14 h-14 bg-gray-100 rounded-xl flex items-center justify-center mb-4">
              <HardDrive className="w-7 h-7 text-gray-400" />
            </div>
            <h3 className="text-xl font-bold text-gray-900 mb-2">Drive</h3>
            <p className="text-gray-600 text-sm">
              File storage and management (Coming Soon)
            </p>
            <div className="mt-4 text-gray-400 font-medium text-sm">
              Coming Soon
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}
