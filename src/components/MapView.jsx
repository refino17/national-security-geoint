import { useEffect, useRef, useState } from "react"
import maplibregl from "maplibre-gl"
import "maplibre-gl/dist/maplibre-gl.css"
import {
  Satellite,
  Map,
  Mountain,
  Flame,
  LocateFixed,
  Layers,
  Maximize2,
  Minimize2,
} from "lucide-react"
import { supabase } from "../services/supabaseClient"

function MapView() {
  const mapWrapperRef = useRef(null)
  const mapContainerRef = useRef(null)
  const mapRef = useRef(null)
  const markersRef = useRef([])

  const [activeLayer, setActiveLayer] = useState("satellite")
  const [heatmapVisible, setHeatmapVisible] = useState(true)
  const [isFullscreen, setIsFullscreen] = useState(false)
  const [stats, setStats] = useState({
    total: 0,
    critical: 0,
    high: 0,
    medium: 0,
    low: 0,
  })

  useEffect(() => {
    function handleFullscreenChange() {
      const fullscreenActive = !!document.fullscreenElement
      setIsFullscreen(fullscreenActive)

      setTimeout(() => {
        mapRef.current?.resize()
      }, 300)
    }

    document.addEventListener("fullscreenchange", handleFullscreenChange)

    return () => {
      document.removeEventListener("fullscreenchange", handleFullscreenChange)
    }
  }, [])

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
            tiles: ["https://tile.openstreetmap.org/{z}/{x}/{y}.png"],
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
      zoom: 5.3,
      pitch: 20,
      bearing: -5,
    })

    mapRef.current = map

    map.addControl(
      new maplibregl.NavigationControl({
        visualizePitch: true,
      }),
      "top-right"
    )

    function clearMarkers() {
      markersRef.current.forEach((marker) => marker.remove())
      markersRef.current = []
    }

    function priorityColor(priority) {
      if (priority === "Critical") return "#ef4444"
      if (priority === "High") return "#f97316"
      if (priority === "Medium") return "#eab308"
      return "#10b981"
    }

    function getWeight(priority) {
      if (priority === "Critical") return 1
      if (priority === "High") return 0.8
      if (priority === "Medium") return 0.55
      return 0.35
    }

    function buildGeoJson(threats) {
      return {
        type: "FeatureCollection",
        features: threats.map((threat) => ({
          type: "Feature",
          properties: {
            title: threat.title,
            priority: threat.priority,
            status: threat.status,
            weight: getWeight(threat.priority),
          },
          geometry: {
            type: "Point",
            coordinates: [Number(threat.longitude), Number(threat.latitude)],
          },
        })),
      }
    }

    function updateStats(threats) {
      setStats({
        total: threats.length,
        critical: threats.filter((t) => t.priority === "Critical").length,
        high: threats.filter((t) => t.priority === "High").length,
        medium: threats.filter((t) => t.priority === "Medium").length,
        low: threats.filter((t) => t.priority === "Low").length,
      })
    }

    function updateHeatmap(threats) {
      const geoJson = buildGeoJson(threats)

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
          "heatmap-intensity": 2.2,
          "heatmap-radius": 32,
          "heatmap-opacity": 0.68,
          "heatmap-color": [
            "interpolate",
            ["linear"],
            ["heatmap-density"],
            0,
            "rgba(16,185,129,0)",
            0.3,
            "rgba(16,185,129,0.4)",
            0.55,
            "rgba(234,179,8,0.6)",
            0.75,
            "rgba(249,115,22,0.75)",
            1,
            "rgba(239,68,68,0.9)",
          ],
        },
      })
    }

    function createMarker(threat) {
      const color = priorityColor(threat.priority)

      const el = document.createElement("div")
      el.innerHTML = `
        <div style="
          width: 22px;
          height: 22px;
          border-radius: 999px;
          background: ${color};
          border: 3px solid white;
          box-shadow: 0 0 0 7px ${color}40, 0 0 25px ${color};
        "></div>
      `

      const popupHtml = `
        <div style="font-family: Inter, system-ui; color: #020617; min-width: 220px;">
          <h3 style="font-weight: 800; margin-bottom: 8px;">${threat.title}</h3>
          <p><strong>Location:</strong> ${threat.location}</p>
          <p><strong>Priority:</strong> ${threat.priority}</p>
          <p><strong>Status:</strong> ${threat.status}</p>
          <p><strong>Coordinates:</strong> ${threat.latitude}, ${threat.longitude}</p>
        </div>
      `

      const marker = new maplibregl.Marker({ element: el })
        .setLngLat([Number(threat.longitude), Number(threat.latitude)])
        .setPopup(new maplibregl.Popup({ maxWidth: "300px" }).setHTML(popupHtml))
        .addTo(map)

      markersRef.current.push(marker)
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
          "fill-opacity": 0.13,
        },
      })

      map.addLayer({
        id: "intelligence-zone-border",
        type: "line",
        source: "intelligence-zone",
        paint: {
          "line-color": "#34d399",
          "line-width": 2,
          "line-dasharray": [2, 2],
        },
      })
    }

    async function loadThreatData() {
      clearMarkers()

      const { data, error } = await supabase
        .from("threats")
        .select("*")
        .not("latitude", "is", null)
        .not("longitude", "is", null)

      if (error) return

      const threats = data || []

      updateStats(threats)
      updateHeatmap(threats)
      threats.forEach(createMarker)
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

    map.setLayoutProperty(`${layerName}-layer`, "visibility", "visible")
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

  function recenterMap() {
    const map = mapRef.current
    if (!map) return

    map.flyTo({
      center: [3.3792, 6.5244],
      zoom: 5.3,
      pitch: 20,
      bearing: -5,
      duration: 1000,
    })
  }

  async function toggleFullscreen() {
    const wrapper = mapWrapperRef.current

    if (!wrapper) return

    try {
      if (!document.fullscreenElement) {
        await wrapper.requestFullscreen()
      } else {
        await document.exitFullscreen()
      }

      setTimeout(() => {
        mapRef.current?.resize()
      }, 300)
    } catch (error) {
      console.error("Fullscreen error:", error)
    }
  }

  return (
    <div
      ref={mapWrapperRef}
      className={`rounded-[2rem] border border-white/10 bg-slate-950 shadow-card overflow-hidden ${
        isFullscreen ? "w-screen h-screen rounded-none border-0" : ""
      }`}
    >
      <div className="flex flex-col xl:flex-row xl:items-center xl:justify-between gap-4 p-4 border-b border-white/10 bg-slate-950/95">
        <div>
          <p className="text-xs text-emerald-300 font-black flex items-center gap-2">
            <Layers size={14} />
            GEOINT MAP CONTROL
          </p>

          <p className="text-xs text-slate-500 mt-1">
            Live satellite map, threat markers, intelligence zone and heat density.
          </p>
        </div>

        <div className="flex flex-wrap gap-2">
          <LayerButton
            icon={<Satellite size={14} />}
            label="Satellite"
            active={activeLayer === "satellite"}
            onClick={() => switchLayer("satellite")}
          />

          <LayerButton
            icon={<Map size={14} />}
            label="Streets"
            active={activeLayer === "streets"}
            onClick={() => switchLayer("streets")}
          />

          <LayerButton
            icon={<Mountain size={14} />}
            label="Terrain"
            active={activeLayer === "terrain"}
            onClick={() => switchLayer("terrain")}
          />

          <LayerButton
            icon={<Flame size={14} />}
            label="Heatmap"
            active={heatmapVisible}
            onClick={toggleHeatmap}
          />

          <LayerButton
            icon={<LocateFixed size={14} />}
            label="Center"
            active={false}
            onClick={recenterMap}
          />

          <LayerButton
            icon={isFullscreen ? <Minimize2 size={14} /> : <Maximize2 size={14} />}
            label={isFullscreen ? "Exit Fullscreen" : "Fullscreen"}
            active={isFullscreen}
            onClick={toggleFullscreen}
          />
        </div>
      </div>

      <div className="relative">
        <div
          ref={mapContainerRef}
          className={`w-full ${
            isFullscreen ? "h-[calc(100vh-88px)]" : "h-[430px] md:h-[480px]"
          }`}
        />

        <div className="absolute bottom-4 left-4 z-10 bg-slate-950/90 backdrop-blur-xl border border-white/10 rounded-2xl p-3 shadow-card max-w-[calc(100%-2rem)]">
          <p className="text-[11px] text-slate-500 mb-2">
            THREAT DENSITY
          </p>

          <div className="flex flex-wrap items-center gap-3 text-xs text-slate-300">
            <Legend color="bg-emerald-400" label={`Low ${stats.low}`} />
            <Legend color="bg-yellow-400" label={`Medium ${stats.medium}`} />
            <Legend color="bg-orange-400" label={`High ${stats.high}`} />
            <Legend color="bg-red-400" label={`Critical ${stats.critical}`} />
          </div>
        </div>

        <div className="absolute bottom-4 right-4 z-10 hidden md:block bg-slate-950/90 backdrop-blur-xl border border-white/10 rounded-2xl p-3 shadow-card">
          <p className="text-[11px] text-slate-500">TOTAL THREATS</p>
          <p className="text-2xl font-black text-emerald-300">
            {stats.total}
          </p>
        </div>
      </div>
    </div>
  )
}

function LayerButton({ icon, label, active, onClick }) {
  return (
    <button
      onClick={onClick}
      className={`flex items-center gap-2 px-3 py-2 rounded-2xl text-xs font-black transition ${
        active
          ? "bg-gradient-to-r from-emerald-400 to-cyan-400 text-slate-950 shadow-glow"
          : "bg-white/5 text-slate-300 border border-white/10 hover:bg-white/10"
      }`}
    >
      {icon}
      {label}
    </button>
  )
}

function Legend({ color, label }) {
  return (
    <span className="flex items-center gap-2">
      <span className={`w-3 h-3 rounded-full ${color}`}></span>
      {label}
    </span>
  )
}

export default MapView