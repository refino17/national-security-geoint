import { useEffect, useRef, useState } from "react"
import maplibregl from "maplibre-gl"
import "maplibre-gl/dist/maplibre-gl.css"
import { supabase } from "../services/supabaseClient"

function MapView() {
  const mapContainerRef = useRef(null)
  const mapRef = useRef(null)
  const markersRef = useRef([])
  const [activeLayer, setActiveLayer] = useState("satellite")
  const [heatmapVisible, setHeatmapVisible] = useState(true)

  useEffect(() => {
    const map = new maplibregl.Map({
      container: mapContainerRef.current,
      style: {
        version: 8,
        sources: {
          satellite: {
            type: "raster",
            tiles: [
              "https://services.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}",
            ],
            tileSize: 256,
            attribution: "Tiles © Esri",
          },
          streets: {
            type: "raster",
            tiles: [
              "https://tile.openstreetmap.org/{z}/{x}/{y}.png",
            ],
            tileSize: 256,
            attribution: "© OpenStreetMap contributors",
          },
          terrain: {
            type: "raster",
            tiles: [
              "https://a.tile.opentopomap.org/{z}/{x}/{y}.png",
              "https://b.tile.opentopomap.org/{z}/{x}/{y}.png",
              "https://c.tile.opentopomap.org/{z}/{x}/{y}.png",
            ],
            tileSize: 256,
            attribution: "© OpenTopoMap contributors",
          },
        },
        layers: [
          {
            id: "satellite-layer",
            type: "raster",
            source: "satellite",
            layout: { visibility: "visible" },
          },
          {
            id: "streets-layer",
            type: "raster",
            source: "streets",
            layout: { visibility: "none" },
          },
          {
            id: "terrain-layer",
            type: "raster",
            source: "terrain",
            layout: { visibility: "none" },
          },
        ],
      },
      center: [3.3792, 6.5244],
      zoom: 5,
    })

    mapRef.current = map

    map.addControl(new maplibregl.NavigationControl(), "top-right")

    function clearMarkers() {
      markersRef.current.forEach((marker) => marker.remove())
      markersRef.current = []
    }

    function getThreatWeight(priority) {
      if (priority === "Critical") return 1
      if (priority === "High") return 0.8
      if (priority === "Medium") return 0.55
      return 0.35
    }

    function buildThreatGeoJson(threats) {
      return {
        type: "FeatureCollection",
        features: threats.map((threat) => ({
          type: "Feature",
          properties: {
            title: threat.title,
            priority: threat.priority,
            status: threat.status,
            weight: getThreatWeight(threat.priority),
          },
          geometry: {
            type: "Point",
            coordinates: [Number(threat.longitude), Number(threat.latitude)],
          },
        })),
      }
    }

    function updateHeatmap(threats) {
      const geoJson = buildThreatGeoJson(threats)

      if (map.getSource("threat-heatmap-source")) {
        map.getSource("threat-heatmap-source").setData(geoJson)
        return
      }

      map.addSource("threat-heatmap-source", {
        type: "geojson",
        data: geoJson,
      })

      map.addLayer({
        id: "threat-heatmap-layer",
        type: "heatmap",
        source: "threat-heatmap-source",
        maxzoom: 12,
        paint: {
          "heatmap-weight": ["get", "weight"],
          "heatmap-intensity": [
            "interpolate",
            ["linear"],
            ["zoom"],
            0,
            1,
            9,
            3,
          ],
          "heatmap-radius": [
            "interpolate",
            ["linear"],
            ["zoom"],
            0,
            15,
            9,
            35,
          ],
          "heatmap-opacity": 0.75,
          "heatmap-color": [
            "interpolate",
            ["linear"],
            ["heatmap-density"],
            0,
            "rgba(16,185,129,0)",
            0.25,
            "rgba(16,185,129,0.45)",
            0.5,
            "rgba(245,158,11,0.65)",
            0.75,
            "rgba(249,115,22,0.8)",
            1,
            "rgba(239,68,68,0.95)",
          ],
        },
      })
    }

    async function loadThreatData() {
      clearMarkers()

      const { data: threats, error } = await supabase
        .from("threats")
        .select("*")
        .not("latitude", "is", null)
        .not("longitude", "is", null)

      if (error) return

      updateHeatmap(threats)

      threats.forEach((threat) => {
        const color =
          threat.priority === "Critical"
            ? "red"
            : threat.priority === "High"
            ? "orange"
            : threat.priority === "Medium"
            ? "yellow"
            : "green"

        const marker = new maplibregl.Marker({ color })
          .setLngLat([threat.longitude, threat.latitude])
          .setPopup(
            new maplibregl.Popup().setHTML(`
              <div style="font-family: Arial, sans-serif;">
                <h3 style="font-weight: bold; margin-bottom: 6px;">
                  ${threat.title}
                </h3>
                <p><strong>Location:</strong> ${threat.location}</p>
                <p><strong>Priority:</strong> ${threat.priority}</p>
                <p><strong>Status:</strong> ${threat.status}</p>
                <p><strong>Coordinates:</strong> ${threat.latitude}, ${threat.longitude}</p>
              </div>
            `)
          )
          .addTo(map)

        markersRef.current.push(marker)
      })
    }

    function addIntelligenceZone() {
      if (map.getSource("intelligence-zone")) return

      map.addSource("intelligence-zone", {
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
        id: "intelligence-zone-fill",
        type: "fill",
        source: "intelligence-zone",
        paint: {
          "fill-color": "#10b981",
          "fill-opacity": 0.22,
        },
      })

      map.addLayer({
        id: "intelligence-zone-border",
        type: "line",
        source: "intelligence-zone",
        paint: {
          "line-color": "#10b981",
          "line-width": 2,
        },
      })
    }

    map.on("load", () => {
      addIntelligenceZone()
      loadThreatData()
    })

    const channel = supabase
      .channel("realtime-threat-map")
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "threats",
        },
        () => {
          loadThreatData()
        }
      )
      .subscribe()

    return () => {
      clearMarkers()
      supabase.removeChannel(channel)
      map.remove()
    }
  }, [])

  function switchLayer(layerName) {
    const map = mapRef.current
    if (!map) return

    const layers = ["satellite-layer", "streets-layer", "terrain-layer"]

    layers.forEach((layerId) => {
      if (map.getLayer(layerId)) {
        map.setLayoutProperty(layerId, "visibility", "none")
      }
    })

    if (layerName === "satellite") {
      map.setLayoutProperty("satellite-layer", "visibility", "visible")
    }

    if (layerName === "streets") {
      map.setLayoutProperty("streets-layer", "visibility", "visible")
    }

    if (layerName === "terrain") {
      map.setLayoutProperty("terrain-layer", "visibility", "visible")
    }

    setActiveLayer(layerName)
  }

  function toggleHeatmap() {
    const map = mapRef.current
    if (!map || !map.getLayer("threat-heatmap-layer")) return

    const nextValue = !heatmapVisible

    map.setLayoutProperty(
      "threat-heatmap-layer",
      "visibility",
      nextValue ? "visible" : "none"
    )

    setHeatmapVisible(nextValue)
  }

  return (
    <div className="relative">
      <div className="absolute top-4 left-4 z-10 bg-slate-950/90 border border-slate-700 rounded-2xl p-3 shadow-xl">
        <p className="text-xs text-slate-400 mb-2">
          GEOINT Layers
        </p>

        <div className="flex flex-wrap gap-2">
          <LayerButton
            label="Satellite"
            active={activeLayer === "satellite"}
            onClick={() => switchLayer("satellite")}
          />

          <LayerButton
            label="Streets"
            active={activeLayer === "streets"}
            onClick={() => switchLayer("streets")}
          />

          <LayerButton
            label="Terrain"
            active={activeLayer === "terrain"}
            onClick={() => switchLayer("terrain")}
          />

          <LayerButton
            label="Heatmap"
            active={heatmapVisible}
            onClick={toggleHeatmap}
          />
        </div>
      </div>

      <div className="absolute bottom-4 left-4 z-10 bg-slate-950/90 border border-slate-700 rounded-2xl p-3 shadow-xl">
        <p className="text-xs text-slate-400 mb-2">
          Threat Density
        </p>

        <div className="flex items-center gap-2 text-xs text-slate-300">
          <span className="w-3 h-3 rounded-full bg-emerald-500"></span>
          Low
          <span className="w-3 h-3 rounded-full bg-yellow-500 ml-2"></span>
          Medium
          <span className="w-3 h-3 rounded-full bg-orange-500 ml-2"></span>
          High
          <span className="w-3 h-3 rounded-full bg-red-500 ml-2"></span>
          Critical
        </div>
      </div>

      <div
        ref={mapContainerRef}
        className="w-full h-[450px] rounded-xl overflow-hidden"
      />
    </div>
  )
}

function LayerButton({ label, active, onClick }) {
  return (
    <button
      onClick={onClick}
      className={`px-3 py-2 rounded-xl text-xs font-semibold transition ${
        active
          ? "bg-emerald-500 text-slate-950"
          : "bg-slate-800 text-slate-300 hover:bg-slate-700"
      }`}
    >
      {label}
    </button>
  )
}

export default MapView