import { Routes, Route, NavLink, Navigate, Link, Outlet } from 'react-router-dom'
import { LayoutDashboard, Users, Trophy, UserPlus, BarChart3, Brain, LogOut, Gamepad2, TrendingUp, Target, Star } from 'lucide-react'
import { AuthProvider, useAuth } from './auth'

// Pages — public
import Home from './pages/Home'
import StudentApply from './pages/student/StudentApply'
import StudentInterview from './pages/student/StudentInterview'
import StudentStatus from './pages/student/StudentStatus'
import StudentVideoInterview from './pages/student/StudentVideoInterview'
import AdminLogin from './pages/AdminLogin'

// Pages — admin
import Dashboard from './pages/Dashboard'
import CandidateList from './pages/CandidateList'
import CandidateDetail from './pages/CandidateDetail'
import Ranking from './pages/Ranking'
import AddCandidate from './pages/AddCandidate'
import AiAnalysis from './pages/AiAnalysis'
import GameCasesPage from './pages/GameCasesPage'
import ProgressDashboard from './pages/ProgressDashboard'
import LeaderboardPage from './pages/LeaderboardPage'
import ExplainableResult from './pages/ExplainableResult'
import DecisionSimulator from './pages/DecisionSimulator'
import AICoach from './pages/AICoach'

export default function App() {
  return (
    <AuthProvider>
      <Routes>
        {/* Public pages */}
        <Route path="/" element={<Home />} />
        <Route path="/apply" element={<PublicPage><StudentApply /></PublicPage>} />
        <Route path="/status" element={<PublicPage><StudentStatus /></PublicPage>} />
        <Route path="/interview/:id" element={<PublicPage><StudentInterview /></PublicPage>} />
        <Route path="/video-interview/:id" element={<PublicPage><StudentVideoInterview /></PublicPage>} />

        {/* Admin login */}
        <Route path="/admin/login" element={<AdminLogin />} />

        {/* Admin panel (protected) */}
        <Route path="/admin" element={<ProtectedRoute><AdminLayout /></ProtectedRoute>}>
          <Route index element={<Dashboard />} />
          <Route path="candidates" element={<CandidateList />} />
          <Route path="candidates/:id" element={<CandidateDetail />} />
          <Route path="candidates/:id/ai" element={<AiAnalysis />} />
          <Route path="ranking" element={<Ranking />} />
          <Route path="add" element={<AddCandidate />} />
          <Route path="games" element={<GameCasesPage />} />
          <Route path="progress" element={<ProgressDashboard />} />
          <Route path="leaderboard" element={<LeaderboardPage />} />
          <Route path="explainable" element={<ExplainableResult />} />
          <Route path="simulator" element={<DecisionSimulator />} />
          <Route path="coach" element={<AICoach />} />
        </Route>
      </Routes>
    </AuthProvider>
  )
}

function ProtectedRoute({ children }) {
  const { user, loading } = useAuth();
  if (loading) return <div className="min-h-screen flex items-center justify-center"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600" /></div>;
  if (!user) return <Navigate to="/admin/login" replace />;
  return children;
}

function PublicPage({ children }) {
  return (
    <div className="min-h-screen bg-slate-50">
      <header className="bg-white border-b border-slate-200 sticky top-0 z-50">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-14">
            <Link to="/" className="flex items-center gap-2 text-slate-900 font-bold">
              <div className="w-8 h-8 bg-primary-600 rounded-lg flex items-center justify-center">
                <BarChart3 className="w-4 h-4 text-white" />
              </div>
              inVision U
            </Link>
            <div className="flex items-center gap-2">
              <Link to="/apply" className="text-sm text-slate-600 hover:text-slate-900 px-3 py-1.5 rounded-lg hover:bg-slate-50">Заявка</Link>
              <Link to="/status" className="text-sm text-slate-600 hover:text-slate-900 px-3 py-1.5 rounded-lg hover:bg-slate-50">Статус</Link>
            </div>
          </div>
        </div>
      </header>
      <main className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8">{children}</main>
    </div>
  )
}

const adminNav = [
  { to: '/admin', icon: LayoutDashboard, label: 'Дашборд', end: true },
  { to: '/admin/candidates', icon: Users, label: 'Кандидаты' },
  { to: '/admin/ranking', icon: Trophy, label: 'Рейтинг' },
  { to: '/admin/add', icon: UserPlus, label: 'Добавить' },
  { to: '/admin/games', icon: Gamepad2, label: 'Кейсы' },
  { to: '/admin/progress', icon: TrendingUp, label: 'Прогресс' },
  { to: '/admin/leaderboard', icon: Trophy, label: 'Лидерборд' },
  { to: '/admin/explainable', icon: Brain, label: 'Объяснение' },
  { to: '/admin/simulator', icon: Target, label: 'Симулятор' },
  { to: '/admin/coach', icon: Star, label: 'AI Коуч' }
]

function AdminLayout() {
  const { user, logout } = useAuth();

  return (
    <div className="min-h-screen bg-slate-50">
      <header className="bg-white border-b border-slate-200 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <Link to="/admin" className="flex items-center gap-3">
              <div className="w-9 h-9 bg-primary-600 rounded-lg flex items-center justify-center">
                <BarChart3 className="w-5 h-5 text-white" />
              </div>
              <div>
                <h1 className="text-lg font-bold text-slate-900">inVision U</h1>
                <p className="text-xs text-slate-500 -mt-0.5">Панель комиссии</p>
              </div>
            </Link>
            <div className="flex items-center gap-1">
              <nav className="flex items-center gap-1">
                {adminNav.map(({ to, icon: Icon, label, end }) => (
                  <NavLink
                    key={to} to={to} end={end}
                    className={({ isActive }) =>
                      `flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                        isActive ? 'bg-primary-50 text-primary-700' : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
                      }`
                    }
                  >
                    <Icon className="w-4 h-4" />
                    <span className="hidden sm:inline">{label}</span>
                  </NavLink>
                ))}
              </nav>
              <div className="w-px h-6 bg-slate-200 mx-2" />
              <span className="text-xs text-slate-500 hidden sm:block">{user?.username}</span>
              <button onClick={logout} className="flex items-center gap-1 px-2 py-2 text-sm text-slate-400 hover:text-red-600 rounded-lg hover:bg-slate-50" title="Выйти">
                <LogOut className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      </header>
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <Outlet />
      </main>
      <footer className="border-t border-slate-200 bg-white mt-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <p className="text-center text-xs text-slate-400">
            inVision U AI Screening — Decentrathon 5.0 | Human-in-the-loop
          </p>
        </div>
      </footer>
    </div>
  )
}
