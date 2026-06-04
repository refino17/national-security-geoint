import { useEffect, useState } from "react"
import {
  UserCheck,
  AlertTriangle,
  Activity,
  ShieldCheck,
  ClipboardList,
} from "lucide-react"
import { supabase } from "../services/supabaseClient"

function MyThreats() {
  const [currentUser, setCurrentUser] = useState(null)
  const [threats, setThreats] = useState([])
  const [message, setMessage] = useState("")

  useEffect(() => {
    loadCurrentUser()
  }, [])

  useEffect(() => {
    if (currentUser?.id) {
      fetchMyThreats()

      const channel = supabase
        .channel("my-threats-realtime")
        .on(
          "postgres_changes",
          {
            event: "*",
            schema: "public",
            table: "threats",
          },
          () => {
            fetchMyThreats()
          }
        )
        .subscribe()

      return () => {
        supabase.removeChannel(channel)
      }
    }
  }, [currentUser])

  function loadCurrentUser() {
    const savedUser = localStorage.getItem("geoint_user")
    if (savedUser) setCurrentUser(JSON.parse(savedUser))
  }

  async function logAudit(action, details) {
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) return

    await supabase.from("audit_logs").insert({
      user_id: user.id,
      user_email: user.email,
      action,
      details,
    })
  }

  async function fetchMyThreats() {
    const { data, error } = await supabase
      .from("threats")
      .select("*")
      .eq("assigned_to", currentUser.id)
      .order("created_at", { ascending: false })

    if (!error) setThreats(data)
  }

  async function handleStatusChange(threat, newStatus) {
    const { error } = await supabase
      .from("threats")
      .update({ status: newStatus })
      .eq("id", threat.id)

    if (error) {
      setMessage(error.message)
      return
    }

    await logAudit(
      "MY_THREAT_STATUS_UPDATE",
      `${currentUser.name} updated assigned threat "${threat.title}" to "${newStatus}"`
    )

    setMessage("Assigned threat status updated.")
    fetchMyThreats()
  }

  const openCount = threats.filter((item) => item.status === "Open").length
  const investigatingCount = threats.filter((item) => item.status === "Investigating").length
  const resolvedCount = threats.filter((item) => item.status === "Resolved").length

  return (
    <div>
      <section className="mb-8 rounded-3xl bg-slate-900/70 border border-white/10 p-5 md:p-7 shadow-card relative overflow-hidden">
        <div className="absolute -top-20 -right-20 w-72 h-72 bg-emerald-500/10 rounded-full blur-3xl"></div>

        <div className="relative flex flex-col lg:flex-row lg:items-center lg:justify-between gap-6">
          <div>
            <p className="text-emerald-300 text-sm font-bold mb-2 flex items-center gap-2">
              <ClipboardList size={16} />
              Assigned Operations
            </p>

            <h1 className="text-3xl md:text-5xl font-black tracking-tight">
              My Assigned Threats
            </h1>

            <p className="text-slate-400 mt-3 max-w-3xl">
              View and update threat cases assigned directly to your account.
              Changes are tracked in the audit center in real time.
            </p>
          </div>

          <div className="bg-white/5 border border-white/10 rounded-3xl p-4 min-w-[240px]">
            <p className="text-xs text-slate-500">ASSIGNED USER</p>
            <p className="text-lg font-black text-emerald-300 mt-1">
              {currentUser?.name || "Loading"}
            </p>
          </div>
        </div>
      </section>

      <div className="grid md:grid-cols-4 gap-5 mb-8">
        <Card icon={<UserCheck />} title="Assigned To Me" value={threats.length} color="text-blue-300" />
        <Card icon={<AlertTriangle />} title="Open" value={openCount} color="text-red-300" />
        <Card icon={<Activity />} title="Investigating" value={investigatingCount} color="text-yellow-300" />
        <Card icon={<ShieldCheck />} title="Resolved" value={resolvedCount} color="text-emerald-300" />
      </div>

      {message && (
        <div className="bg-slate-900/80 border border-white/10 text-slate-300 p-4 rounded-2xl mb-6 text-sm shadow-card">
          {message}
        </div>
      )}

      <div className="bg-slate-900/80 border border-white/10 rounded-3xl p-5 md:p-6 shadow-card overflow-x-auto">
        <h2 className="font-black text-xl mb-5">
          Assigned Case Queue
        </h2>

        <table className="w-full min-w-[850px]">
          <thead className="border-b border-white/10 text-slate-400">
            <tr>
              <th className="text-left p-3">Threat</th>
              <th className="text-left p-3">Location</th>
              <th className="text-left p-3">Priority</th>
              <th className="text-left p-3">Status</th>
              <th className="text-left p-3">Update</th>
            </tr>
          </thead>

          <tbody>
            {threats.length === 0 ? (
              <tr>
                <td className="p-3 text-slate-500" colSpan="5">
                  No threats assigned to you yet.
                </td>
              </tr>
            ) : (
              threats.map((threat) => (
                <tr key={threat.id} className="border-b border-white/5 hover:bg-white/[0.03]">
                  <td className="p-3">
                    <p className="font-black">{threat.title}</p>
                    <p className="text-xs text-slate-500 mt-1 max-w-md truncate">
                      {threat.description}
                    </p>
                  </td>

                  <td className="p-3 text-slate-300">
                    {threat.location}
                  </td>

                  <td className="p-3">
                    <PriorityBadge priority={threat.priority} />
                  </td>

                  <td className="p-3">
                    <StatusBadge status={threat.status} />
                  </td>

                  <td className="p-3">
                    <select
                      value={threat.status}
                      onChange={(e) => handleStatusChange(threat, e.target.value)}
                      className="bg-slate-950 border border-white/10 text-white p-2 rounded-xl outline-none"
                    >
                      <option>Open</option>
                      <option>Investigating</option>
                      <option>Resolved</option>
                    </select>
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

function PriorityBadge({ priority }) {
  const styles = {
    Critical: "bg-red-500/10 text-red-300 border-red-500/20",
    High: "bg-orange-500/10 text-orange-300 border-orange-500/20",
    Medium: "bg-yellow-500/10 text-yellow-300 border-yellow-500/20",
    Low: "bg-emerald-500/10 text-emerald-300 border-emerald-500/20",
  }

  return (
    <span className={`px-3 py-1 rounded-full text-xs font-black border ${styles[priority] || styles.Low}`}>
      {priority}
    </span>
  )
}

function StatusBadge({ status }) {
  const styles = {
    Open: "bg-red-500/10 text-red-300 border-red-500/20",
    Investigating: "bg-yellow-500/10 text-yellow-300 border-yellow-500/20",
    Resolved: "bg-emerald-500/10 text-emerald-300 border-emerald-500/20",
  }

  return (
    <span className={`px-3 py-1 rounded-full text-xs font-black border ${styles[status] || styles.Open}`}>
      {status}
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

export default MyThreats