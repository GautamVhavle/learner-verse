/**
 * Client-side route definitions for the application.
 * Routes are organized by mode: /creator/* and /learner/*
 */
import { BrowserRouter, Routes, Route } from "react-router";
import { SINGLE_USER_MODE } from "@/lib/auth";
import ProtectedRoute from "@/components/ProtectedRoute";
import { ErrorBoundary } from "@/components/shared/ErrorBoundary";
import { AppShell } from "@/components/layout/AppShell";
import DashboardPage from "@/pages/DashboardPage";

import TrashPage from "@/pages/TrashPage";
import CourseBuilderPage from "@/pages/CourseBuilderPage";
import CoursePreviewPage from "@/pages/CoursePreviewPage";
import StudyPage from "@/pages/StudyPage";
import LessonPage from "@/pages/LessonPage";
import CertificatesPage from "@/pages/CertificatesPage";
import CertificateSharePage from "@/pages/CertificateSharePage";
import GoalsPage from "@/pages/GoalsPage";
import StatsPage from "@/pages/StatsPage";
import LoginPage from "@/pages/LoginPage";
import SettingsPage from "@/pages/SettingsPage";
import ProfilePage from "@/pages/ProfilePage";
import InboxPage from "@/pages/InboxPage";
import NotFoundPage from "@/pages/NotFoundPage";
import ModeRedirectPage from "@/pages/ModeRedirectPage";
import CourseHubPage from "@/pages/CourseHubPage";
import HubCourseDetailPage from "@/pages/HubCourseDetailPage";
import CreatorAnalyticsPage from "@/pages/CreatorAnalyticsPage";
import CourseAnalyticsDetailPage from "@/pages/CourseAnalyticsDetailPage";
import PublicProfilePage from "@/pages/PublicProfilePage";

export default function AppRouter() {
  return (
    <BrowserRouter>
      <ErrorBoundary>
        <Routes>
          {!SINGLE_USER_MODE && <Route path="/login" element={<LoginPage />} />}
          
          {/* Mode-based routing */}
          <Route
            path="/creator/*"
            element={
              <ProtectedRoute>
                <AppShell mode="creator" />
              </ProtectedRoute>
            }
          >
            <Route index element={<DashboardPage />} />
            <Route path="dashboard" element={<DashboardPage />} />
            <Route path="courses" element={<DashboardPage />} />
            <Route path="courses/:id/edit" element={<CourseBuilderPage />} />
            <Route path="courses/:id/preview" element={<CoursePreviewPage />} />
            <Route path="certificates" element={<CertificatesPage />} />
            <Route path="goals" element={<GoalsPage />} />
            <Route path="stats" element={<StatsPage />} />
            <Route path="trash" element={<TrashPage />} />
            <Route path="hub" element={<CourseHubPage />} />
            <Route path="hub/:courseId" element={<HubCourseDetailPage />} />
            <Route path="analytics" element={<CreatorAnalyticsPage />} />
            <Route path="analytics/:courseId" element={<CourseAnalyticsDetailPage />} />
            <Route path="settings" element={<SettingsPage />} />
            <Route path="profile" element={<ProfilePage />} />
            <Route path="inbox" element={<InboxPage />} />
          </Route>

          <Route
            path="/learner/*"
            element={
              <ProtectedRoute>
                <AppShell mode="student" />
              </ProtectedRoute>
            }
          >
            <Route index element={<DashboardPage />} />
            <Route path="dashboard" element={<DashboardPage />} />
            <Route path="courses" element={<DashboardPage />} />
            <Route path="study/:courseId" element={<StudyPage />} />
            <Route
              path="study/:courseId/lessons/:lessonId"
              element={<LessonPage />}
            />
            <Route path="certificates" element={<CertificatesPage />} />
            <Route path="goals" element={<GoalsPage />} />
            <Route path="stats" element={<StatsPage />} />
            <Route path="hub" element={<CourseHubPage />} />
            <Route path="hub/:courseId" element={<HubCourseDetailPage />} />
            <Route path="settings" element={<SettingsPage />} />
            <Route path="profile" element={<ProfilePage />} />
            <Route path="inbox" element={<InboxPage />} />
          </Route>

          {/* Public certificate share page (standalone layout, no auth) */}
          <Route
            path="certificates/share/:uid"
            element={<CertificateSharePage />}
          />

          {/* Public profile page */}
          <Route path="/profile/:userId" element={<PublicProfilePage />} />

          {/* Redirect root to mode redirect page */}
          <Route path="/" element={<ModeRedirectPage />} />
          
          {/* Catch-all */}
          <Route path="*" element={<NotFoundPage />} />
        </Routes>
      </ErrorBoundary>
    </BrowserRouter>
  );
}
