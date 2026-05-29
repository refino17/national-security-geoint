import { useEffect } from "react"
import maplibregl from "maplibre-gl"
import "maplibre-gl/dist/maplibre-gl.css"

function MapView() {
  useEffect(() => {
    const map = new maplibregl.Map({
      container: "map",
      style: "https://demotiles.maplibre.org/style.json",
      center: [3.3792, 6.5244],
      zoom: 5
    })

    map.on("load", () => {
      // Lagos threat marker
      new maplibregl.Marker({ color: "red" })
        .setLngLat([3.3792, 6.5244])
        .setPopup(
          new maplibregl.Popup().setHTML(
            "<h3>Threat Alert</h3><p>Unauthorized movement detected</p>"
          )
        )
        .addTo(map)

      // Abuja
      new maplibregl.Marker({ color: "orange" })
        .setLngLat([7.3986, 9.0765])
        .setPopup(
          new maplibregl.Popup().setHTML(
            "<h3>Border Zone</h3><p>Suspicious activity</p>"
          )
        )
        .addTo(map)

      // Intelligence Zone polygon
      map.addSource("zone", {
        type: "geojson",
        data: {
          type: "Feature",
          geometry: {
            type: "Polygon",
            coordinates: [[
              [2.5,6.0],
              [4.5,6.0],
              [4.5,7.5],
              [2.5,7.5],
              [2.5,6.0]
            ]]
          }
        }
      })

      map.addLayer({
        id:"zone-layer",
        type:"fill",
        source:"zone",
        paint:{
          "fill-color":"#10b981",
          "fill-opacity":0.3
        }
      })
    })

    return ()=>map.remove()

  },[])

  return (
    <div
      id="map"
      className="w-full h-[450px] rounded-xl overflow-hidden"
    />
  )
}

export default MapView