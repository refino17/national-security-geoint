import { useEffect, useState } from "react"
import { ShieldCheck, Activity, User, Clock } from "lucide-react"
import { supabase } from "../services/supabaseClient"

function Audit() {
  const [logs, setLogs] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchLogs()
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

  return (
    <div>
      <h1 className="text-3xl font-bold mb-2">
        Audit Center
      </h1>

      <p className="text-slate-400 mb-8">
        Monitor user activity, report access, uploads, deletions, and login events.
      </p>

      <div className="grid md:grid-cols-4 gap-5 mb-8">
        <Card icon={<Activity />} title="Total Events" value={logs.length} color="text-blue-400" />
        <Card icon={<ShieldCheck />} title="Security Logs" value={logs.length} color="text-emerald-400" />
        <Card icon={<User />} title="Tracked Users" value="Active" color="text-yellow-400" />
        <Card icon={<Clock />} title="Live Audit" value="Enabled" color="text-purple-400" />
      </div>

      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6">
        <h2 className="font-bold text-lg mb-5">
          Activity History
        </h2>

        {loading ? (
          <p className="text-slate-400">Loading audit logs...</p>
        ) : (
          <table className="w-full">
            <thead className="border-b border-slate-700 text-slate-400">
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
                  <tr key={log.id} className="border-b border-slate-800">
                    <td className="p-3 text-emerald-400 font-semibold">
                      {log.action}
                    </td>
                    <td className="p-3">
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

function Card({ icon, title, value, color }) {
  return (
    <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5">
      <div className={`${color} mb-3`}>
        {icon}
      </div>

      <p className="text-slate-400">
        {title}
      </p>

      <h2 className="text-3xl font-bold mt-2">
        {value}
      </h2>
    </div>
  )
}

export default Audit