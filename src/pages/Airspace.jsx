import { Plane, Radar, AlertTriangle, Radio } from "lucide-react"

function Airspace() {
  return (
    <div>

      <h1 className="text-3xl font-bold mb-2">
        Airspace Monitoring Center
      </h1>

      <p className="text-slate-400 mb-8">
        Monitor aircraft movement, drone activity,
        restricted zones and airspace threats.
      </p>

      <div className="grid md:grid-cols-4 gap-5 mb-8">

        <Card
          icon={<Plane />}
          title="Aircraft Tracked"
          value="128"
          color="text-sky-400"
        />

        <Card
          icon={<Radar />}
          title="Radar Stations"
          value="18"
          color="text-emerald-400"
        />

        <Card
          icon={<AlertTriangle />}
          title="Threat Alerts"
          value="11"
          color="text-red-400"
        />

        <Card
          icon={<Radio />}
          title="Drone Signals"
          value="26"
          color="text-yellow-400"
        />

      </div>

      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6">

        <h2 className="font-bold text-lg mb-5">
          Airspace Activity Feed
        </h2>

        <table className="w-full">

          <thead className="border-b border-slate-700 text-slate-400">

            <tr>
              <th className="text-left p-3">Aircraft</th>
              <th className="text-left p-3">Location</th>
              <th className="text-left p-3">Status</th>
            </tr>

          </thead>

          <tbody>

            <Row
              aircraft="Falcon X12"
              location="North Air Corridor"
              status="Tracked"
            />

            <Row
              aircraft="Drone Unit D7"
              location="Restricted Zone"
              status="Suspicious"
            />

            <Row
              aircraft="Jet Patrol A1"
              location="West Airspace"
              status="Monitoring"
            />

          </tbody>

        </table>

      </div>

    </div>
  )
}

function Card({icon,title,value,color}) {

return(

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

function Row({
aircraft,
location,
status
}){

return(

<tr className="border-b border-slate-800">

<td className="p-3">
{aircraft}
</td>

<td className="p-3">
{location}
</td>

<td className="p-3 text-red-400">
{status}
</td>

</tr>

)

}

export default Airspace