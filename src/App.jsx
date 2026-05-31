import { useState, useEffect } from "react"
import {
  Routes,
  Route,
  NavLink,
  Navigate,
  useNavigate,
} from "react-router-dom"

import { supabase } from "./services/supabaseClient"

import MapView from "./components/MapView"
import ThreatChart from "./components/ThreatChart"
import SystemStatus from "./components/SystemStatus"

import Border from "./pages/Border"
import Maritime from "./pages/Maritime"
import Airspace from "./pages/Airspace"
import Infrastructure from "./pages/Infrastructure"
import Sharing from "./pages/Sharing"
import Audit from "./pages/Audit"
import Threats from "./pages/Threats"
import MyThreats from "./pages/MyThreats"
import Analytics from "./pages/Analytics"
import Admin from "./pages/Admin"
import Notifications from "./pages/Notifications"
import Login from "./pages/Login"

import {
  Shield,
  Radar,
  Ship,
  Plane,
  RadioTower,
  Lock,
  Activity,
  AlertTriangle,
  LogOut,
  ClipboardList,
  BarChart3,
  Users,
  UserCheck,
  Bell,
  Menu,
  X,
} from "lucide-react"

function App() {
  const navigate = useNavigate()

  const [user, setUser] = useState(() => {
    const savedUser = localStorage.getItem("geoint_user")
    return savedUser ? JSON.parse(savedUser) : null
  })

  function handleLogout() {
    localStorage.removeItem("geoint_user")
    setUser(null)
    navigate("/login")
  }

  useEffect(() => {
    const savedUser = localStorage.getItem("geoint_user")
    if (savedUser) {
      setUser(JSON.parse(savedUser))
    }
  }, [])

  return (
    <Routes>
      <Route path="/login" element={<Login />} />

      <Route
        path="/*"
        element={
          user ? (
            <SecureLayout user={user} onLogout={handleLogout} />
          ) : (
            <Navigate to="/login" replace />
          )
        }
      />
    </Routes>
  )
}

