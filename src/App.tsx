import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { Toaster } from '@/components/ui/toaster'
import { Toaster as Sonner } from '@/components/ui/sonner'
import { TooltipProvider } from '@/components/ui/tooltip'
import { AuthProvider } from '@/contexts/AuthContext'
import { ProtectedRoute } from '@/components/ProtectedRoute'
import Layout from '@/components/Layout'

import Index from '@/pages/Index'
import Leads from '@/pages/Leads'
import Logs from '@/pages/Logs'
import Documentacao from '@/pages/Documentacao'
import Login from '@/pages/Login'
import NotFound from '@/pages/NotFound'

const App = () => (
  <BrowserRouter>
    <AuthProvider>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <Routes>
          {/* Rota pública de login */}
          <Route path="/login" element={<Login />} />

          {/* Rotas protegidas dentro do layout administrativo */}
          <Route element={<ProtectedRoute />}>
            <Route element={<Layout />}>
              <Route path="/" element={<Index />} />
              <Route path="/leads" element={<Leads />} />
              <Route path="/logs" element={<Logs />} />
              <Route path="/documentacao" element={<Documentacao />} />
            </Route>
          </Route>

          {/* Fallback de 404 */}
          <Route path="*" element={<NotFound />} />
        </Routes>
      </TooltipProvider>
    </AuthProvider>
  </BrowserRouter>
)

export default App
