import { useEffect, useState } from "react"
import { UserCheck, AlertTriangle, Activity, ShieldCheck } from "lucide-react"
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

    if (savedUser) {
      setCurrentUser(JSON.parse(savedUser))
    }
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

    if (!error) {
      setThreats(data)
    }
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
      <h1 className="text-3xl font-bold mb-2">
        My Assigned Threats
      </h1>

      <p className="text-slate-400 mb-8">
        View and update threat cases assigned directly to your account.
      </p>

      <div className="grid md:grid-cols-4 gap-5 mb-8">
        <Card icon={<UserCheck />} title="Assigned To Me" value={threats.length} color="text-blue-400" />
        <Card icon={<AlertTriangle />} title="Open" value={openCount} color="text-red-400" />
        <Card icon={<Activity />} title="Investigating" value={investigatingCount} color="text-yellow-400" />
        <Card icon={<ShieldCheck />} title="Resolved" value={resolvedCount} color="text-emerald-400" />
      </div>

      {message && (
        <div className="bg-slate-900 border border-slate-700 text-slate-300 p-3 rounded-xl mb-6 text-sm">
          {message}
        </div>
      )}

      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6">
        <h2 className="font-bold text-lg mb-5">
          Assigned Case Queue
        </h2>

        <table className="w-full">
          <thead className="border-b border-slate-700 text-slate-400">
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
                <tr key={threat.id} className="border-b border-slate-800">
                  <td className="p-3">
                    <p className="font-semibold">{threat.title}</p>
                    <p className="text-xs text-slate-500">{threat.description}</p>
                  </td>

                  <td className="p-3">{threat.location}</td>

                  <td className={`p-3 font-semibold ${priorityColor(threat.priority)}`}>
                    {threat.priority}
                  </td>

                  <td className="p-3 text-slate-300">
                    {threat.status}
                  </td>

                  <td className="p-3">
                    <select
                      value={threat.status}
                      onChange={(e) => handleStatusChange(threat, e.target.value)}
                      className="bg-slate-800 text-white p-2 rounded-lg outline-none"
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

function priorityColor(priority) {
  if (priority === "Critical") return "text-red-400"
  if (priority === "High") return "text-orange-400"
  if (priority === "Medium") return "text-yellow-400"
  return "text-emerald-400"
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

export default MyThreats