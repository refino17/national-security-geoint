import { useEffect, useState } from "react"
import {
  RadioTower,
  ShieldCheck,
  Zap,
  AlertTriangle,
  Plus,
  Building2,
} from "lucide-react"
import { supabase } from "../services/supabaseClient"

function Infrastructure() {
  const [assets, setAssets] = useState([])
  const [message, setMessage] = useState("")
  const [currentUser, setCurrentUser] = useState(null)

  const [assetName, setAssetName] = useState("")
  const [category, setCategory] = useState("General")
  const [zone, setZone] = useState("")
  const [status, setStatus] = useState("Protected")
  const [riskLevel, setRiskLevel] = useState("Low")
  const [latitude, setLatitude] = useState("")
  const [longitude, setLongitude] = useState("")

  const canCreate =
    currentUser?.role === "Admin" || currentUser?.role === "Analyst"

  useEffect(() => {
    loadCurrentUser()
    fetchAssets()

    const channel = supabase
      .channel("infrastructure-assets-realtime")
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "infrastructure_assets",
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
      .from("infrastructure_assets")
      .select("*")
      .order("created_at", { ascending: false })

    if (!error) setAssets(data)
  }

  async function handleCreateAsset() {
    setMessage("")

    if (!canCreate) {
      setMessage("Your role does not have permission to create infrastructure records.")
      return
    }

    if (!assetName || !zone) {
      setMessage("Please enter asset name and zone.")
      return
    }

    const { error } = await supabase.from("infrastructure_assets").insert({
      asset_name: assetName,
      category,
      zone,
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
      "CREATE_INFRASTRUCTURE_ASSET",
      `${currentUser?.name || "User"} created infrastructure asset "${assetName}" in "${zone}"`
    )

    setMessage("Infrastructure asset created successfully.")
    setAssetName("")
    setCategory("General")
    setZone("")
    setStatus("Protected")
    setRiskLevel("Low")
    setLatitude("")
    setLongitude("")
    fetchAssets()
  }

  async function handleStatusChange(asset, newStatus) {
    const { error } = await supabase
      .from("infrastructure_assets")
      .update({ status: newStatus })
      .eq("id", asset.id)

    if (error) {
      setMessage(error.message)
      return
    }

    await logAudit(
      "UPDATE_INFRASTRUCTURE_STATUS",
      `${currentUser?.name || "User"} changed "${asset.asset_name}" status to "${newStatus}"`
    )

    setMessage("Infrastructure status updated.")
    fetchAssets()
  }

  async function handleRiskChange(asset, newRisk) {
    const { error } = await supabase
      .from("infrastructure_assets")
      .update({ risk_level: newRisk })
      .eq("id", asset.id)

    if (error) {
      setMessage(error.message)
      return
    }

    await logAudit(
      "UPDATE_INFRASTRUCTURE_RISK",
      `${currentUser?.name || "User"} changed "${asset.asset_name}" risk level to "${newRisk}"`
    )

    setMessage("Infrastructure risk level updated.")
    fetchAssets()
  }

  const totalAssets = assets.length
  const powerFacilities = assets.filter(
    (item) => item.category === "Power Facility"
  ).length
  const riskAlerts = assets.filter(
    (item) => item.risk_level === "High" || item.risk_level === "Critical"
  ).length
  const securedZones = assets.filter(
    (item) => item.status === "Protected" || item.status === "Secured"
  ).length

  return (
    <div>
      <section className="mb-8 rounded-3xl bg-slate-900/70 border border-white/10 p-5 md:p-7 shadow-card relative overflow-hidden">
        <div className="absolute -top-20 -right-20 w-72 h-72 bg-yellow-500/10 rounded-full blur-3xl"></div>

        <div className="relative flex flex-col lg:flex-row lg:items-center lg:justify-between gap-6">
          <div>
            <p className="text-yellow-300 text-sm font-bold mb-2 flex items-center gap-2">
              <Building2 size={16} />
              Infrastructure Operations
            </p>

            <h1 className="text-3xl md:text-5xl font-black tracking-tight">
              Critical Infrastructure Protection
            </h1>

            <p className="text-slate-400 mt-3 max-w-3xl">
              Monitor power systems, communication towers, transport hubs,
              government facilities and strategic assets using live Supabase records.
            </p>
          </div>

          <div className="bg-white/5 border border-white/10 rounded-3xl p-4 min-w-[240px]">
            <p className="text-xs text-slate-500">ACCESS MODE</p>
            <p className="text-lg font-black text-emerald-300 mt-1">
              {canCreate ? "Operations Enabled" : "Read Only"}
            </p>
          </div>
        </div>
      </section>

      <div className="grid md:grid-cols-4 gap-5 mb-8">
        <Card icon={<RadioTower />} title="Assets Monitored" value={totalAssets} color="text-blue-300" />
        <Card icon={<Zap />} title="Power Facilities" value={powerFacilities} color="text-yellow-300" />
        <Card icon={<AlertTriangle />} title="Risk Alerts" value={riskAlerts} color="text-red-300" />
        <Card icon={<ShieldCheck />} title="Secured Zones" value={securedZones} color="text-emerald-300" />
      </div>

      {message && (
        <div className="bg-slate-900/80 border border-white/10 text-slate-300 p-4 rounded-2xl mb-6 text-sm shadow-card">
          {message}
        </div>
      )}

      {canCreate && (
        <div className="bg-slate-900/80 border border-white/10 rounded-3xl p-5 md:p-6 mb-8 shadow-card">
          <h2 className="font-black text-xl mb-5 flex items-center gap-2">
            <Plus size={20} className="text-emerald-300" />
            Add Infrastructure Asset
          </h2>

          <div className="grid md:grid-cols-2 gap-4">
            <FormInput value={assetName} onChange={setAssetName} placeholder="Asset name" />
            <FormInput value={zone} onChange={setZone} placeholder="Zone e.g. Central Zone" />
            <Select value={category} onChange={setCategory} options={["General", "Power Facility", "Communication Tower", "Transport Network", "Water Facility", "Government Facility"]} />
            <Select value={status} onChange={setStatus} options={["Protected", "Secured", "Monitoring", "Risk Alert", "Offline"]} />
            <Select value={riskLevel} onChange={setRiskLevel} options={["Low", "Medium", "High", "Critical"]} />
            <FormInput value={latitude} onChange={setLatitude} placeholder="Latitude optional" />
            <FormInput value={longitude} onChange={setLongitude} placeholder="Longitude optional" />
          </div>

          <button
            onClick={handleCreateAsset}
            className="mt-4 bg-gradient-to-r from-emerald-400 to-cyan-400 text-slate-950 font-black px-6 py-3 rounded-2xl hover:opacity-90 transition shadow-glow"
          >
            Add Infrastructure Record
          </button>
        </div>
      )}

      <div className="bg-slate-900/80 border border-white/10 rounded-3xl p-5 md:p-6 shadow-card overflow-x-auto">
        <h2 className="font-black text-xl mb-5">
          Infrastructure Security Feed
        </h2>

        <table className="w-full min-w-[950px]">
          <thead className="border-b border-white/10 text-slate-400">
            <tr>
              <th className="text-left p-3">Asset</th>
              <th className="text-left p-3">Category</th>
              <th className="text-left p-3">Zone</th>
              <th className="text-left p-3">Coordinates</th>
              <th className="text-left p-3">Risk</th>
              <th className="text-left p-3">Status</th>
            </tr>
          </thead>

          <tbody>
            {assets.length === 0 ? (
              <tr>
                <td className="p-3 text-slate-500" colSpan="6">
                  No infrastructure assets found.
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

function Row({ asset, onStatusChange, onRiskChange }) {
  return (
    <tr className="border-b border-white/5 hover:bg-white/[0.03]">
      <td className="p-3 font-bold">{asset.asset_name}</td>

      <td className="p-3 text-slate-300">{asset.category}</td>

      <td className="p-3 text-slate-300">{asset.zone}</td>

      <td className="p-3 text-slate-400 text-sm">
        {asset.latitude && asset.longitude
          ? `${asset.latitude}, ${asset.longitude}`
          : "Not set"}
      </td>

      <td className="p-3">
        <select
          value={asset.risk_level || "Low"}
          onChange={(e) => onRiskChange(e.target.value)}
          className={`bg-slate-950 border border-white/10 p-2 rounded-xl outline-none ${riskColor(asset.risk_level)}`}
        >
          <option>Low</option>
          <option>Medium</option>
          <option>High</option>
          <option>Critical</option>
        </select>
      </td>

      <td className="p-3">
        <select
          value={asset.status || "Protected"}
          onChange={(e) => onStatusChange(e.target.value)}
          className="bg-slate-950 border border-white/10 text-white p-2 rounded-xl outline-none"
        >
          <option>Protected</option>
          <option>Secured</option>
          <option>Monitoring</option>
          <option>Risk Alert</option>
          <option>Offline</option>
        </select>
      </td>
    </tr>
  )
}

function FormInput({ value, onChange, placeholder }) {
  return (
    <input
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
      className="p-4 rounded-2xl bg-slate-950/80 border border-white/10 text-white outline-none focus:border-emerald-400/60"
    />
  )
}

function Select({ value, onChange, options }) {
  return (
    <select
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className="p-4 rounded-2xl bg-slate-950/80 border border-white/10 text-white outline-none focus:border-emerald-400/60"
    >
      {options.map((option) => (
        <option key={option}>{option}</option>
      ))}
    </select>
  )
}

function riskColor(risk) {
  if (risk === "Critical") return "text-red-300"
  if (risk === "High") return "text-orange-300"
  if (risk === "Medium") return "text-yellow-300"
  return "text-emerald-300"
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

export default Infrastructure