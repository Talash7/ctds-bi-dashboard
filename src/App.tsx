import { lazy, Suspense } from 'react'
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { ThemeProvider } from 'next-themes'
import { AuthProvider } from '@/contexts/AuthContext'
import { ProtectedRoute } from '@/components/auth/ProtectedRoute'
import { DashboardLayout } from '@/components/layout/DashboardLayout'
import { Toaster } from '@/components/ui/sonner'
import Login from '@/pages/Login'

const StudentsPage = lazy(() => import('@/pages/students/StudentsPage'))
const ProgramsPage = lazy(() => import('@/pages/programs/ProgramsPage'))
const CoursesPage = lazy(() => import('@/pages/courses/CoursesPage'))
const ResultsPage = lazy(() => import('@/pages/results/ResultsPage'))
const ReportsPage = lazy(() => import('@/pages/ReportsPage'))
const ChatPage = lazy(() => import('@/pages/ChatPage'))
const ImportPage = lazy(() => import('@/pages/ImportPage'))
const UsersPage = lazy(() => import('@/pages/UsersPage'))

function PageFallback() {
  return <div className="p-6 text-sm text-muted-foreground">Loading…</div>
}

function App() {
  return (
    <ThemeProvider attribute="class" defaultTheme="system" enableSystem>
      <BrowserRouter>
        <AuthProvider>
          <Suspense fallback={<PageFallback />}>
            <Routes>
              <Route path="/login" element={<Login />} />
              <Route
                element={
                  <ProtectedRoute>
                    <DashboardLayout />
                  </ProtectedRoute>
                }
              >
                <Route index element={<Navigate to="/students" replace />} />
                <Route path="students" element={<StudentsPage />} />
                <Route path="programs" element={<ProgramsPage />} />
                <Route path="courses" element={<CoursesPage />} />
                <Route path="results" element={<ResultsPage />} />
                <Route path="reports" element={<ReportsPage />} />
                <Route path="chat" element={<ChatPage />} />
                <Route
                  path="import"
                  element={
                    <ProtectedRoute allowedRoles={['admin']}>
                      <ImportPage />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="users"
                  element={
                    <ProtectedRoute allowedRoles={['admin']}>
                      <UsersPage />
                    </ProtectedRoute>
                  }
                />
              </Route>
            </Routes>
          </Suspense>
        </AuthProvider>
      </BrowserRouter>
      <Toaster />
    </ThemeProvider>
  )
}

export default App
