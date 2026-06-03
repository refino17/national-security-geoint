import { useEffect, useState } from "react"
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  AreaChart,
  Area,
  CartesianGrid,
} from "recharts"
import {
  AlertTriangle,
  Activity,
  ShieldCheck,
  MapPin,
  BarChart3,
  Target,
} from "lucide-react"
import { supabase } from "../services/supabaseClient"

function Analytics() {
  const [threats, setThreats] = useState([])

  useEffect(() => {
    fetchThreats()

    const channel = supabase
      .channel("analytics-threats")
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "threats",
        },
        () => {
          fetchThreats()
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [])

  async function fetchThreats() {
    const { data, error } = await supabase
      .from("threats")
      .select("*")
      .order("created_at", { ascending: true })

    if (!error) setThreats(data || [])
  }

  const totalThreats = threats.length
  const criticalThreats = threats.filter((t) => t.priority === "Critical").length
  const openThreats = threats.filter((t) => t.status === "Open").length
  const resolvedThreats = threats.filter((t) => t.status === "Resolved").length

  const resolutionRate =
    totalThreats === 0 ? 0 : Math.round((resolvedThreats / totalThreats) * 100)

  const criticalRate =
    totalThreats === 0 ? 0 : Math.round((criticalThreats / totalThreats) * 100)

  const readinessScore = Math.max(
    0,
    Math.min(100, 100 - criticalRate - openThreats * 3 + resolutionRate)
  )

  const priorityData = ["Low", "Medium", "High", "Critical"].map((priority) => ({
    name: priority,
    value: threats.filter((t) => t.priority === priority).length,
  }))

  const statusData = ["Open", "Investigating", "Resolved"].map((status) => ({
    name: status,
    value: threats.filter((t) => t.status === status).length,
  }))

  const locationData = Object.values(
    threats.reduce((acc, threat) => {
      const key = threat.location || "Unknown"

      if (!acc[key]) {
        acc[key] = {
          name: key,
          threats: 0,
          critical: 0,
          open: 0,
        }
      }

      acc[key].threats += 1

      if (threat.priority === "Critical") {
        acc[key].critical += 1
      }

      if (threat.status !== "Resolved") {
        acc[key].open += 1
      }

      return acc
    }, {})
  ).sort((a, b) => b.threats - a.threats)

  const trendData = Object.values(
    threats.reduce((acc, threat) => {
      const date = threat.created_at
        ? new Date(threat.created_at).toLocaleDateString()
        : "Unknown"

      if (!acc[date]) {
        acc[date] = {
          date,
          threats: 0,
          critical: 0,
        }
      }

      acc[date].threats += 1

      if (threat.priority === "Critical") {
        acc[date].critical += 1
      }

      return acc
    }, {})
  )

  return (
    <div>
      <section className="mb-8 rounded-3xl bg-slate-900/70 border border-white/10 p-5 md:p-7 shadow-card relative overflow-hidden">
        <div className="absolute -top-20 -right-20 w-72 h-72 bg-blue-500/10 rounded-full blur-3xl"></div>

        <div className="relative flex flex-col lg:flex-row lg:items-center lg:justify-between gap-6">
          <div>
            <p className="text-blue-300 text-sm font-bold mb-2 flex items-center gap-2">
              <BarChart3 size={16} />
              Intelligence Analytics
            </p>

            <h1 className="text-3xl md:text-5xl font-black tracking-tight">
              Threat Analytics Center
            </h1>

            <p className="text-slate-400 mt-3 max-w-3xl">
              Analyze threat patterns, operational risk, priority distribution,
              case resolution and location-based activity using live Supabase data.
            </p>
          </div>

          <div className="bg-white/5 border border-white/10 rounded-3xl p-4 min-w-[240px]">
            <p className="text-xs text-slate-500">READINESS SCORE</p>
            <p className={`text-3xl font-black mt-1 ${scoreColor(readinessScore)}`}>
              {readinessScore}%
            </p>
          </div>
        </div>
      </section>

      <div className="grid md:grid-cols-4 gap-5 mb-8">
        <Card icon={<AlertTriangle />} title="Total Threats" value={totalThreats} color="text-red-300" />
        <Card icon={<Activity />} title="Critical Threats" value={criticalThreats} color="text-orange-300" />
        <Card icon={<MapPin />} title="Open Cases" value={openThreats} color="text-yellow-300" />
        <Card icon={<ShieldCheck />} title="Resolved" value={resolvedThreats} color="text-emerald-300" />
      </div>

      <div className="grid md:grid-cols-3 gap-5 mb-8">
        <MetricCard title="Resolution Rate" value={`${resolutionRate}%`} detail="Resolved cases compared to total threats" />
        <MetricCard title="Critical Exposure" value={`${criticalRate}%`} detail="Critical cases compared to total threats" />
        <MetricCard title="Hotspot Count" value={locationData.length} detail="Unique locations with threat records" />
      </div>

      <div className="grid xl:grid-cols-2 gap-6">
        <ChartCard title="Threat Trend Over Time">
          <ResponsiveContainer width="100%" height={320}>
            <AreaChart data={trendData}>
              <defs>
                <linearGradient id="threatGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#10b981" stopOpacity={0.45} />
                  <stop offset="95%" stopColor="#10b981" stopOpacity={0.05} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
              <XAxis dataKey="date" stroke="#94a3b8" />
              <YAxis stroke="#94a3b8" />
              <Tooltip contentStyle={tooltipStyle()} />
              <Area
                type="monotone"
                dataKey="threats"
                stroke="#10b981"
                fill="url(#threatGradient)"
                strokeWidth={3}
              />
            </AreaChart>
          </ResponsiveContainer>
        </ChartCard>

        <ChartCard title="Threats by Priority">
          <ResponsiveContainer width="100%" height={320}>
            <BarChart data={priorityData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
              <XAxis dataKey="name" stroke="#94a3b8" />
              <YAxis stroke="#94a3b8" />
              <Tooltip contentStyle={tooltipStyle()} />
              <Bar dataKey="value" radius={[12, 12, 0, 0]}>
                {priorityData.map((entry) => (
                  <Cell key={entry.name} fill={priorityColor(entry.name)} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>

        <ChartCard title="Threats by Status">
          <ResponsiveContainer width="100%" height={320}>
            <PieChart>
              <Pie
                data={statusData}
                dataKey="value"
                nameKey="name"
                outerRadius={105}
                innerRadius={55}
                paddingAngle={4}
                label
              >
                {statusData.map((entry) => (
                  <Cell key={entry.name} fill={statusColor(entry.name)} />
                ))}
              </Pie>
              <Tooltip contentStyle={tooltipStyle()} />
            </PieChart>
          </ResponsiveContainer>
        </ChartCard>

        <ChartCard title="Operational Summary">
          <div className="space-y-4">
            <SummaryRow label="Most active location" value={locationData[0]?.name || "No data"} />
            <SummaryRow label="Highest priority category" value={getTopPriority(priorityData)} />
            <SummaryRow label="Dominant case status" value={getTopStatus(statusData)} />
            <SummaryRow label="Recommended action" value={getRecommendation(criticalThreats, openThreats)} />
          </div>
        </ChartCard>
      </div>

      <div className="bg-slate-900/80 border border-white/10 rounded-3xl p-5 md:p-6 mt-6 shadow-card overflow-x-auto">
        <h2 className="font-black text-xl mb-5 flex items-center gap-2">
          <Target size={20} className="text-emerald-300" />
          Threat Hotspots by Location
        </h2>

        <table className="w-full min-w-[800px]">
          <thead className="border-b border-white/10 text-slate-400">
            <tr>
              <th className="text-left p-3">Location</th>
              <th className="text-left p-3">Threat Count</th>
              <th className="text-left p-3">Critical</th>
              <th className="text-left p-3">Open / Active</th>
              <th className="text-left p-3">Risk</th>
            </tr>
          </thead>

          <tbody>
            {locationData.length === 0 ? (
              <tr>
                <td className="p-3 text-slate-500" colSpan="5">
                  No threat data available.
                </td>
              </tr>
            ) : (
              locationData.map((item) => (
                <tr key={item.name} className="border-b border-white/5 hover:bg-white/[0.03]">
                  <td className="p-3 font-bold">{item.name}</td>
                  <td className="p-3 text-emerald-300 font-black">{item.threats}</td>
                  <td className="p-3 text-red-300 font-semibold">{item.critical}</td>
                  <td className="p-3 text-yellow-300 font-semibold">{item.open}</td>
                  <td className="p-3">
                    <RiskBadge risk={getLocationRisk(item)} />
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}

function tooltipStyle() {
  return {
    backgroundColor: "#020617",
    border: "1px solid rgba(255,255,255,0.12)",
    borderRadius: "16px",
    color: "#fff",
  }
}

function getTopPriority(data) {
  const sorted = [...data].sort((a, b) => b.value - a.value)
  return sorted[0]?.value > 0 ? sorted[0].name : "No data"
}

function getTopStatus(data) {
  const sorted = [...data].sort((a, b) => b.value - a.value)
  return sorted[0]?.value > 0 ? sorted[0].name : "No data"
}

function getRecommendation(critical, open) {
  if (critical > 0) return "Prioritize critical threat response"
  if (open > 3) return "Assign analysts to reduce open cases"
  if (open > 0) return "Continue monitoring active cases"
  return "Operational posture stable"
}

function getLocationRisk(item) {
  if (item.critical > 0) return "Critical"
  if (item.open >= 3) return "High"
  if (item.open > 0) return "Medium"
  return "Low"
}

function priorityColor(priority) {
  if (priority === "Critical") return "#ef4444"
  if (priority === "High") return "#f97316"
  if (priority === "Medium") return "#eab308"
  return "#10b981"
}

function statusColor(status) {
  if (status === "Open") return "#ef4444"
  if (status === "Investigating") return "#f59e0b"
  return "#10b981"
}

function scoreColor(score) {
  if (score >= 80) return "text-emerald-300"
  if (score >= 50) return "text-yellow-300"
  return "text-red-300"
}

function RiskBadge({ risk }) {
  const styles = {
    Critical: "bg-red-500/10 text-red-300 border-red-500/20",
    High: "bg-orange-500/10 text-orange-300 border-orange-500/20",
    Medium: "bg-yellow-500/10 text-yellow-300 border-yellow-500/20",
    Low: "bg-emerald-500/10 text-emerald-300 border-emerald-500/20",
  }

  return (
    <span className={`px-3 py-1 rounded-full text-xs font-black border ${styles[risk]}`}>
      {risk}
    </span>
  )
}

function SummaryRow({ label, value }) {
  return (
    <div className="bg-slate-950/80 border border-white/10 rounded-2xl p-4">
      <p className="text-slate-500 text-sm">{label}</p>
      <p className="font-black text-slate-100 mt-1">{value}</p>
    </div>
  )
}

function MetricCard({ title, value, detail }) {
  return (
    <div className="bg-slate-900/80 border border-white/10 rounded-3xl p-5 shadow-card">
      <p className="text-slate-400 text-sm">{title}</p>
      <h2 className="text-4xl font-black mt-2">{value}</h2>
      <p className="text-slate-500 text-xs mt-3">{detail}</p>
    </div>
  )
}

function Card({ icon, title, value, color }) {
  return (
    <div className="relative overflow-hidden bg-slate-900/80 border border-white/10 rounded-3xl p-5 shadow-card">
      <div className="absolute -top-10 -right-10 w-28 h-28 bg-white/5 rounded-full blur-2xl"></div>
      <div className={`${color} mb-4 relative`}>{icon}</div>
      <p className="text-slate-400 text-sm relative">{title}</p>
      <h2 className="text-4xl font-black mt-2 relative">{value}</h2>
    </div>
  )
}

function ChartCard({ title, children }) {
  return (
    <div className="bg-slate-900/80 border border-white/10 rounded-3xl p-5 md:p-6 shadow-card">
      <h2 className="font-black text-xl mb-5">{title}</h2>
      {children}
    </div>
  )
}

export default Analytics