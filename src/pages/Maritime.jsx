import { useEffect, useState } from "react"
import { Ship, Waves, AlertTriangle, Radio, Plus } from "lucide-react"
import { supabase } from "../services/supabaseClient"

function Maritime() {
  const [assets, setAssets] = useState([])
  const [message, setMessage] = useState("")
  const [currentUser, setCurrentUser] = useState(null)

  const [vesselName, setVesselName] = useState("")
  const [location, setLocation] = useState("")
  const [status, setStatus] = useState("Tracked")
  const [riskLevel, setRiskLevel] = useState("Low")
  const [latitude, setLatitude] = useState("")
  const [longitude, setLongitude] = useState("")

  const canCreate =
    currentUser?.role === "Admin" || currentUser?.role === "Analyst"

  useEffect(() => {
    loadCurrentUser()
    fetchAssets()

    const channel = supabase
      .channel("maritime-assets-realtime")
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "maritime_assets",
        },
        () => {
          fetchAssets()
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [])

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

  async function fetchAssets() {
    const { data, error } = await supabase
      .from("maritime_assets")
      .select("*")
      .order("created_at", { ascending: false })

    if (!error) {
      setAssets(data)
    }
  }

  async function handleCreateAsset() {
    setMessage("")

    if (!canCreate) {
      setMessage("Your role does not have permission to create maritime records.")
      return
    }

    if (!vesselName || !location) {
      setMessage("Please enter vessel name and location.")
      return
    }

    const { error } = await supabase.from("maritime_assets").insert({
      vessel_name: vesselName,
      location,
      status,
      risk_level: riskLevel,
      latitude: latitude ? Number(latitude) : null,
      longitude: longitude ? Number(longitude) : null,
    })

    if (error) {
      setMessage(error.message)
      return
    }

    await logAudit(
      "CREATE_MARITIME_ASSET",
      `${currentUser?.name || "User"} created maritime asset "${vesselName}" at "${location}"`
    )

    setMessage("Maritime asset created successfully.")
    setVesselName("")
    setLocation("")
    setStatus("Tracked")
    setRiskLevel("Low")
    setLatitude("")
    setLongitude("")
    fetchAssets()
  }

  async function handleStatusChange(asset, newStatus) {
    const { error } = await supabase
      .from("maritime_assets")
      .update({ status: newStatus })
      .eq("id", asset.id)

    if (error) {
      setMessage(error.message)
      return
    }

    await logAudit(
      "UPDATE_MARITIME_STATUS",
      `${currentUser?.name || "User"} changed "${asset.vessel_name}" status to "${newStatus}"`
    )

    setMessage("Maritime status updated.")
    fetchAssets()
  }

  async function handleRiskChange(asset, newRisk) {
    const { error } = await supabase
      .from("maritime_assets")
      .update({ risk_level: newRisk })
      .eq("id", asset.id)

    if (error) {
      setMessage(error.message)
      return
    }

    await logAudit(
      "UPDATE_MARITIME_RISK",
      `${currentUser?.name || "User"} changed "${asset.vessel_name}" risk level to "${newRisk}"`
    )

    setMessage("Maritime risk level updated.")
    fetchAssets()
  }

  const trackedCount = assets.filter((item) => item.status === "Tracked").length
  const routeCount = assets.filter((item) => item.location).length
  const alertCount = assets.filter(
    (item) => item.risk_level === "High" || item.risk_level === "Critical"
  ).length
  const stationCount = assets.filter(
    (item) => item.status === "Monitoring" || item.status === "Tracked"
  ).length

  return (
    <div>
      <h1 className="text-3xl font-bold mb-2">
        Maritime Domain Awareness
      </h1>

      <p className="text-slate-400 mb-8">
        Monitor vessels, maritime routes, coastal surveillance and suspicious sea activity using live Supabase records.
      </p>

      <div className="grid md:grid-cols-4 gap-5 mb-8">
        <Card icon={<Ship />} title="Tracked Vessels" value={trackedCount} color="text-cyan-400" />
        <Card icon={<Waves />} title="Sea Routes" value={routeCount} color="text-blue-400" />
        <Card icon={<AlertTriangle />} title="Threat Alerts" value={alertCount} color="text-red-400" />
        <Card icon={<Radio />} title="Signal Stations" value={stationCount} color="text-emerald-400" />
      </div>

      {message && (
        <div className="bg-slate-900 border border-slate-700 text-slate-300 p-3 rounded-xl mb-6 text-sm">
          {message}
        </div>
      )}

      {canCreate && (
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 mb-8">
          <h2 className="font-bold text-lg mb-5 flex items-center gap-2">
            <Plus size={18} />
            Add Maritime Asset
          </h2>

          <div className="grid md:grid-cols-2 gap-4">
            <input
              value={vesselName}
              onChange={(e) => setVesselName(e.target.value)}
              placeholder="Vessel name"
              className="p-3 rounded-xl bg-slate-800 text-white outline-none"
            />

            <input
              value={location}
              onChange={(e) => setLocation(e.target.value)}
              placeholder="Location e.g. Lagos Coast"
              className="p-3 rounded-xl bg-slate-800 text-white outline-none"
            />

            <select
              value={status}
              onChange={(e) => setStatus(e.target.value)}
              className="p-3 rounded-xl bg-slate-800 text-white outline-none"
            >
              <option>Tracked</option>
              <option>Monitoring</option>
              <option>Suspicious</option>
              <option>Cleared</option>
            </select>

            <select
              value={riskLevel}
              onChange={(e) => setRiskLevel(e.target.value)}
              className="p-3 rounded-xl bg-slate-800 text-white outline-none"
            >
              <option>Low</option>
              <option>Medium</option>
              <option>High</option>
              <option>Critical</option>
            </select>

            <input
              value={latitude}
              onChange={(e) => setLatitude(e.target.value)}
              placeholder="Latitude optional"
              className="p-3 rounded-xl bg-slate-800 text-white outline-none"
            />

            <input
              value={longitude}
              onChange={(e) => setLongitude(e.target.value)}
              placeholder="Longitude optional"
              className="p-3 rounded-xl bg-slate-800 text-white outline-none"
            />
          </div>

          <button
            onClick={handleCreateAsset}
            className="mt-4 bg-emerald-500 text-slate-950 font-bold px-6 py-3 rounded-xl hover:bg-emerald-400 transition"
          >
            Add Vessel Record
          </button>
        </div>
      )}

      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 overflow-x-auto">
        <h2 className="font-bold text-lg mb-5">
          Maritime Activity Feed
        </h2>

        <table className="w-full min-w-[800px]">
          <thead className="border-b border-slate-700 text-slate-400">
            <tr>
              <th className="text-left p-3">Vessel</th>
              <th className="text-left p-3">Location</th>
              <th className="text-left p-3">Coordinates</th>
              <th className="text-left p-3">Risk</th>
              <th className="text-left p-3">Status</th>
            </tr>
          </thead>

          <tbody>
            {assets.length === 0 ? (
              <tr>
                <td className="p-3 text-slate-500" colSpan="5">
                  No maritime assets found.
                </td>
              </tr>
            ) : (
              assets.map((asset) => (
                <Row
                  key={asset.id}
                  asset={asset}
                  onStatusChange={(newStatus) =>
                    handleStatusChange(asset, newStatus)
                  }
                  onRiskChange={(newRisk) =>
                    handleRiskChange(asset, newRisk)
                  }
                />
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

      <p className="text-slate-400">
        {title}
      </p>

      <h2 className="text-3xl font-bold mt-2">
        {value}
      </h2>
    </div>
  )
}

function Row({ asset, onStatusChange, onRiskChange }) {
  return (
    <tr className="border-b border-slate-800">
      <td className="p-3">
        {asset.vessel_name}
      </td>

      <td className="p-3">
        {asset.location}
      </td>

      <td className="p-3 text-slate-400 text-sm">
        {asset.latitude && asset.longitude
          ? `${asset.latitude}, ${asset.longitude}`
          : "Not set"}
      </td>

      <td className={`p-3 font-semibold ${riskColor(asset.risk_level)}`}>
        <select
          value={asset.risk_level || "Low"}
          onChange={(e) => onRiskChange(e.target.value)}
          className="bg-slate-800 text-white p-2 rounded-lg outline-none"
        >
          <option>Low</option>
          <option>Medium</option>
          <option>High</option>
          <option>Critical</option>
        </select>
      </td>

      <td className="p-3">
        <select
          value={asset.status || "Tracked"}
          onChange={(e) => onStatusChange(e.target.value)}
          className="bg-slate-800 text-white p-2 rounded-lg outline-none"
        >
          <option>Tracked</option>
          <option>Monitoring</option>
          <option>Suspicious</option>
          <option>Cleared</option>
        </select>
      </td>
    </tr>
  )
}

function riskColor(risk) {
  if (risk === "Critical") return "text-red-400"
  if (risk === "High") return "text-orange-400"
  if (risk === "Medium") return "text-yellow-400"
  return "text-emerald-400"
}

export default Maritime