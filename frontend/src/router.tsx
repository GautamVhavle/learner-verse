/**
 * Client-side route definitions for the application.
 *
 * Routes are organized by mode: /creator/* and /learner/*.
 * Shared routes (certificates, goals, stats, etc.) are deduplicated
 * into a helper that both mode blocks consume.
 *
 * All page components are lazy-loaded to reduce initial bundle size.
 */
import { lazy, Suspense } from "react";
import { BrowserRouter, Routes, Route, Navigate } from "react-router";
import { SINGLE_USER_MODE } from "@/lib/auth";
import { PAYMENT_GATEWAY_ENABLED } from "@/lib/payment";
import { isSuperadmin } from "@/lib/superadmin";
import ProtectedRoute from "@/components/ProtectedRoute";
import { ErrorBoundary } from "@/components/shared/ErrorBoundary";
import { AppShell } from "@/components/layout/AppShell";
import { useUserQuery } from "@/hooks/useUser";

/* ─── Lazy page imports ─── */

const DashboardPage = lazy(() => import("@/pages/DashboardPage"));
const TrashPage = lazy(() => import("@/pages/TrashPage"));
const CourseBuilderPage = lazy(() => import("@/pages/CourseBuilderPage"));
const CoursePreviewPage = lazy(() => import("@/pages/CoursePreviewPage"));
const StudyPage = lazy(() => import("@/pages/StudyPage"));
const LessonPage = lazy(() => import("@/pages/LessonPage"));
const CertificatesPage = lazy(() => import("@/pages/CertificatesPage"));
const CertificateSharePage = lazy(() => import("@/pages/CertificateSharePage"));
const GoalsPage = lazy(() => import("@/pages/GoalsPage"));
const StatsPage = lazy(() => import("@/pages/StatsPage"));
const LoginPage = lazy(() => import("@/pages/LoginPage"));
const SettingsPage = lazy(() => import("@/pages/SettingsPage"));
const ProfilePage = lazy(() => import("@/pages/ProfilePage"));
const InboxPage = lazy(() => import("@/pages/InboxPage"));
const NotFoundPage = lazy(() => import("@/pages/NotFoundPage"));
const HomePage = lazy(() => import("@/pages/HomePage"));
const CourseHubPage = lazy(() => import("@/pages/CourseHubPage"));
const HubCourseDetailPage = lazy(() => import("@/pages/HubCourseDetailPage"));
const CreatorAnalyticsPage = lazy(() => import("@/pages/CreatorAnalyticsPage"));
const CourseAnalyticsDetailPage = lazy(() => import("@/pages/CourseAnalyticsDetailPage"));
const PublicProfilePage = lazy(() => import("@/pages/PublicProfilePage"));
const PublicCoursePage = lazy(() => import("@/pages/PublicCoursePage"));

// Payment-gated pages — only loaded when PAYMENT_GATEWAY_ENABLED is true.
// The lazy() calls are harmless even if the underlying files are stubs;
// they will simply never be rendered when the flag is false.
const PricingPage = lazy(() => import("@/pages/PricingPage"));
const RenewPage = lazy(() => import("@/pages/RenewPage"));
const SuperadminDashboardPage = lazy(() => import("@/pages/SuperadminDashboardPage"));

/** Protects the /superadmin route — redirects non-admins to /creator. */
function SuperadminGuard({ children }: { children: React.ReactNode }) {
  const { data: user, isLoading } = useUserQuery();
  if (isLoading) return null;
  if (!user || !isSuperadmin(user.email)) return <Navigate to="/creator" replace />;
  return <>{children}</>;
}

/**
 * Routes shared by both /creator and /learner mode blocks.
 * Avoids duplicating identical route definitions.
 */
function SharedRoutes() {
  return (
    <>
      <Route index element={<DashboardPage />} />
      <Route path="dashboard" element={<DashboardPage />} />
      <Route path="courses" element={<DashboardPage />} />
      <Route path="certificates" element={<CertificatesPage />} />
      <Route path="goals" element={<GoalsPage />} />
      <Route path="stats" element={<StatsPage />} />
      <Route path="hub" element={<CourseHubPage />} />
      <Route path="hub/:courseId" element={<HubCourseDetailPage />} />
      <Route path="settings" element={<SettingsPage />} />
      <Route path="profile" element={<ProfilePage />} />
      <Route path="inbox" element={<InboxPage />} />
      {PAYMENT_GATEWAY_ENABLED && <Route path="renew" element={<RenewPage />} />}
    </>
  );
}

export default function AppRouter() {
  return (
    <BrowserRouter>
      <ErrorBoundary>
        <Suspense>
          <Routes>
            {!SINGLE_USER_MODE && <Route path="/login" element={<LoginPage />} />}

            {/* ── Creator mode ── */}
            <Route
              path="/creator/*"
              element={
                <ProtectedRoute>
                  <AppShell mode="creator" />
                </ProtectedRoute>
              }
            >
              {SharedRoutes()}
              <Route path="courses/:id/edit" element={<CourseBuilderPage />} />
              <Route path="courses/:id/preview" element={<CoursePreviewPage />} />
              <Route path="trash" element={<TrashPage />} />
              <Route path="analytics" element={<CreatorAnalyticsPage />} />
              <Route path="analytics/:courseId" element={<CourseAnalyticsDetailPage />} />
            </Route>

            {/* ── Learner mode ── */}
            <Route
              path="/learner/*"
              element={
                <ProtectedRoute>
                  <AppShell mode="student" />
                </ProtectedRoute>
              }
            >
              {SharedRoutes()}
              <Route path="study/:courseId" element={<StudyPage />} />
              <Route path="study/:courseId/lessons/:lessonId" element={<LessonPage />} />
            </Route>

            {/* ── Public routes (no auth) ── */}
            <Route path="certificates/share/:uid" element={<CertificateSharePage />} />
            <Route path="/profile/:userId" element={<PublicProfilePage />} />
            <Route path="/courses/:courseId" element={<PublicCoursePage />} />
            {PAYMENT_GATEWAY_ENABLED && <Route path="/pricing" element={<PricingPage />} />}

            {/* ── Superadmin dashboard ── */}
            <Route
              path="/superadmin"
              element={
                <ProtectedRoute>
                  <SuperadminGuard>
                    <SuperadminDashboardPage />
                  </SuperadminGuard>
                </ProtectedRoute>
              }
            />
            <Route path="/" element={<HomePage />} />
            <Route path="/home" element={<HomePage />} />

            {/* ── Catch-all ── */}
            <Route path="*" element={<NotFoundPage />} />
          </Routes>
        </Suspense>
      </ErrorBoundary>
    </BrowserRouter>
  );
}
