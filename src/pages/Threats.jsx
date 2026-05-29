import { useEffect, useState } from "react"
import { AlertTriangle, Shield, MapPin, Activity } from "lucide-react"
import { supabase } from "../services/supabaseClient"

function Threats() {
  const [title, setTitle] = useState("")
  const [location, setLocation] = useState("")
  const [priority, setPriority] = useState("Medium")
  const [status, setStatus] = useState("Open")
  const [description, setDescription] = useState("")
  const [threats, setThreats] = useState([])
  const [message, setMessage] = useState("")
  const [currentUser, setCurrentUser] = useState(null)

  const canCreate =
    currentUser?.role === "Admin" || currentUser?.role === "Analyst"

  useEffect(() => {
    loadCurrentUser()
    fetchThreats()
  }, [])

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

  async function fetchThreats() {
    const { data, error } = await supabase
      .from("threats")
      .select("*")
      .order("created_at", { ascending: false })

    if (!error) {
      setThreats(data)
    }
  }

  async function handleCreateThreat() {
    setMessage("")

    if (!canCreate) {
      setMessage("Your role does not have permission to create threats.")
      return
    }

    if (!title || !location) {
      setMessage("Please enter threat title and location.")
      return
    }

    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser()

    if (userError || !user) {
      setMessage("You must be logged in.")
      return
    }

    const { error } = await supabase.from("threats").insert({
      title,
      location,
      priority,
      status,
      description,
      created_by: user.id,
    })

    if (error) {
      setMessage(error.message)
      return
    }

    await logAudit(
      "CREATE_THREAT",
      `${currentUser?.name || user.email} created threat "${title}" at "${location}"`
    )

    setMessage("Threat created successfully.")
    setTitle("")
    setLocation("")
    setPriority("Medium")
    setStatus("Open")
    setDescription("")
    fetchThreats()
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
      "UPDATE_THREAT_STATUS",
      `${currentUser?.name || "User"} changed threat "${threat.title}" status to "${newStatus}"`
    )

    setMessage("Threat status updated.")
    fetchThreats()
  }

  const criticalCount = threats.filter((item) => item.priority === "Critical").length
  const openCount = threats.filter((item) => item.status === "Open").length
  const resolvedCount = threats.filter((item) => item.status === "Resolved").length

  return (
    <div>
      <h1 className="text-3xl font-bold mb-2">
        Threat Management Center
      </h1>

      <p className="text-slate-400 mb-8">
        Create, monitor, classify and update operational threat records.
      </p>

      <div className="grid md:grid-cols-4 gap-5 mb-8">
        <Card icon={<AlertTriangle />} title="Total Threats" value={threats.length} color="text-red-400" />
        <Card icon={<Shield />} title="Open Cases" value={openCount} color="text-yellow-400" />
        <Card icon={<Activity />} title="Critical Priority" value={criticalCount} color="text-orange-400" />
        <Card icon={<MapPin />} title="Resolved" value={resolvedCount} color="text-emerald-400" />
      </div>

      {message && (
        <div className="bg-slate-900 border border-slate-700 text-slate-300 p-3 rounded-xl mb-6 text-sm">
          {message}
        </div>
      )}

      {canCreate ? (
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 mb-8">
          <h2 className="font-bold text-lg mb-5">
            Create New Threat
          </h2>

          <div className="grid md:grid-cols-2 gap-4">
            <input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Threat title"
              className="p-3 rounded-xl bg-slate-800 text-white outline-none"
            />

            <input
              value={location}
              onChange={(e) => setLocation(e.target.value)}
              placeholder="Location"
              className="p-3 rounded-xl bg-slate-800 text-white outline-none"
            />

            <select
              value={priority}
              onChange={(e) => setPriority(e.target.value)}
              className="p-3 rounded-xl bg-slate-800 text-white outline-none"
            >
              <option>Low</option>
              <option>Medium</option>
              <option>High</option>
              <option>Critical</option>
            </select>

            <select
              value={status}
              onChange={(e) => setStatus(e.target.value)}
              className="p-3 rounded-xl bg-slate-800 text-white outline-none"
            >
              <option>Open</option>
              <option>Investigating</option>
              <option>Resolved</option>
            </select>
          </div>

          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Threat description"
            className="w-full mt-4 p-3 rounded-xl bg-slate-800 text-white outline-none h-28"
          />

          <button
            onClick={handleCreateThreat}
            className="mt-4 bg-emerald-500 text-slate-950 font-bold px-6 py-3 rounded-xl hover:bg-emerald-400 transition"
          >
            Create Threat
          </button>
        </div>
      ) : (
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 mb-8">
          <h2 className="font-bold text-lg mb-2">
            Threat Creation Restricted
          </h2>
          <p className="text-slate-400">
            Viewer access is read-only. Contact an Admin for create permissions.
          </p>
        </div>
      )}

      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6">
        <h2 className="font-bold text-lg mb-5">
          Threat Records
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
                  No threat records yet.
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

      <p className="text-slate-400">
        {title}
      </p>

      <h2 className="text-3xl font-bold mt-2">
        {value}
      </h2>
    </div>
  )
}

export default Threats