import { useEffect, useState } from "react"
import {
  ShieldCheck,
  Activity,
  User,
  Clock,
  Fingerprint,
} from "lucide-react"
import { supabase } from "../services/supabaseClient"

function Audit() {
  const [logs, setLogs] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchLogs()

    const channel = supabase
      .channel("audit-center-realtime")
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "audit_logs",
        },
        () => {
          fetchLogs()
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [])

  async function fetchLogs() {
    setLoading(true)

    const { data, error } = await supabase
      .from("audit_logs")
      .select("*")
      .order("created_at", { ascending: false })

    if (!error) {
      setLogs(data)
    }

    setLoading(false)
  }

  const uniqueUsers = new Set(logs.map((log) => log.user_email)).size
  const loginLogs = logs.filter((log) => log.action === "LOGIN").length
  const securityEvents = logs.filter((log) =>
    String(log.action).includes("DELETE") ||
    String(log.action).includes("UPDATE") ||
    String(log.action).includes("CREATE")
  ).length

  return (
    <div>
      <section className="mb-8 rounded-3xl bg-slate-900/70 border border-white/10 p-5 md:p-7 shadow-card relative overflow-hidden">
        <div className="absolute -top-20 -right-20 w-72 h-72 bg-emerald-500/10 rounded-full blur-3xl"></div>

        <div className="relative flex flex-col lg:flex-row lg:items-center lg:justify-between gap-6">
          <div>
            <p className="text-emerald-300 text-sm font-bold mb-2 flex items-center gap-2">
              <Fingerprint size={16} />
              Security Accountability
            </p>

            <h1 className="text-3xl md:text-5xl font-black tracking-tight">
              Audit Center
            </h1>

            <p className="text-slate-400 mt-3 max-w-3xl">
              Monitor user activity, report access, login events, role changes,
              evidence actions, threat updates and administrative operations.
            </p>
          </div>

          <div className="bg-white/5 border border-white/10 rounded-3xl p-4 min-w-[240px]">
            <p className="text-xs text-slate-500">AUDIT MODE</p>
            <p className="text-lg font-black text-emerald-300 mt-1">
              Realtime Enabled
            </p>
          </div>
        </div>
      </section>

      <div className="grid md:grid-cols-4 gap-5 mb-8">
        <Card icon={<Activity />} title="Total Events" value={logs.length} color="text-blue-300" />
        <Card icon={<ShieldCheck />} title="Security Events" value={securityEvents} color="text-emerald-300" />
        <Card icon={<User />} title="Tracked Users" value={uniqueUsers} color="text-yellow-300" />
        <Card icon={<Clock />} title="Login Events" value={loginLogs} color="text-purple-300" />
      </div>

      <div className="bg-slate-900/80 border border-white/10 rounded-3xl p-5 md:p-6 shadow-card overflow-x-auto">
        <h2 className="font-black text-xl mb-5">
          Activity History
        </h2>

        {loading ? (
          <p className="text-slate-400">Loading audit logs...</p>
        ) : (
          <table className="w-full min-w-[950px]">
            <thead className="border-b border-white/10 text-slate-400">
              <tr>
                <th className="text-left p-3">Action</th>
                <th className="text-left p-3">User</th>
                <th className="text-left p-3">Details</th>
                <th className="text-left p-3">Time</th>
              </tr>
            </thead>

            <tbody>
              {logs.length === 0 ? (
                <tr>
                  <td className="p-3 text-slate-500" colSpan="4">
                    No audit logs found.
                  </td>
                </tr>
              ) : (
                logs.map((log) => (
                  <tr key={log.id} className="border-b border-white/5 hover:bg-white/[0.03]">
                    <td className="p-3">
                      <ActionBadge action={log.action} />
                    </td>

                    <td className="p-3 text-slate-300">
                      {log.user_email}
                    </td>

                    <td className="p-3 text-slate-300">
                      {log.details}
                    </td>

                    <td className="p-3 text-slate-400 text-sm">
                      {new Date(log.created_at).toLocaleString()}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        )}
      </div>
    </div>
  )
}

function ActionBadge({ action }) {
  const actionText = String(action || "UNKNOWN")

  let style = "bg-slate-500/10 text-slate-300 border-slate-500/20"

  if (actionText.includes("LOGIN")) {
    style = "bg-blue-500/10 text-blue-300 border-blue-500/20"
  }

  if (actionText.includes("CREATE")) {
    style = "bg-emerald-500/10 text-emerald-300 border-emerald-500/20"
  }

  if (actionText.includes("UPDATE") || actionText.includes("ASSIGN")) {
    style = "bg-yellow-500/10 text-yellow-300 border-yellow-500/20"
  }

  if (actionText.includes("DELETE")) {
    style = "bg-red-500/10 text-red-300 border-red-500/20"
  }

  if (actionText.includes("VIEW")) {
    style = "bg-purple-500/10 text-purple-300 border-purple-500/20"
  }

  return (
    <span className={`px-3 py-1 rounded-full text-xs font-black border ${style}`}>
      {actionText}
    </span>
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

export default Audit