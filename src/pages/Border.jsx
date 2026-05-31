import { useEffect, useState } from "react"
import {
  AlertTriangle,
  Shield,
  MapPin,
  Satellite,
  RefreshCw,
  CloudRain,
  Wind,
  Thermometer,
  Eye,
} from "lucide-react"

function Border() {
  const [events, setEvents] = useState([])
  const [weather, setWeather] = useState(null)
  const [loading, setLoading] = useState(false)
  const [weatherLoading, setWeatherLoading] = useState(false)
  const [message, setMessage] = useState("")

  const borderLatitude = 6.5244
  const borderLongitude = 3.3792

  useEffect(() => {
    fetchSatelliteEvents()
    fetchWeatherIntelligence()
  }, [])

  async function fetchSatelliteEvents() {
    setLoading(true)
    setMessage("")

    try {
      const response = await fetch(
        "https://eonet.gsfc.nasa.gov/api/v3/events?status=open&limit=10"
      )

      if (!response.ok) {
        throw new Error("Unable to fetch NASA EONET data.")
      }

      const data = await response.json()
      setEvents(data.events || [])
    } catch (error) {
      setMessage(error.message)
    }

    setLoading(false)
  }

  async function fetchWeatherIntelligence() {
    setWeatherLoading(true)

    try {
      const response = await fetch(
        `https://api.open-meteo.com/v1/forecast?latitude=${borderLatitude}&longitude=${borderLongitude}&current=temperature_2m,precipitation,rain,weather_code,wind_speed_10m,wind_direction_10m&hourly=visibility,cloud_cover&timezone=auto`
      )

      if (!response.ok) {
        throw new Error("Unable to fetch weather intelligence.")
      }

      const data = await response.json()
      setWeather(data)
    } catch (error) {
      setMessage(error.message)
    }

    setWeatherLoading(false)
  }

  function refreshAllFeeds() {
    fetchSatelliteEvents()
    fetchWeatherIntelligence()
  }

  const wildfireCount = events.filter((event) =>
    event.categories?.some((category) =>
      category.id?.toLowerCase().includes("wildfire")
    )
  ).length

  const stormCount = events.filter((event) =>
    event.categories?.some((category) =>
      category.id?.toLowerCase().includes("storm")
    )
  ).length

  const activeEventCount = events.length
  const currentWeather = weather?.current
  const currentVisibility = weather?.hourly?.visibility?.[0]
  const currentCloudCover = weather?.hourly?.cloud_cover?.[0]
  const operationalRisk = calculateOperationalRisk(
    currentWeather?.rain,
    currentWeather?.wind_speed_10m,
    currentVisibility,
    currentCloudCover
  )

  return (
    <div>
      <h1 className="text-3xl font-bold mb-2">
        Border Intelligence Center
      </h1>

      <p className="text-slate-400 mb-8">
        Monitor border activity, checkpoints, suspicious movement, satellite events, and weather conditions for field operations.
      </p>

      <div className="grid md:grid-cols-4 gap-5 mb-8">
        <InfoCard
          icon={<AlertTriangle />}
          title="Active NASA Events"
          value={activeEventCount}
          color="text-red-400"
        />

        <InfoCard
          icon={<Satellite />}
          title="Wildfire Signals"
          value={wildfireCount}
          color="text-orange-400"
        />

        <InfoCard
          icon={<MapPin />}
          title="Storm Signals"
          value={stormCount}
          color="text-blue-400"
        />

        <InfoCard
          icon={<Shield />}
          title="Operational Risk"
          value={operationalRisk}
          color={riskTextColor(operationalRisk)}
        />
      </div>

      <div className="flex justify-end mb-6">
        <button
          onClick={refreshAllFeeds}
          disabled={loading || weatherLoading}
          className="flex items-center gap-2 bg-emerald-500 text-slate-950 font-bold px-5 py-2 rounded-xl hover:bg-emerald-400 transition disabled:opacity-60"
        >
          <RefreshCw size={16} />
          {loading || weatherLoading ? "Refreshing..." : "Refresh Intelligence Feeds"}
        </button>
      </div>

      {message && (
        <div className="bg-red-500/10 border border-red-500/30 text-red-400 p-3 rounded-xl mb-5 text-sm">
          {message}
        </div>
      )}

      <div className="grid lg:grid-cols-2 gap-6 mb-8">
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6">
          <h2 className="font-bold text-lg mb-2">
            Weather Intelligence
          </h2>

          <p className="text-slate-500 text-sm mb-5">
            Live operational weather conditions for Lagos border sector.
          </p>

          {weatherLoading ? (
            <p className="text-slate-400">Loading weather intelligence...</p>
          ) : !currentWeather ? (
            <p className="text-slate-500">No weather data available.</p>
          ) : (
            <div className="grid md:grid-cols-2 gap-4">
              <WeatherCard
                icon={<Thermometer />}
                title="Temperature"
                value={`${currentWeather.temperature_2m}°C`}
                color="text-orange-400"
              />

              <WeatherCard
                icon={<CloudRain />}
                title="Rain"
                value={`${currentWeather.rain} mm`}
                color="text-blue-400"
              />

              <WeatherCard
                icon={<Wind />}
                title="Wind Speed"
                value={`${currentWeather.wind_speed_10m} km/h`}
                color="text-emerald-400"
              />

              <WeatherCard
                icon={<Eye />}
                title="Visibility"
                value={formatVisibility(currentVisibility)}
                color="text-purple-400"
              />

              <WeatherCard
                icon={<Satellite />}
                title="Cloud Cover"
                value={`${currentCloudCover ?? 0}%`}
                color="text-slate-300"
              />

              <WeatherCard
                icon={<Shield />}
                title="Field Risk"
                value={operationalRisk}
                color={riskTextColor(operationalRisk)}
              />
            </div>
          )}
        </div>

        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6">
          <h2 className="font-bold text-lg mb-2">
            Operational Interpretation
          </h2>

          <p className="text-slate-500 text-sm mb-5">
            Weather impact assessment for surveillance, patrol, drone and checkpoint operations.
          </p>

          <div className="space-y-4">
            <InsightRow
              label="Drone Operations"
              value={getDroneAssessment(currentWeather?.wind_speed_10m, currentWeather?.rain)}
            />

            <InsightRow
              label="Border Patrol"
              value={getPatrolAssessment(currentWeather?.rain, currentVisibility)}
            />

            <InsightRow
              label="Camera Surveillance"
              value={getVisibilityAssessment(currentVisibility, currentCloudCover)}
            />

            <InsightRow
              label="Recommended Action"
              value={getRecommendedAction(operationalRisk)}
            />
          </div>
        </div>
      </div>

      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 mb-8">
        <div className="flex items-center justify-between gap-4 mb-5">
          <div>
            <h2 className="font-bold text-lg">
              NASA Satellite Intelligence Feed
            </h2>

            <p className="text-slate-500 text-sm mt-1">
              Live open natural-event feed from NASA EONET.
            </p>
          </div>
        </div>

        <table className="w-full">
          <thead className="text-slate-400 border-b border-slate-700">
            <tr>
              <th className="text-left p-3">Event</th>
              <th className="text-left p-3">Category</th>
              <th className="text-left p-3">Source</th>
              <th className="text-left p-3">Status</th>
            </tr>
          </thead>

          <tbody>
            {events.length === 0 ? (
              <tr>
                <td className="p-3 text-slate-500" colSpan="4">
                  {loading ? "Loading NASA satellite feed..." : "No satellite events found."}
                </td>
              </tr>
            ) : (
              events.map((event) => (
                <SatelliteRow key={event.id} event={event} />
              ))
            )}
          </tbody>
        </table>
      </div>

      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6">
        <h2 className="font-bold text-lg mb-5">
          Border Surveillance Feed
        </h2>

        <table className="w-full">
          <thead className="text-slate-400 border-b border-slate-700">
            <tr>
              <th className="text-left p-3">Sector</th>
              <th className="text-left p-3">Activity</th>
              <th className="text-left p-3">Risk</th>
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

function InfoCard({ icon, title, value, color }) {
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

function WeatherCard({ icon, title, value, color }) {
  return (
    <div className="bg-slate-950 border border-slate-800 rounded-2xl p-4">
      <div className={`${color} mb-3`}>
        {icon}
      </div>

      <p className="text-slate-500 text-sm">
        {title}
      </p>

      <p className="text-xl font-bold mt-1">
        {value}
      </p>
    </div>
  )
}

function InsightRow({ label, value }) {
  return (
    <div className="bg-slate-950 border border-slate-800 rounded-xl p-4">
      <p className="text-slate-500 text-sm">
        {label}
      </p>

      <p className="text-slate-200 font-semibold mt-1">
        {value}
      </p>
    </div>
  )
}

function SatelliteRow({ event }) {
  const category =
    event.categories?.map((item) => item.title || item.id).join(", ") ||
    "Unknown"

  const source =
    event.sources?.map((item) => item.id).join(", ") ||
    "NASA"

  return (
    <tr className="border-b border-slate-800">
      <td className="p-3">
        <p className="font-semibold">
          {event.title}
        </p>

        <p className="text-slate-500 text-xs">
          ID: {event.id}
        </p>
      </td>

      <td className="p-3 text-slate-300">
        {category}
      </td>

      <td className="p-3 text-slate-300">
        {source}
      </td>

      <td className="p-3 text-emerald-400">
        Open
      </td>
    </tr>
  )
}

function Row({ sector, activity, risk }) {
  return (
    <tr className="border-b border-slate-800">
      <td className="p-3">
        {sector}
      </td>

      <td className="p-3">
        {activity}
      </td>

      <td className={riskColor(risk)}>
        {risk}
      </td>
    </tr>
  )
}

function formatVisibility(value) {
  if (!value && value !== 0) return "Unknown"

  if (value >= 1000) {
    return `${(value / 1000).toFixed(1)} km`
  }

  return `${value} m`
}

function calculateOperationalRisk(rain = 0, wind = 0, visibility = 10000, cloudCover = 0) {
  let score = 0

  if (rain > 5) score += 3
  else if (rain > 1) score += 2
  else if (rain > 0) score += 1

  if (wind > 40) score += 3
  else if (wind > 25) score += 2
  else if (wind > 15) score += 1

  if (visibility < 1000) score += 3
  else if (visibility < 3000) score += 2
  else if (visibility < 6000) score += 1

  if (cloudCover > 85) score += 2
  else if (cloudCover > 60) score += 1

  if (score >= 7) return "Critical"
  if (score >= 4) return "High"
  if (score >= 2) return "Medium"
  return "Low"
}

function riskTextColor(risk) {
  if (risk === "Critical") return "text-red-400"
  if (risk === "High") return "text-orange-400"
  if (risk === "Medium") return "text-yellow-400"
  return "text-emerald-400"
}

function riskColor(risk) {
  if (risk === "Critical") return "p-3 text-red-400 font-semibold"
  if (risk === "High") return "p-3 text-orange-400 font-semibold"
  if (risk === "Medium") return "p-3 text-yellow-400 font-semibold"
  return "p-3 text-emerald-400 font-semibold"
}

function getDroneAssessment(wind = 0, rain = 0) {
  if (wind > 35 || rain > 5) return "Unsafe for drone surveillance"
  if (wind > 20 || rain > 1) return "Limited drone operation recommended"
  return "Drone surveillance conditions acceptable"
}

function getPatrolAssessment(rain = 0, visibility = 10000) {
  if (rain > 5 || visibility < 1500) return "High caution required for patrol movement"
  if (rain > 1 || visibility < 4000) return "Moderate caution for field units"
  return "Patrol conditions normal"
}

function getVisibilityAssessment(visibility = 10000, cloudCover = 0) {
  if (visibility < 1500 || cloudCover > 85) return "Surveillance visibility degraded"
  if (visibility < 5000 || cloudCover > 60) return "Partial visibility limitations"
  return "Visibility suitable for monitoring"
}

function getRecommendedAction(risk) {
  if (risk === "Critical") return "Delay drone operations and increase fixed checkpoint monitoring"
  if (risk === "High") return "Use caution, reduce drone exposure, increase patrol coordination"
  if (risk === "Medium") return "Continue operations with weather-aware monitoring"
  return "Normal operations"
}

export default Border