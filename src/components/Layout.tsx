import { useState } from 'react'
import { Outlet, NavLink, useNavigate, useLocation } from 'react-router-dom'
import { useAuth } from '@/contexts/AuthContext'
import {
  LayoutDashboard,
  UserCheck,
  Activity,
  FileCode2,
  LogOut,
  Layers,
  ExternalLink,
  Menu,
  X,
  Server,
  ShieldCheck,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { INTEGRATION_CONFIG } from '@/services/toolRegistry'

const navItems = [
  {
    to: '/',
    label: 'Visão Geral',
    icon: LayoutDashboard,
  },
  {
    to: '/leads',
    label: 'Leads',
    icon: UserCheck,
  },
  {
    to: '/logs',
    label: 'Logs',
    icon: Activity,
  },
  {
    to: '/documentacao',
    label: 'Documentação',
    icon: FileCode2,
  },
]

export default function Layout() {
  const { user, logout } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)

  const handleLogout = () => {
    logout()
    navigate('/login')
  }

  const getPageTitle = () => {
    if (location.pathname === '/') return 'Visão Geral da Camada'
    if (location.pathname.startsWith('/leads')) return 'Leads do Consultor'
    if (location.pathname.startsWith('/logs')) return 'Logs de Auditoria'
    if (location.pathname.startsWith('/documentacao')) return 'Documentação da API v1'
    return 'Painel de Integração'
  }

  const userInitial = user?.name ? user.name.charAt(0).toUpperCase() : 'A'

  return (
    <div className="flex min-h-screen bg-[#F8FAFC] text-[#1E293B]">
      {/* Sidebar Desktop */}
      <aside className="hidden lg:flex w-64 flex-col border-r border-slate-200 bg-white shadow-sm fixed inset-y-0 left-0 z-30">
        {/* Brand header */}
        <div className="flex items-center gap-3 px-6 h-16 border-b border-slate-100">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-[#0F766E] text-white shadow-sm">
            <Layers className="h-5 w-5" />
          </div>
          <div className="flex flex-col">
            <span className="font-semibold text-sm tracking-tight text-slate-900">
              Consultor Digital
            </span>
            <span className="text-[11px] font-medium text-teal-700">Camada de Integração v1</span>
          </div>
        </div>

        {/* Server & Endpoint Status Pill */}
        <div className="px-4 py-3 border-b border-slate-100 bg-slate-50/70">
          <div className="flex items-center justify-between text-xs text-slate-600 mb-1">
            <span className="flex items-center gap-1.5 font-medium">
              <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
              API Server-to-Server
            </span>
            <Badge
              variant="outline"
              className="text-[10px] bg-white border-teal-200 text-teal-800 font-mono"
            >
              v1.0.0
            </Badge>
          </div>
          <p
            className="text-[11px] text-slate-500 font-mono truncate"
            title={INTEGRATION_CONFIG.publicEndpointPath}
          >
            POST {INTEGRATION_CONFIG.publicEndpointPath}
          </p>
        </div>

        {/* Navigation list */}
        <nav className="flex-1 px-3 py-4 space-y-1">
          {navItems.map((item) => {
            const Icon = item.icon
            const isActive = location.pathname === item.to
            return (
              <NavLink
                key={item.to}
                to={item.to}
                className={`flex items-center gap-3 px-3 py-2.5 rounded-md text-sm font-medium transition-colors ${
                  isActive
                    ? 'bg-[#0F766E] text-white shadow-xs'
                    : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
                }`}
              >
                <Icon className={`h-4 w-4 ${isActive ? 'text-white' : 'text-slate-500'}`} />
                {item.label}
              </NavLink>
            )
          })}
        </nav>

        {/* Security Info */}
        <div className="p-3 mx-3 mb-3 rounded-lg bg-teal-50/80 border border-teal-100 text-[11px] text-teal-900">
          <div className="flex items-center gap-1.5 font-semibold text-teal-800 mb-1">
            <ShieldCheck className="h-3.5 w-3.5 text-teal-700" />
            Autenticação X-API-Key
          </div>
          <p className="text-slate-600 leading-relaxed">
            Apenas requisições autenticadas com chave de servidor têm acesso ao registro de leads.
          </p>
        </div>

        {/* Admin Footer */}
        <div className="p-3 border-t border-slate-100 flex items-center justify-between">
          <div className="flex items-center gap-2.5 min-w-0">
            <Avatar className="h-8 w-8 border border-slate-200">
              <AvatarFallback className="bg-slate-100 text-xs font-semibold text-slate-700">
                {userInitial}
              </AvatarFallback>
            </Avatar>
            <div className="min-w-0 flex-1">
              <p className="text-xs font-semibold text-slate-800 truncate">
                {user?.name || 'Administrador'}
              </p>
              <p className="text-[10px] text-slate-500 truncate" title={user?.email}>
                {user?.email || 'admin@consultor.dev'}
              </p>
            </div>
          </div>
          <Button
            variant="ghost"
            size="icon"
            onClick={handleLogout}
            title="Sair do painel"
            className="text-slate-500 hover:text-red-600 hover:bg-red-50 h-8 w-8"
          >
            <LogOut className="h-4 w-4" />
          </Button>
        </div>
      </aside>

      {/* Main Container */}
      <div className="flex-1 flex flex-col lg:pl-64 min-w-0 pb-16 lg:pb-0">
        {/* Top Header */}
        <header className="sticky top-0 z-20 flex h-16 items-center justify-between border-b border-slate-200 bg-white/95 backdrop-blur px-4 sm:px-6 shadow-2xs">
          <div className="flex items-center gap-3">
            {/* Mobile menu trigger */}
            <Button
              variant="ghost"
              size="icon"
              className="lg:hidden text-slate-600"
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            >
              {mobileMenuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
            </Button>
            <h1 className="text-base sm:text-lg font-semibold text-slate-900 tracking-tight">
              {getPageTitle()}
            </h1>
          </div>

          <div className="flex items-center gap-2 sm:gap-3">
            {/* Status chip */}
            <div className="hidden sm:flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-medium">
              <span className="h-2 w-2 rounded-full bg-emerald-500" />
              v1 Operacional
            </div>

            {/* Quick link doc */}
            <Button
              variant="outline"
              size="sm"
              onClick={() => navigate('/documentacao')}
              className="hidden md:flex items-center gap-1.5 text-xs text-slate-700 border-slate-200"
            >
              <Server className="h-3.5 w-3.5 text-[#0F766E]" />
              Contrato da API
            </Button>

            {/* User Dropdown */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" className="relative h-9 w-9 rounded-full p-0">
                  <Avatar className="h-9 w-9 border border-slate-200">
                    <AvatarFallback className="bg-teal-50 text-[#0F766E] font-medium text-xs">
                      {userInitial}
                    </AvatarFallback>
                  </Avatar>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56">
                <DropdownMenuLabel className="font-normal">
                  <div className="flex flex-col space-y-1">
                    <p className="text-sm font-medium leading-none">
                      {user?.name || 'Administrador'}
                    </p>
                    <p className="text-xs leading-none text-muted-foreground truncate">
                      {user?.email}
                    </p>
                  </div>
                </DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  onClick={() => navigate('/documentacao')}
                  className="cursor-pointer"
                >
                  <ExternalLink className="mr-2 h-4 w-4 text-slate-500" />
                  <span>Ver Contrato HTTP</span>
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  onClick={handleLogout}
                  className="cursor-pointer text-red-600 focus:text-red-600"
                >
                  <LogOut className="mr-2 h-4 w-4" />
                  <span>Sair do painel</span>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </header>

        {/* Mobile Dropdown Menu if toggled */}
        {mobileMenuOpen && (
          <div className="lg:hidden border-b border-slate-200 bg-white px-4 py-3 space-y-1 shadow-sm">
            {navItems.map((item) => {
              const Icon = item.icon
              const isActive = location.pathname === item.to
              return (
                <NavLink
                  key={item.to}
                  to={item.to}
                  onClick={() => setMobileMenuOpen(false)}
                  className={`flex items-center gap-3 px-3 py-2 rounded-md text-sm font-medium ${
                    isActive ? 'bg-[#0F766E] text-white' : 'text-slate-600 hover:bg-slate-100'
                  }`}
                >
                  <Icon className="h-4 w-4" />
                  {item.label}
                </NavLink>
              )
            })}
          </div>
        )}

        {/* Page Content */}
        <main className="flex-1 p-4 sm:p-6 max-w-7xl w-full mx-auto animate-fade-in-up">
          <Outlet />
        </main>

        {/* Footer */}
        <footer className="border-t border-slate-200 bg-white py-4 px-6 text-center text-xs text-slate-500">
          <p>
            Camada de Integração do Consultor Digital • v1.0.0 • PocketBase + React • Skip Cloud
          </p>
        </footer>
      </div>

      {/* Mobile Bottom Navigation (0-640px) */}
      <nav className="lg:hidden fixed bottom-0 left-0 right-0 z-30 h-14 bg-white border-t border-slate-200 flex items-center justify-around px-2 shadow-lg">
        {navItems.map((item) => {
          const Icon = item.icon
          const isActive = location.pathname === item.to
          return (
            <NavLink
              key={item.to}
              to={item.to}
              className={`flex flex-col items-center justify-center flex-1 py-1 text-[11px] font-medium transition-colors ${
                isActive ? 'text-[#0F766E]' : 'text-slate-500 hover:text-slate-900'
              }`}
            >
              <Icon className="h-4 w-4 mb-0.5" />
              <span>{item.label}</span>
            </NavLink>
          )
        })}
      </nav>
    </div>
  )
}
