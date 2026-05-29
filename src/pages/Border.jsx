import { AlertTriangle, Shield, MapPin, Users } from "lucide-react"

function Border() {
  return (
    <div>

      <h1 className="text-3xl font-bold mb-2">
        Border Intelligence Center
      </h1>

      <p className="text-slate-400 mb-8">
        Monitor border activity, surveillance,
        checkpoints and suspicious movements.
      </p>

      {/* KPI cards */}

      <div className="grid md:grid-cols-4 gap-5 mb-8">

        <InfoCard
          icon={<AlertTriangle />}
          title="Threat Incidents"
          value="32"
          color="text-red-400"
        />

        <InfoCard
          icon={<MapPin />}
          title="Border Checkpoints"
          value="18"
          color="text-blue-400"
        />

        <InfoCard
          icon={<Users />}
          title="Persons Monitored"
          value="147"
          color="text-yellow-400"
        />

        <InfoCard
          icon={<Shield />}
          title="Security Units"
          value="52"
          color="text-emerald-400"
        />

      </div>

      {/* Table */}

      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6">

        <h2 className="font-bold text-lg mb-5">
          Border Surveillance Feed
        </h2>

        <table className="w-full">

          <thead className="text-slate-400 border-b border-slate-700">

            <tr>

              <th className="text-left p-3">
                Sector
              </th>

              <th className="text-left p-3">
                Activity
              </th>

              <th className="text-left p-3">
                Risk
              </th>

            </tr>

          </thead>

          <tbody>

            <Row
              sector="North Gate"
              activity="Unauthorized crossing attempt"
              risk="High"
            />

            <Row
              sector="East Zone"
              activity="Vehicle inspection alert"
              risk="Medium"
            />

            <Row
              sector="South Border"
              activity="Drone detection"
              risk="Critical"
            />

          </tbody>

        </table>

      </div>

    </div>
  )
}

function InfoCard({
  icon,
  title,
  value,
  color
}) {
  return (

    <div className="bg-slate-900 border border-slate-800 p-5 rounded-2xl">

      <div className={`${color} mb-3`}>
        {icon}
      </div>

      <p className="text-slate-400 text-sm">
        {title}
      </p>

      <h3 className="text-3xl font-bold mt-2">
        {value}
      </h3>

    </div>
  )
}

function Row({
  sector,
  activity,
  risk
}) {

  return (

    <tr className="border-b border-slate-800">

      <td className="p-3">
        {sector}
      </td>

      <td className="p-3">
        {activity}
      </td>

      <td className="p-3 text-red-400">
        {risk}
      </td>

    </tr>

  )

}

export default Border