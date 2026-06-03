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
  Satellite,
  Radio,
  Sparkles,
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
    <div className="min-h-screen bg-slate-950 bg-ops-gradient text-white flex">
      <aside className="w-72 bg-slate-950/90 backdrop-blur-xl border-r border-white/10 p-5 hidden md:block fixed left-0 top-0 h-screen overflow-y-auto">
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
        className={`fixed top-0 left-0 h-screen w-72 bg-slate-950 border-r border-white/10 p-5 z-50 overflow-y-auto transform transition-transform duration-300 md:hidden ${
          mobileMenuOpen ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        <div className="flex justify-end mb-4">
          <button
            onClick={closeMobileMenu}
            className="text-slate-400 hover:text-white bg-white/5 border border-white/10 p-2 rounded-xl"
          >
            <X size={22} />
          </button>
        </div>

        <SidebarContent
          unreadCount={unreadCount}
          onLogout={onLogout}
          onNavigate={closeMobileMenu}
        />
      </aside>

      <main className="flex-1 md:ml-72 p-4 md:p-6 min-w-0">
        <header className="sticky top-0 z-30 mb-8 bg-slate-950/75 backdrop-blur-xl border border-white/10 rounded-3xl p-4 shadow-card">
          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-5">
            <div className="flex items-start gap-4">
              <button
                onClick={() => setMobileMenuOpen(true)}
                className="md:hidden bg-white/5 border border-white/10 p-3 rounded-2xl text-slate-300 hover:text-white"
              >
                <Menu size={22} />
              </button>

              <div>
                <div className="flex flex-wrap items-center gap-3 mb-2">
                  <span className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-300 text-xs font-semibold">
                    <Radio size={13} />
                    Live Operations
                  </span>

                  <span className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-500/10 border border-blue-500/20 text-blue-300 text-xs font-semibold">
                    <Satellite size={13} />
                    GEOINT Enabled
                  </span>
                </div>

                <h2 className="text-xl md:text-3xl font-black tracking-tight">
                  National Security Operations Center
                </h2>

                <p className="text-slate-400 text-sm mt-1">
                  Real-time geospatial intelligence, threat monitoring and operational response.
                </p>
              </div>
            </div>

            <div className="flex items-center justify-between lg:justify-end gap-4 bg-white/5 border border-white/10 rounded-2xl p-3">
              <div className="text-left lg:text-right">
                <p className="font-bold">{user.name}</p>
                <p className="text-xs text-slate-400">
                  {user.role} • Clearance {user.clearance}
                </p>
              </div>

              <div className="w-11 h-11 md:w-12 md:h-12 rounded-2xl bg-gradient-to-br from-emerald-400 to-cyan-400 flex items-center justify-center font-black text-slate-950 shadow-glow">
                {user.initial}
              </div>
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
      <div className="mb-8">
        <div className="flex items-center gap-3 mb-5">
          <div className="bg-gradient-to-br from-emerald-400 to-cyan-400 p-3 rounded-2xl shadow-glow">
            <Shield className="text-slate-950" size={26} />
          </div>

          <div>
            <h1 className="font-black text-xl tracking-tight">GEOINT Suite</h1>
            <p className="text-xs text-slate-400">Defense Intelligence System</p>
          </div>
        </div>

        <div className="rounded-2xl bg-white/5 border border-white/10 p-4">
          <p className="text-xs text-slate-500 mb-2">SYSTEM STATUS</p>
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 bg-emerald-400 rounded-full animate-pulse"></span>
            <p className="text-sm font-semibold text-emerald-300">
              Operational
            </p>
          </div>
        </div>
      </div>

      <nav className="space-y-2">
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
        className="mt-8 w-full flex items-center justify-center gap-2 bg-red-500/10 text-red-300 border border-red-500/20 py-3 rounded-2xl hover:bg-red-500/20 transition"
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

  const [alerts, setAlerts] = useState([])

  useEffect(() => {
    fetchDashboardMetrics()
    fetchRealtimeAlerts()

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

    const alertChannel = supabase
      .channel("dashboard-realtime-alerts")
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "notifications",
        },
        (payload) => {
          const notification = payload.new

          setAlerts((prev) => [
            {
              level: formatAlertLevel(notification.notification_type),
              text: notification.message || notification.title,
              title: notification.title,
              time: notification.created_at,
            },
            ...prev.slice(0, 4),
          ])
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(threatChannel)
      supabase.removeChannel(reportChannel)
      supabase.removeChannel(alertChannel)
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

  async function fetchRealtimeAlerts() {
    const { data, error } = await supabase
      .from("notifications")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(5)

    if (error) return

    setAlerts(
      (data || []).map((notification) => ({
        level: formatAlertLevel(notification.notification_type),
        text: notification.message || notification.title,
        title: notification.title,
        time: notification.created_at,
      }))
    )
  }

  return (
    <>
      <section className="mb-8 rounded-3xl bg-slate-900/70 border border-white/10 p-5 md:p-7 shadow-card overflow-hidden relative">
        <div className="absolute -top-20 -right-20 w-64 h-64 bg-emerald-500/10 rounded-full blur-3xl"></div>

        <div className="relative flex flex-col lg:flex-row lg:items-center lg:justify-between gap-6">
          <div>
            <p className="text-emerald-300 text-sm font-bold mb-2 flex items-center gap-2">
              <Sparkles size={16} />
              Command Intelligence Dashboard
            </p>

            <h1 className="text-3xl md:text-5xl font-black tracking-tight">
              GEOINT Operations Overview
            </h1>

            <p className="text-slate-400 mt-3 max-w-3xl">
              Monitor active threats, satellite map intelligence, operational alerts,
              reports and domain-level security activities from one command center.
            </p>
          </div>

          <div className="grid grid-cols-2 gap-3 min-w-[260px]">
            <MiniStatus label="Realtime" value="Active" />
            <MiniStatus label="Map Layer" value="Satellite" />
            <MiniStatus label="Backend" value="Supabase" />
            <MiniStatus label="Security" value="RBAC" />
          </div>
        </div>
      </section>

      <section className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-5 mb-8">
        <StatCard
          title="Active Threats"
          value={metrics.activeThreats}
          status="Open / Investigating"
          tone="emerald"
        />

        <StatCard
          title="Critical Threats"
          value={metrics.criticalThreats}
          status="Highest Priority"
          tone="red"
        />

        <StatCard
          title="Resolved Threats"
          value={metrics.resolvedThreats}
          status="Closed Cases"
          tone="blue"
        />

        <StatCard
          title="Shared Reports"
          value={metrics.sharedReports}
          status="Secure Documents"
          tone="purple"
        />
      </section>

      <section className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        <div className="xl:col-span-2 bg-slate-900/80 border border-white/10 rounded-3xl p-4 md:p-6 min-w-0 shadow-card">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 mb-5">
            <div>
              <h3 className="font-black text-xl">Threat Intelligence Map</h3>
              <p className="text-slate-500 text-sm">
                Satellite, heatmap, terrain and realtime threat markers.
              </p>
            </div>

            <span className="inline-flex items-center gap-2 text-xs text-emerald-300 bg-emerald-500/10 border border-emerald-500/20 px-3 py-2 rounded-full">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
              Realtime Active
            </span>
          </div>

          <MapView />
        </div>

        <div className="bg-slate-900/80 border border-white/10 rounded-3xl p-4 md:p-6 shadow-card">
          <div className="flex items-center justify-between mb-5">
            <div>
              <h3 className="font-black text-xl">Real-Time Alerts</h3>
              <p className="text-slate-500 text-sm">
                Live notifications from platform activity.
              </p>
            </div>

            <Bell className="text-emerald-300" size={22} />
          </div>

          {alerts.length === 0 ? (
            <p className="text-slate-500 text-sm">
              No realtime alerts yet. Create a threat, report, user, or NASA event alert to see activity here.
            </p>
          ) : (
            alerts.map((alert, index) => (
              <AlertItem
                key={index}
                level={alert.level}
                title={alert.title}
                text={alert.text}
                time={alert.time}
              />
            ))
          )}
        </div>
      </section>

      <div className="overflow-x-auto mt-6 bg-slate-900/70 border border-white/10 rounded-3xl p-4 shadow-card">
        <ThreatChart />
      </div>

      <div className="mt-6">
        <SystemStatus />
      </div>
    </>
  )
}

function MenuItem({ to, icon, text, onNavigate }) {
  return (
    <NavLink
      to={to}
      onClick={onNavigate}
      className={({ isActive }) =>
        `group flex items-center gap-3 px-4 py-3 rounded-2xl text-sm cursor-pointer transition ${
          isActive
            ? "bg-gradient-to-r from-emerald-400 to-cyan-400 text-slate-950 font-black shadow-glow"
            : "text-slate-300 hover:bg-white/5 hover:text-white"
        }`
      }
    >
      {icon}
      <span>{text}</span>
    </NavLink>
  )
}

function MiniStatus({ label, value }) {
  return (
    <div className="bg-white/5 border border-white/10 rounded-2xl p-4">
      <p className="text-slate-500 text-xs">{label}</p>
      <p className="font-black text-sm text-slate-100 mt-1">{value}</p>
    </div>
  )
}

function StatCard({ title, value, status, tone }) {
  const tones = {
    emerald: "from-emerald-500/20 to-emerald-500/5 text-emerald-300",
    red: "from-red-500/20 to-red-500/5 text-red-300",
    blue: "from-blue-500/20 to-blue-500/5 text-blue-300",
    purple: "from-purple-500/20 to-purple-500/5 text-purple-300",
  }

  return (
    <div className="relative overflow-hidden bg-slate-900/80 border border-white/10 rounded-3xl p-5 shadow-card">
      <div className={`absolute inset-0 bg-gradient-to-br ${tones[tone] || tones.emerald} opacity-70`}></div>

      <div className="relative">
        <p className="text-slate-400 text-sm">{title}</p>
        <h3 className="text-4xl font-black mt-3">{value}</h3>
        <p className={`${(tones[tone] || tones.emerald).split(" ").pop()} text-xs mt-4 font-semibold`}>
          {status}
        </p>
      </div>
    </div>
  )
}

function AlertItem({ level, title, text, time }) {
  return (
    <div className="border border-white/10 bg-slate-950/80 rounded-2xl p-4 mb-3 hover:border-emerald-500/30 transition">
      <div className="flex items-center gap-2 mb-2">
        <AlertTriangle size={16} className="text-amber-300" />
        <span className="text-xs text-amber-300 font-black">{level}</span>
      </div>

      {title && (
        <p className="text-sm font-bold text-slate-100 mb-1">
          {title}
        </p>
      )}

      <p className="text-sm text-slate-300">{text}</p>

      {time && (
        <p className="text-xs text-slate-500 mt-2">
          {new Date(time).toLocaleString()}
        </p>
      )}
    </div>
  )
}

function formatAlertLevel(type) {
  if (type === "threat") return "Threat"
  if (type === "assignment") return "Assignment"
  if (type === "status") return "Status"
  if (type === "evidence") return "Evidence"
  if (type === "note") return "Investigation"
  if (type === "report") return "Report"
  if (type === "user") return "User"
  if (type === "nasa") return "NASA"
  if (type === "weather") return "Weather"
  return "Live"
}

export default App