function SecureLayout({ user, onLogout }) {
  const [unreadCount, setUnreadCount] = useState(0)
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)

  useEffect(() => {
    fetchUnreadNotifications()

    const channel = supabase
      .channel("sidebar-notifications")
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "notifications",
        },
        () => {
          fetchUnreadNotifications()
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [])

  async function fetchUnreadNotifications() {
    const { count } = await supabase
      .from("notifications")
      .select("*", { count: "exact", head: true })
      .eq("is_read", false)

    setUnreadCount(count || 0)
  }

  function closeMobileMenu() {
    setMobileMenuOpen(false)
  }

  return (
    <div className="min-h-screen bg-slate-950 text-white flex">
      <aside className="w-72 bg-slate-900 border-r border-slate-800 p-6 hidden md:block fixed left-0 top-0 h-screen overflow-y-auto">
        <SidebarContent
          unreadCount={unreadCount}
          onLogout={onLogout}
          onNavigate={closeMobileMenu}
        />
      </aside>

      {mobileMenuOpen && (
        <div
          className="fixed inset-0 bg-black/70 z-40 md:hidden"
          onClick={closeMobileMenu}
        />
      )}

      <aside
        className={`fixed top-0 left-0 h-screen w-72 bg-slate-900 border-r border-slate-800 p-6 z-50 overflow-y-auto transform transition-transform duration-300 md:hidden ${
          mobileMenuOpen ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        <div className="flex justify-end mb-4">
          <button
            onClick={closeMobileMenu}
            className="text-slate-400 hover:text-white"
          >
            <X size={24} />
          </button>
        </div>

        <SidebarContent
          unreadCount={unreadCount}
          onLogout={onLogout}
          onNavigate={closeMobileMenu}
        />
      </aside>

      <main className="flex-1 md:ml-72 p-4 md:p-6 min-w-0">
        <header className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-8">
          <div className="flex items-start gap-4">
            <button
              onClick={() => setMobileMenuOpen(true)}
              className="md:hidden bg-slate-900 border border-slate-800 p-3 rounded-xl text-slate-300"
            >
              <Menu size={22} />
            </button>

            <div>
              <h2 className="text-xl md:text-2xl font-bold">
                National Security Operations Center
              </h2>

              <p className="text-slate-400 text-sm">
                Real-time geospatial intelligence and threat monitoring
              </p>
            </div>
          </div>

          <div className="flex items-center justify-between md:justify-end gap-4 bg-slate-900 md:bg-transparent border border-slate-800 md:border-0 rounded-2xl p-3 md:p-0">
            <div className="text-left md:text-right">
              <p className="font-semibold">{user.name}</p>
              <p className="text-xs text-slate-400">
                {user.role} • Clearance {user.clearance}
              </p>
            </div>

            <div className="w-11 h-11 md:w-12 md:h-12 rounded-full bg-emerald-500 flex items-center justify-center font-bold text-slate-950">
              {user.initial}
            </div>
          </div>
        </header>

        <div className="overflow-x-hidden">
          <Routes>
            <Route path="/" element={<Dashboard />} />
            <Route path="/threats" element={<Threats />} />
            <Route path="/my-threats" element={<MyThreats />} />
            <Route path="/analytics" element={<Analytics />} />
            <Route path="/admin" element={<Admin />} />
            <Route path="/notifications" element={<Notifications />} />
            <Route path="/border" element={<Border />} />
            <Route path="/maritime" element={<Maritime />} />
            <Route path="/airspace" element={<Airspace />} />
            <Route path="/infrastructure" element={<Infrastructure />} />
            <Route path="/sharing" element={<Sharing />} />
            <Route path="/audit" element={<Audit />} />
          </Routes>
        </div>
      </main>
    </div>
  )
}

function SidebarContent({ unreadCount, onLogout, onNavigate }) {
  return (
    <>
      <div className="flex items-center gap-3 mb-10">
        <div className="bg-emerald-500 p-2 rounded-xl">
          <Shield className="text-slate-950" size={26} />
        </div>

        <div>
          <h1 className="font-bold text-lg">GEOINT Suite</h1>
          <p className="text-xs text-slate-400">
            Defense Intelligence System
          </p>
        </div>
      </div>

      <nav className="space-y-3">
        <MenuItem to="/" icon={<Activity size={18} />} text="Threat Dashboard" onNavigate={onNavigate} />
        <MenuItem to="/threats" icon={<AlertTriangle size={18} />} text="Threat Management" onNavigate={onNavigate} />
        <MenuItem to="/my-threats" icon={<UserCheck size={18} />} text="My Threats" onNavigate={onNavigate} />
        <MenuItem to="/analytics" icon={<BarChart3 size={18} />} text="Analytics Center" onNavigate={onNavigate} />
        <MenuItem to="/admin" icon={<Users size={18} />} text="Admin Management" onNavigate={onNavigate} />
        <MenuItem to="/notifications" icon={<Bell size={18} />} text={`Notifications ${unreadCount > 0 ? `(${unreadCount})` : ""}`} onNavigate={onNavigate} />
        <MenuItem to="/border" icon={<Radar size={18} />} text="Border Intelligence" onNavigate={onNavigate} />
        <MenuItem to="/maritime" icon={<Ship size={18} />} text="Maritime Awareness" onNavigate={onNavigate} />
        <MenuItem to="/airspace" icon={<Plane size={18} />} text="Airspace Monitoring" onNavigate={onNavigate} />
        <MenuItem to="/infrastructure" icon={<RadioTower size={18} />} text="Critical Infrastructure" onNavigate={onNavigate} />
        <MenuItem to="/sharing" icon={<Lock size={18} />} text="Secure Sharing" onNavigate={onNavigate} />
        <MenuItem to="/audit" icon={<ClipboardList size={18} />} text="Audit Center" onNavigate={onNavigate} />
      </nav>

      <button
        onClick={onLogout}
        className="mt-10 w-full flex items-center justify-center gap-2 bg-red-500/10 text-red-400 border border-red-500/30 py-3 rounded-xl hover:bg-red-500/20 transition"
      >
        <LogOut size={18} />
        Logout
      </button>
    </>
  )
}

function Dashboard() {
  const [metrics, setMetrics] = useState({
    activeThreats: 0,
    criticalThreats: 0,
    resolvedThreats: 0,
    sharedReports: 0,
  })

  const [alerts, setAlerts] = useState([
    { level: "Critical", text: "Unauthorized movement near border sector B-12" },
    { level: "High", text: "Unknown vessel detected near coastal route" },
    { level: "Medium", text: "Drone activity reported near infrastructure zone" },
    { level: "Low", text: "Routine satellite image update completed" },
  ])

  useEffect(() => {
    fetchDashboardMetrics()

    const alertsInterval = setInterval(() => {
      const randomAlerts = [
        "Satellite detected suspicious movement",
        "Airspace anomaly detected",
        "Maritime signal interruption",
        "Border checkpoint activity spike",
        "Infrastructure security warning",
      ]

      const randomText =
        randomAlerts[Math.floor(Math.random() * randomAlerts.length)]

      setAlerts((prev) => [
        { level: "Live", text: randomText },
        ...prev.slice(0, 4),
      ])
    }, 5000)

    const threatChannel = supabase
      .channel("dashboard-threat-kpis")
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "threats",
        },
        () => {
          fetchDashboardMetrics()
        }
      )
      .subscribe()

    const reportChannel = supabase
      .channel("dashboard-report-kpis")
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "intelligence_reports",
        },
        () => {
          fetchDashboardMetrics()
        }
      )
      .subscribe()

    return () => {
      clearInterval(alertsInterval)
      supabase.removeChannel(threatChannel)
      supabase.removeChannel(reportChannel)
    }
  }, [])

  async function fetchDashboardMetrics() {
    const { count: activeThreats } = await supabase
      .from("threats")
      .select("*", { count: "exact", head: true })
      .neq("status", "Resolved")

    const { count: criticalThreats } = await supabase
      .from("threats")
      .select("*", { count: "exact", head: true })
      .eq("priority", "Critical")

    const { count: resolvedThreats } = await supabase
      .from("threats")
      .select("*", { count: "exact", head: true })
      .eq("status", "Resolved")

    const { count: sharedReports } = await supabase
      .from("intelligence_reports")
      .select("*", { count: "exact", head: true })

    setMetrics({
      activeThreats: activeThreats || 0,
      criticalThreats: criticalThreats || 0,
      resolvedThreats: resolvedThreats || 0,
      sharedReports: sharedReports || 0,
    })
  }

  return (
    <>
      <section className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-5 mb-8">
        <StatCard title="Active Threats" value={metrics.activeThreats} status="Open / Investigating" />
        <StatCard title="Critical Threats" value={metrics.criticalThreats} status="Highest Priority" />
        <StatCard title="Resolved Threats" value={metrics.resolvedThreats} status="Closed Cases" />
        <StatCard title="Shared Reports" value={metrics.sharedReports} status="Secure Documents" />
      </section>

      <section className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        <div className="xl:col-span-2 bg-slate-900 border border-slate-800 rounded-2xl p-4 md:p-6 min-w-0">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 mb-5">
            <h3 className="font-semibold text-lg">
              Threat Intelligence Overview
            </h3>

            <span className="text-xs text-emerald-400 animate-pulse">
              Realtime Active
            </span>
          </div>

          <MapView />
        </div>

        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 md:p-6">
          <h3 className="font-semibold text-lg mb-5">Real-Time Alerts</h3>

          {alerts.map((alert, index) => (
            <AlertItem key={index} level={alert.level} text={alert.text} />
          ))}
        </div>
      </section>

      <div className="overflow-x-auto">
        <ThreatChart />
      </div>

      <SystemStatus />
    </>
  )
}

function MenuItem({ to, icon, text, onNavigate }) {
  return (
    <NavLink
      to={to}
      onClick={onNavigate}
      className={({ isActive }) =>
        `flex items-center gap-3 px-4 py-3 rounded-xl text-sm cursor-pointer ${
          isActive
            ? "bg-emerald-500 text-slate-950 font-semibold"
            : "text-slate-300 hover:bg-slate-800"
        }`
      }
    >
      {icon}
      <span>{text}</span>
    </NavLink>
  )
}

function StatCard({ title, value, status }) {
  return (
    <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5">
      <p className="text-slate-400 text-sm">{title}</p>
      <h3 className="text-3xl font-bold mt-2">{value}</h3>
      <p className="text-emerald-400 text-xs mt-3">{status}</p>
    </div>
  )
}

function AlertItem({ level, text }) {
  return (
    <div className="border border-slate-800 bg-slate-950 rounded-xl p-4 mb-3">
      <div className="flex items-center gap-2 mb-2">
        <AlertTriangle size={16} className="text-amber-400" />
        <span className="text-xs text-amber-400 font-semibold">{level}</span>
      </div>
      <p className="text-sm text-slate-300">{text}</p>
    </div>
  )
}

export default App