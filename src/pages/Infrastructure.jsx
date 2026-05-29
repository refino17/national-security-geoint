import { RadioTower, ShieldCheck, Zap, AlertTriangle } from "lucide-react"

function Infrastructure() {
  return (
    <div>
      <h1 className="text-3xl font-bold mb-2">
        Critical Infrastructure Protection
      </h1>

      <p className="text-slate-400 mb-8">
        Monitor strategic assets, power systems, communication towers,
        transport networks and infrastructure risk zones.
      </p>

      <div className="grid md:grid-cols-4 gap-5 mb-8">
        <Card icon={<RadioTower />} title="Assets Monitored" value="64" color="text-blue-400" />
        <Card icon={<Zap />} title="Power Facilities" value="19" color="text-yellow-400" />
        <Card icon={<AlertTriangle />} title="Risk Alerts" value="8" color="text-red-400" />
        <Card icon={<ShieldCheck />} title="Secured Zones" value="41" color="text-emerald-400" />
      </div>

      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6">
        <h2 className="font-bold text-lg mb-5">
          Infrastructure Security Feed
        </h2>

        <table className="w-full">
          <thead className="border-b border-slate-700 text-slate-400">
            <tr>
              <th className="text-left p-3">Asset</th>
              <th className="text-left p-3">Zone</th>
              <th className="text-left p-3">Status</th>
            </tr>
          </thead>

          <tbody>
            <Row asset="Power Grid Station 04" zone="Central Zone" status="Protected" />
            <Row asset="Telecom Tower B12" zone="North Corridor" status="Monitoring" />
            <Row asset="Transport Hub X3" zone="Urban Sector" status="Risk Alert" />
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

function Row({ asset, zone, status }) {
  return (
    <tr className="border-b border-slate-800">
      <td className="p-3">{asset}</td>
      <td className="p-3">{zone}</td>
      <td className="p-3 text-amber-400">{status}</td>
    </tr>
  )
}

export default Infrastructure