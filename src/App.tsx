import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom'
import { ProtectedRoute } from '@/components/common/ProtectedRoute'
import { AppLayout } from '@/components/layout/AppLayout'
import { LoginPage } from '@/pages/auth/LoginPage'
import { BillingPage } from '@/pages/billing/BillingPage'
import { CaseDetailPage } from '@/pages/cases/CaseDetailPage'
import { CasesPage } from '@/pages/cases/CasesPage'
import { NewCasePage } from '@/pages/cases/NewCasePage'
import { ClientsPage } from '@/pages/clients/ClientsPage'
import { DeadlinesPage } from '@/pages/deadlines/DeadlinesPage'
import { DashboardPage } from '@/pages/dashboard/DashboardPage'
import { DocumentEditorPage } from '@/pages/documents/DocumentEditorPage'
import { DocumentsPage } from '@/pages/documents/DocumentsPage'
import { NewDocumentPage } from '@/pages/documents/NewDocumentPage'
import { MyDataPage } from '@/pages/lgpd/MyDataPage'

const queryClient = new QueryClient()

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
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
            <Route path="documents" element={<DocumentsPage />} />
            <Route path="documents/new" element={<NewDocumentPage />} />
            <Route path="documents/editor" element={<DocumentEditorPage />} />
            <Route path="documents/:id" element={<DocumentEditorPage />} />
            <Route path="deadlines" element={<DeadlinesPage />} />
            <Route path="clients" element={<ClientsPage />} />
            <Route path="billing" element={<BillingPage />} />
            <Route path="lgpd" element={<MyDataPage />} />
          </Route>
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </BrowserRouter>
    </QueryClientProvider>
  )
}

export default App
