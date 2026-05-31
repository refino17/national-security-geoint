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
} from "recharts"
import { AlertTriangle, Activity, ShieldCheck, MapPin } from "lucide-react"
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

    if (!error) {
      setThreats(data)
    }
  }

  const totalThreats = threats.length
  const criticalThreats = threats.filter((t) => t.priority === "Critical").length
  const openThreats = threats.filter((t) => t.status === "Open").length
  const resolvedThreats = threats.filter((t) => t.status === "Resolved").length

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
        }
      }

      acc[key].threats += 1
      return acc
    }, {})
  )

  return (
    <div>
      <h1 className="text-3xl font-bold mb-2">
        Threat Analytics Center
      </h1>

      <p className="text-slate-400 mb-8">
        Analyze operational threats by priority, status, and location using live Supabase data.
      </p>

      <div className="grid md:grid-cols-4 gap-5 mb-8">
        <Card icon={<AlertTriangle />} title="Total Threats" value={totalThreats} color="text-red-400" />
        <Card icon={<Activity />} title="Critical Threats" value={criticalThreats} color="text-orange-400" />
        <Card icon={<MapPin />} title="Open Cases" value={openThreats} color="text-yellow-400" />
        <Card icon={<ShieldCheck />} title="Resolved" value={resolvedThreats} color="text-emerald-400" />
      </div>

      <div className="grid lg:grid-cols-2 gap-6">
        <ChartCard title="Threats by Priority">
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={priorityData}>
              <XAxis dataKey="name" stroke="#94a3b8" />
              <YAxis stroke="#94a3b8" />
              <Tooltip />
              <Bar dataKey="value" fill="#10b981" />
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>

        <ChartCard title="Threats by Status">
          <ResponsiveContainer width="100%" height={300}>
            <PieChart>
              <Pie
                data={statusData}
                dataKey="value"
                nameKey="name"
                outerRadius={100}
                label
              >
                {statusData.map((_, index) => (
                  <Cell
                    key={index}
                    fill={["#ef4444", "#f59e0b", "#10b981"][index]}
                  />
                ))}
              </Pie>
              <Tooltip />
            </PieChart>
          </ResponsiveContainer>
        </ChartCard>
      </div>

      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 mt-6">
        <h2 className="font-bold text-lg mb-5">
          Threats by Location
        </h2>

        <table className="w-full">
          <thead className="border-b border-slate-700 text-slate-400">
            <tr>
              <th className="text-left p-3">Location</th>
              <th className="text-left p-3">Threat Count</th>
            </tr>
          </thead>

          <tbody>
            {locationData.length === 0 ? (
              <tr>
                <td className="p-3 text-slate-500" colSpan="2">
                  No threat data available.
                </td>
              </tr>
            ) : (
              locationData.map((item) => (
                <tr key={item.name} className="border-b border-slate-800">
                  <td className="p-3">{item.name}</td>
                  <td className="p-3 text-emerald-400 font-semibold">
                    {item.threats}
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

function Card({ icon, title, value, color }) {
  return (
    <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5">
      <div className={`${color} mb-3`}>
        {icon}
      </div>

      <p className="text-slate-400">{title}</p>

      <h2 className="text-3xl font-bold mt-2">{value}</h2>
    </div>
  )
}

function ChartCard({ title, children }) {
  return (
    <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6">
      <h2 className="font-bold text-lg mb-5">{title}</h2>
      {children}
    </div>
  )
}

export default Analytics