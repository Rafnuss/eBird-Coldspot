import "./style.css";
import mapboxgl from "mapbox-gl";

mapboxgl.accessToken = "pk.eyJ1IjoicmFmbnVzcyIsImEiOiIzMVE1dnc0In0.3FNMKIlQ_afYktqki-6m0g";

const match = window.location.search.match(/@(-?\d+\.\d+),(-?\d+\.\d+),(\d+)z/);
const center = match ? [parseFloat(match[2]), parseFloat(match[1])] : [20, 0];
const zoom = match ? parseInt(match[3], 10) : 2;

const map = new mapboxgl.Map({
  container: "map",
  style: "mapbox://styles/mapbox/dark-v11",
  center,
  zoom,
});

map.on("moveend", () => {
  const { lng, lat } = map.getCenter();
  const zoom = Math.round(map.getZoom());
  const newParams = `?@${lat.toFixed(6)},${lng.toFixed(6)},${zoom}z`;

  window.history.replaceState(null, "", newParams);
});

map.on("load", async () => {
  const response = await fetch("./ebird_loc.geojson"); // Fetch from public folder
  const geojsonData = await response.json();

  map.addSource("loc", {
    type: "geojson",
    data: geojsonData,
  });

  map.addLayer({
    id: "loc-heat",
    type: "heatmap",
    source: "loc",
    //maxzoom: 9,
    paint: {
      "heatmap-weight": ["log10", ["get", "w"]],
      "heatmap-intensity": ["interpolate", ["linear"], ["zoom"], 0, 0.1, 12, 1],
      "heatmap-color": [
        "interpolate",
        ["linear"],
        ["heatmap-density"],
        0,
        "rgba(33,102,172,0)",
        0.2,
        "rgb(103,169,207)",
        0.4,
        "rgb(209,229,240)",
        0.6,
        "rgb(253,219,199)",
        0.8,
        "rgb(239,138,98)",
        1,
        "rgb(178,24,43)",
      ],
      "heatmap-radius": ["interpolate", ["linear"], ["zoom"], 2, 1, 14, 20],
      //"heatmap-opacity": ["interpolate", ["linear"], ["zoom"], 10, 1, 20, 0],
    },
  });
});
