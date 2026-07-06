import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { HashRouter, Navigate, Route, Routes } from 'react-router-dom'
import { ProtectedRoute } from '@/components/common/ProtectedRoute'
import { AppLayout } from '@/components/layout/AppLayout'
import { LoginPage } from '@/pages/auth/LoginPage'
import { AdminPage } from '@/pages/admin/AdminPage'
import { CaseDetailPage } from '@/pages/cases/CaseDetailPage'
import { CasesPage } from '@/pages/cases/CasesPage'
import { NewCasePage } from '@/pages/cases/NewCasePage'
import { DeadlinesPage } from '@/pages/deadlines/DeadlinesPage'
import { DashboardPage } from '@/pages/dashboard/DashboardPage'
import { ProfilePage } from '@/pages/profile/ProfilePage'
import { PecasPage } from '@/pages/pecas/PecasPage'
import { TrabalhoPage } from '@/pages/trabalho/TrabalhoPage'
import { AgendaPage } from '@/pages/agenda/AgendaPage'
import { DocumentosPage } from '@/pages/documentos/DocumentosPage'
import { BibliotecaPage } from '@/pages/biblioteca/BibliotecaPage'

const queryClient = new QueryClient()

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <HashRouter>
        <Routes>
          <Route path="/login" element={<LoginPage />} />
          <Route
            element={
              <ProtectedRoute>
                <AppLayout />
              </ProtectedRoute>
            }
          >
            <Route index element={<DashboardPage />} />
            <Route path="cases" element={<CasesPage />} />
            <Route path="cases/new" element={<NewCasePage />} />
            <Route path="cases/:id" element={<CaseDetailPage />} />
            <Route path="cases/:id/pecas" element={<PecasPage />} />
            <Route path="cases/:id/documentos" element={<DocumentosPage />} />
            <Route path="trabalho" element={<TrabalhoPage />} />
            <Route path="agenda" element={<AgendaPage />} />
            <Route path="deadlines" element={<DeadlinesPage />} />
            <Route path="biblioteca" element={<BibliotecaPage />} />
            <Route path="admin" element={<AdminPage />} />
            <Route path="profile" element={<ProfilePage />} />
          </Route>
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </HashRouter>
    </QueryClientProvider>
  )
}

export default App
