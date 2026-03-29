import { useState } from "react";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider, useAuth } from "./contexts/AuthContext";
import Layout from "./components/Layout";
import LoginPage from "./pages/LoginPage";
import RegisterPage from "./pages/RegisterPage";
import HomePage from "./pages/HomePage";
import CommunityPage from "./pages/CommunityPage";
import DiscussionPage from "./pages/DiscussionPage";
import MessagesPage from "./pages/MessagesPage";
import ChatPage from "./pages/ChatPage";
import ProfilePage from "./pages/ProfilePage";
import RequestsPage from "./pages/RequestsPage";
import TermsPage from "./pages/TermsPage";
import PrivacyPage from "./pages/PrivacyPage";

function AuthGate() {
  const { user, loading } = useAuth();
  const [showLogin, setShowLogin] = useState(true);
  const [showTerms, setShowTerms] = useState(false);
  const [showPrivacy, setShowPrivacy] = useState(false);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-emerald-50 to-teal-100">
        <div className="text-emerald-600 text-lg">Loading...</div>
      </div>
    );
  }

  if (!user) {
    if (showTerms) return <TermsPage onBack={() => setShowTerms(false)} />;
    if (showPrivacy) return <PrivacyPage onBack={() => setShowPrivacy(false)} />;
    return showLogin ? (
      <LoginPage onSwitch={() => setShowLogin(false)} onShowTerms={() => setShowTerms(true)} onShowPrivacy={() => setShowPrivacy(true)} />
    ) : (
      <RegisterPage onSwitch={() => setShowLogin(true)} onShowTerms={() => setShowTerms(true)} onShowPrivacy={() => setShowPrivacy(true)} />
    );
  }

  return (
    <Routes>
      <Route element={<Layout />}>
        <Route path="/" element={<HomePage />} />
        <Route path="/community/:id" element={<CommunityPage />} />
        <Route path="/discussion/:id" element={<DiscussionPage />} />
        <Route path="/messages" element={<MessagesPage />} />
        <Route path="/messages/:userId" element={<ChatPage />} />
        <Route path="/requests" element={<RequestsPage />} />
        <Route path="/profile" element={<ProfilePage />} />
        <Route path="/terms" element={<TermsPage />} />
        <Route path="/privacy" element={<PrivacyPage />} />
      </Route>
      <Route path="*" element={<Navigate to="/" />} />
    </Routes>
  );
}

function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <AuthGate />
      </AuthProvider>
    </BrowserRouter>
  );
}

export default App;
