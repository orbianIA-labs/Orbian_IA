import { useQuery } from '@tanstack/react-query'
import type { PropsWithChildren } from 'react'
import { Navigate, useLocation } from 'react-router-dom'
import { authService } from '@/services/auth.service'
import { useAuthStore } from '@/store/authStore'

export function ProtectedRoute({ children }: PropsWithChildren) {
  const accessToken = useAuthStore((state) => state.accessToken)
  const setTokens = useAuthStore((state) => state.setTokens)
  const location = useLocation()

  const { isLoading, isError } = useQuery({
    queryKey: ['auth-check'],
    queryFn: async () => {
      const session = await authService.checkSession()
      setTokens(session.accessToken, session.user)
      return session
    },
    enabled: !accessToken,
    retry: false,
  })

  if (isLoading) {
    return <div className="screen-loader">Carregando Orbian...</div>
  }

  if (!accessToken || isError) {
    return <Navigate to="/login" state={{ from: location }} replace />
  }

  return children
}
