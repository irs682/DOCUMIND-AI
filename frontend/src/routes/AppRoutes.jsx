import React, { Suspense, lazy } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import MainLayout from '../layouts/MainLayout';
import AuthLayout from '../layouts/AuthLayout';
import AdminLayout from '../layouts/AdminLayout';
import ProtectedRoute from './ProtectedRoute';
import AdminRoute from './AdminRoute';

// Core Public & Auth Pages (Directly imported for instant landing & login)
import Home from '../pages/public/Home';
import Login from '../pages/auth/Login';
import Register from '../pages/auth/Register';
import ForgotPassword from '../pages/auth/ForgotPassword';
import ResetPassword from '../pages/auth/ResetPassword';

// Core User Workspace Pages (Directly imported for instant dashboard & document access)
import Dashboard from '../pages/user/Dashboard';
import Documents from '../pages/user/Documents';
import KnowledgeBases from '../pages/user/KnowledgeBases';

// Secondary Public Pages (Lazy loaded chunks)
const Features = lazy(() => import('../pages/public/Features'));
const Pricing = lazy(() => import('../pages/public/Pricing'));
const FAQ = lazy(() => import('../pages/public/FAQ'));
const About = lazy(() => import('../pages/public/About'));
const Contact = lazy(() => import('../pages/public/Contact'));

// Heavy User Intelligence & Research Pages (Lazy loaded chunks)
const Research = lazy(() => import('../pages/user/Research'));
const AIChat = lazy(() => import('../pages/user/AIChat'));
const Search = lazy(() => import('../pages/user/Search'));
const CompareDocuments = lazy(() => import('../pages/user/CompareDocuments'));
const ExtractionResults = lazy(() => import('../pages/user/ExtractionResults'));
const DocumentDetails = lazy(() => import('../pages/user/DocumentDetails'));
const KnowledgeBaseDetails = lazy(() => import('../pages/user/KnowledgeBaseDetails'));
const Projects = lazy(() => import('../pages/user/Projects'));
const Agents = lazy(() => import('../pages/user/Agents'));
const Analytics = lazy(() => import('../pages/user/Analytics'));
const Profile = lazy(() => import('../pages/user/Profile'));
const Settings = lazy(() => import('../pages/user/Settings'));

// Admin Suite Pages (Lazy loaded chunks)
const AdminDashboard = lazy(() => import('../pages/admin/AdminDashboard'));
const Users = lazy(() => import('../pages/admin/Users'));
const AdminDocuments = lazy(() => import('../pages/admin/Documents'));
const AdminAnalytics = lazy(() => import('../pages/admin/Analytics'));
const AIMonitoring = lazy(() => import('../pages/admin/AIMonitoring'));
const AuditLogs = lazy(() => import('../pages/admin/AuditLogs'));
const AdminSettings = lazy(() => import('../pages/admin/Settings'));

// Subtle, non-blocking fallback for lazy-loaded route chunks
const RouteLoadingFallback = () => (
  <div className="flex items-center justify-center min-h-[300px] w-full p-8 animate-fade-in">
    <div className="flex items-center gap-3 px-5 py-3 rounded-2xl bg-white/70 dark:bg-slate-900/70 border border-slate-200/80 dark:border-slate-800 backdrop-blur-md shadow-xs">
      <div className="h-4 w-4 rounded-full border-2 border-indigo-600 border-t-transparent animate-spin shrink-0" />
      <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">Loading section...</span>
    </div>
  </div>
);

const AppRoutes = () => {
  return (
    <Suspense fallback={<RouteLoadingFallback />}>
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
    </Suspense>
  );
};

export default AppRoutes;
