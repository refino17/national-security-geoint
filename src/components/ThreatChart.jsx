import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer
} from "recharts"

const data = [
  { day: "Mon", threats: 12 },
  { day: "Tue", threats: 18 },
  { day: "Wed", threats: 9 },
  { day: "Thu", threats: 22 },
  { day: "Fri", threats: 27 },
  { day: "Sat", threats: 16 },
  { day: "Sun", threats: 31 }
]

function ThreatChart() {
  return (
    <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 mt-6">
      <h3 className="font-semibold mb-4">
        Weekly Threat Activity
      </h3>

      <div className="h-[300px]">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={data}>
            <XAxis dataKey="day" stroke="#94a3b8"/>
            <YAxis stroke="#94a3b8"/>
            <Tooltip/>

            <Line
              type="monotone"
              dataKey="threats"
              stroke="#10b981"
              strokeWidth={3}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  )
}

export default ThreatChart