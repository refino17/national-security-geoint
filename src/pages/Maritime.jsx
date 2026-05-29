import { Ship, Waves, AlertTriangle, Radio } from "lucide-react"

function Maritime() {
  return (
    <div>

      <h1 className="text-3xl font-bold mb-2">
        Maritime Domain Awareness
      </h1>

      <p className="text-slate-400 mb-8">
        Monitor vessels, maritime routes,
        coastal surveillance and suspicious sea activity.
      </p>

      <div className="grid md:grid-cols-4 gap-5 mb-8">

        <Card
          icon={<Ship />}
          title="Tracked Vessels"
          value="83"
          color="text-cyan-400"
        />

        <Card
          icon={<Waves />}
          title="Sea Routes"
          value="22"
          color="text-blue-400"
        />

        <Card
          icon={<AlertTriangle />}
          title="Threat Alerts"
          value="7"
          color="text-red-400"
        />

        <Card
          icon={<Radio />}
          title="Signal Stations"
          value="15"
          color="text-emerald-400"
        />

      </div>

      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6">

        <h2 className="font-bold text-lg mb-5">
          Maritime Activity Feed
        </h2>

        <table className="w-full">

          <thead className="border-b border-slate-700 text-slate-400">

            <tr>
              <th className="text-left p-3">Vessel</th>
              <th className="text-left p-3">Location</th>
              <th className="text-left p-3">Status</th>
            </tr>

          </thead>

          <tbody>

            <Row
              vessel="Cargo Alpha"
              location="Lagos Coast"
              status="Tracked"
            />

            <Row
              vessel="Sea Patrol X7"
              location="Atlantic Route"
              status="Suspicious"
            />

            <Row
              vessel="Marine Unit B2"
              location="South Coast"
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
vessel,
location,
status
}){

return(

<tr className="border-b border-slate-800">

<td className="p-3">
{vessel}
</td>

<td className="p-3">
{location}
</td>

<td className="p-3 text-emerald-400">
{status}
</td>

</tr>

)

}

export default Maritime