import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { HashRouter, Navigate, Route, Routes } from 'react-router-dom'
import { ProtectedRoute } from '@/components/common/ProtectedRoute'
import { AppLayout } from '@/components/layout/AppLayout'
import { LoginPage } from '@/pages/auth/LoginPage'
import { AcceptInvitePage } from '@/pages/auth/AcceptInvitePage'
import { AdminPage } from '@/pages/admin/AdminPage'
import { CaseDetailPage } from '@/pages/cases/CaseDetailPage'
import { NewCasePage } from '@/pages/cases/NewCasePage'
import { ClientesPage } from '@/pages/clientes/ClientesPage'
import { NewClientePage } from '@/pages/clientes/NewClientePage'
import { ClienteDetailPage } from '@/pages/clientes/ClienteDetailPage'
import { DashboardPage } from '@/pages/dashboard/DashboardPage'
import { ProfilePage } from '@/pages/profile/ProfilePage'
import { PecasPage } from '@/pages/pecas/PecasPage'
import { DocumentosPage } from '@/pages/documentos/DocumentosPage'
import { BibliotecaPage } from '@/pages/biblioteca/BibliotecaPage'
import { PrazosPage } from '@/pages/prazos/PrazosPage'

const queryClient = new QueryClient()

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <HashRouter>
        <Routes>
          <Route path="/login" element={<LoginPage />} />
          <Route path="/convite/:token" element={<AcceptInvitePage />} />
          <Route
            element={
              <ProtectedRoute>
                <AppLayout />
              </ProtectedRoute>
            }
          >
            <Route index element={<DashboardPage />} />
            <Route path="clientes" element={<ClientesPage />} />
            <Route path="clientes/new" element={<NewClientePage />} />
            <Route path="clientes/:id" element={<ClienteDetailPage />} />
            <Route path="cases/new" element={<NewCasePage />} />
            <Route path="cases/:id" element={<CaseDetailPage />} />
            <Route path="cases/:id/pecas" element={<PecasPage />} />
            <Route path="cases/:id/documentos" element={<DocumentosPage />} />
            <Route path="biblioteca" element={<BibliotecaPage />} />
            <Route path="prazos" element={<PrazosPage />} />
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
