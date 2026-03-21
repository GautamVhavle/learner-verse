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
import BrowseCoursesPage from "@/pages/BrowseCoursesPage";
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
import NotFoundPage from "@/pages/NotFoundPage";
import ModeRedirectPage from "@/pages/ModeRedirectPage";

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
            <Route path="browse" element={<BrowseCoursesPage />} />
            <Route path="courses/:id/edit" element={<CourseBuilderPage />} />
            <Route path="courses/:id/preview" element={<CoursePreviewPage />} />
            <Route path="certificates" element={<CertificatesPage />} />
            <Route path="goals" element={<GoalsPage />} />
            <Route path="stats" element={<StatsPage />} />
            <Route path="trash" element={<TrashPage />} />
            <Route path="settings" element={<SettingsPage />} />
            <Route path="inbox" element={<PlaceholderPage title="Quick Capture" />} />
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
            <Route path="browse" element={<BrowseCoursesPage />} />
            <Route path="study/:courseId" element={<StudyPage />} />
            <Route
              path="study/:courseId/lessons/:lessonId"
              element={<LessonPage />}
            />
            <Route path="certificates" element={<CertificatesPage />} />
            <Route path="goals" element={<GoalsPage />} />
            <Route path="stats" element={<StatsPage />} />
            <Route path="settings" element={<SettingsPage />} />
            <Route path="inbox" element={<PlaceholderPage title="Quick Capture" />} />
          </Route>

          {/* Public certificate share page */}
          <Route
            path="certificates/share/:uid"
            element={
              <ProtectedRoute>
                <AppShell mode="student" />
              </ProtectedRoute>
            }
          >
            <Route index element={<CertificateSharePage />} />
          </Route>

          {/* Redirect root to mode redirect page */}
          <Route path="/" element={<ModeRedirectPage />} />
          
          {/* Catch-all */}
          <Route path="*" element={<NotFoundPage />} />
        </Routes>
      </ErrorBoundary>
    </BrowserRouter>
  );
}

function PlaceholderPage({ title }: { title: string }) {
  return (
    <div className="flex h-[60vh] items-center justify-center">
      <div className="text-center">
        <h2 className="text-2xl font-semibold text-text-primary">{title}</h2>
        <p className="mt-2 text-sm text-text-secondary">
          Coming soon in a future phase.
        </p>
      </div>
    </div>
  );
}
