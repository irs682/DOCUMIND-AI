import { Routes, Route, Navigate } from 'react-router-dom';
import MainLayout from '../layouts/MainLayout';
import AuthLayout from '../layouts/AuthLayout';
import AdminLayout from '../layouts/AdminLayout';
import ProtectedRoute from './ProtectedRoute';
import AdminRoute from './AdminRoute';

// Public Pages
import Home from '../pages/public/Home';
import Features from '../pages/public/Features';
import Pricing from '../pages/public/Pricing';
import FAQ from '../pages/public/FAQ';
import About from '../pages/public/About';
import Contact from '../pages/public/Contact';

// Auth Pages
import Login from '../pages/auth/Login';
import Register from '../pages/auth/Register';
import ForgotPassword from '../pages/auth/ForgotPassword';
import ResetPassword from '../pages/auth/ResetPassword';

// User Pages
import Dashboard from '../pages/user/Dashboard';
import Documents from '../pages/user/Documents';
import DocumentDetails from '../pages/user/DocumentDetails';
import KnowledgeBases from '../pages/user/KnowledgeBases';
import KnowledgeBaseDetails from '../pages/user/KnowledgeBaseDetails';
import Search from '../pages/user/Search';
import AIChat from '../pages/user/AIChat';
import Research from '../pages/user/Research';
import Agents from '../pages/user/Agents';
import Analytics from '../pages/user/Analytics';
import Profile from '../pages/user/Profile';
import Settings from '../pages/user/Settings';
import Projects from '../pages/user/Projects';
import CompareDocuments from '../pages/user/CompareDocuments';
import ExtractionResults from '../pages/user/ExtractionResults';

// Admin Pages
import AdminDashboard from '../pages/admin/AdminDashboard';
import Users from '../pages/admin/Users';
import AdminDocuments from '../pages/admin/Documents';
import AdminAnalytics from '../pages/admin/Analytics';
import AIMonitoring from '../pages/admin/AIMonitoring';
import AuditLogs from '../pages/admin/AuditLogs';
import AdminSettings from '../pages/admin/Settings';

const AppRoutes = () => {
  return (
    <Routes>
      {/* Public Routes */}
      <Route element={<MainLayout />}>
        <Route path="/" element={<Home />} />
        <Route path="/home" element={<Home />} />
        <Route path="/features" element={<Features />} />
        <Route path="/pricing" element={<Pricing />} />
        <Route path="/faq" element={<FAQ />} />
        <Route path="/about" element={<About />} />
        <Route path="/contact" element={<Contact />} />
      </Route>

      {/* Auth Routes */}
      <Route element={<AuthLayout />}>
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />
        <Route path="/forgot-password" element={<ForgotPassword />} />
        <Route path="/reset-password" element={<ResetPassword />} />
      </Route>

      {/* Protected User Routes */}
      <Route element={<ProtectedRoute />}>
        <Route element={<MainLayout />}>
          <Route path="/dashboard" element={<Dashboard />} />
          <Route path="/documents" element={<Documents />} />
          <Route path="/compare" element={<CompareDocuments />} />
          <Route path="/extractions/:id" element={<ExtractionResults />} />
          <Route path="/projects" element={<Projects />} />
          <Route path="/projects/:projectId" element={<AIChat />} />
          <Route path="/projects/:projectId/compare" element={<CompareDocuments />} />
          <Route path="/projects/:projectId/chat" element={<AIChat />} />
          <Route path="/projects/:projectId/chat/:id" element={<AIChat />} />
          <Route path="/documents/:id" element={<DocumentDetails />} />
          <Route path="/knowledge-bases" element={<KnowledgeBases />} />
          <Route path="/knowledge-bases/:id" element={<KnowledgeBaseDetails />} />
          <Route path="/search" element={<Search />} />
          <Route path="/chat" element={<AIChat />} />
          <Route path="/chat/:id" element={<AIChat />} />
          <Route path="/ai-chat" element={<AIChat />} />
          <Route path="/ai-chat/:id" element={<AIChat />} />
          <Route path="/research" element={<Research />} />
          <Route path="/research/projects" element={<Research />} />
          <Route path="/research/projects/new" element={<Research />} />
          <Route path="/research/projects/:projectId" element={<Research />} />
          <Route path="/research/projects/:projectId/step/:step" element={<Research />} />
          <Route path="/research/projects/:projectId/manuscript" element={<Research />} />
          <Route path="/agents" element={<Agents />} />
          <Route path="/analytics" element={<Analytics />} />
          <Route path="/profile" element={<Profile />} />
          <Route path="/settings" element={<Settings />} />
        </Route>
      </Route>

      {/* Admin Routes */}
      <Route element={<AdminRoute />}>
        <Route element={<AdminLayout />}>
          <Route path="/admin" element={<AdminDashboard />} />
          <Route path="/admin/users" element={<Users />} />
          <Route path="/admin/documents" element={<AdminDocuments />} />
          <Route path="/admin/analytics" element={<AdminAnalytics />} />
          <Route path="/admin/ai-monitoring" element={<AIMonitoring />} />
          <Route path="/admin/audit-logs" element={<AuditLogs />} />
          <Route path="/admin/settings" element={<AdminSettings />} />
        </Route>
      </Route>

      {/* Catch-all fallback */}
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
};

export default AppRoutes;
