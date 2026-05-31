import { useEffect } from "react"
import maplibregl from "maplibre-gl"
import "maplibre-gl/dist/maplibre-gl.css"
import { supabase } from "../services/supabaseClient"

function MapView() {
  useEffect(() => {
    const map = new maplibregl.Map({
      container: "map",
      style: "https://demotiles.maplibre.org/style.json",
      center: [3.3792, 6.5244],
      zoom: 5,
    })

    async function loadThreatMarkers() {
      const { data: threats, error } = await supabase
        .from("threats")
        .select("*")
        .not("latitude", "is", null)
        .not("longitude", "is", null)

      if (error) return

      threats.forEach((threat) => {
        const color =
          threat.priority === "Critical"
            ? "red"
            : threat.priority === "High"
            ? "orange"
            : threat.priority === "Medium"
            ? "yellow"
            : "green"

        new maplibregl.Marker({ color })
          .setLngLat([threat.longitude, threat.latitude])
          .setPopup(
            new maplibregl.Popup().setHTML(`
              <div>
                <h3 style="font-weight:bold;">${threat.title}</h3>
                <p><strong>Location:</strong> ${threat.location}</p>
                <p><strong>Priority:</strong> ${threat.priority}</p>
                <p><strong>Status:</strong> ${threat.status}</p>
              </div>
            `)
          )
          .addTo(map)
      })
    }

    map.on("load", () => {
      map.addSource("zone", {
        type: "geojson",
        data: {
          type: "Feature",
          geometry: {
            type: "Polygon",
            coordinates: [
              [
                [2.5, 6.0],
                [4.5, 6.0],
                [4.5, 7.5],
                [2.5, 7.5],
                [2.5, 6.0],
              ],
            ],
          },
        },
      })

      map.addLayer({
        id: "zone-layer",
        type: "fill",
        source: "zone",
        paint: {
          "fill-color": "#10b981",
          "fill-opacity": 0.25,
        },
      })

      loadThreatMarkers()
    })

    return () => map.remove()
  }, [])

  return (
    <div
      id="map"
      className="w-full h-[450px] rounded-xl overflow-hidden"
    />
  )
}

export default MapView