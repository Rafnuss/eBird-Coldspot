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

const layers = {
  heatmap: "loc-heat",
  pentad_checklist: "pentad-checklist",
  pentad_duration: "pentad-duration",
};

const layerPaint = {
  "loc-heat": {
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
  },
  "pentad-checklist": {
    "fill-color": [
      "interpolate",
      ["linear"],
      ["get", "num_checklists"],
      0,
      "#fde725",
      10,
      "#addc30",
      20,
      "#5ec962",
      50,
      "#21918c",
      100,
      "#3b528b",
      200,
      "#443983",
      500,
      "#440154",
      1000,
      "#220150",
    ],
    "fill-opacity": 0.7,
    "fill-outline-color": "#000000",
  },
  "pentad-duration": {
    "fill-color": [
      "interpolate",
      ["linear"],
      ["get", "sum_duration"],
      0,
      "#fde725",
      1000,
      "#addc30",
      5000,
      "#5ec962",
      10000,
      "#21918c",
      20000,
      "#3b528b",
      50000,
      "#443983",
      100000,
      "#440154",
    ],
    "fill-opacity": 0.7,
    "fill-outline-color": "#000000",
  },
};

map.on("load", async () => {
  const ebird_loc = await fetch("./ebird_loc.geojson").then((res) => res.json());
  const ebird_pentad = await fetch("./ebird_pentad.geojson").then((res) => res.json());

  map.addSource("loc", { type: "geojson", data: ebird_loc });
  map.addSource("pentad", { type: "geojson", data: ebird_pentad });

  for (const [layerId, paintProps] of Object.entries(layerPaint)) {
    map.addLayer({
      id: layerId,
      type: layerId.includes("loc-heat") ? "heatmap" : "fill",
      source: layerId.includes("loc-heat") ? "loc" : "pentad",
      paint: paintProps,
    });
  }

  showLayer("heatmap");
});

function showLayer(layerType) {
  Object.keys(layers).forEach((layer) => {
    map.setLayoutProperty(layers[layer], "visibility", layer === layerType ? "visible" : "none");
  });
}

// Make updateLayer globally accessible by attaching it to the window object
window.updateLayer = function () {
  const selectedLayer = document.getElementById("layer-selector").value;
  showLayer(selectedLayer);
};

function formatDuration(minutes) {
  const months = Math.floor(minutes / (30 * 24 * 60));
  const days = Math.floor((minutes % (30 * 24 * 60)) / (24 * 60));
  const hours = Math.floor((minutes % (24 * 60)) / 60);
  const remainingMinutes = minutes % 60;
  return (
    [
      months && `${months} months`,
      days && `${days} days`,
      hours && `${hours} hrs`,
      remainingMinutes && `${remainingMinutes} min`,
    ]
      .filter(Boolean)
      .join(", ") || "0 minutes"
  );
}

// Add click event to show properties
function showPopup(e) {
  const properties = e.features[0].properties;
  new mapboxgl.Popup()
    .setLngLat(e.lngLat)
    .setHTML(
      `<strong>Pentad:</strong> ${properties.pentad}<br>` +
        `<strong>Number of Checklists:</strong> ${properties.num_checklists}<br>` +
        `<strong>Total Duration:</strong> ${formatDuration(properties.sum_duration)}<br>`
    )
    .addTo(map);
}

map.on("click", "pentad-checklist", showPopup);
map.on("click", "pentad-duration", showPopup);

map.on("moveend", () => {
  const { lng, lat } = map.getCenter();
  const zoom = Math.round(map.getZoom() * 10000) / 10000;
  window.history.replaceState(null, "", `?@${lat.toFixed(6)},${lng.toFixed(6)},${zoom}z`);
});

map.on("mousemove", "pentad-checklist", function (e) {
  map.getCanvas().style.cursor = "pointer";
});
map.on("mouseleave", "pentad-checklist", function () {
  map.getCanvas().style.cursor = "";
});
map.on("mousemove", "pentad-duration", function (e) {
  map.getCanvas().style.cursor = "pointer";
});
map.on("mouseleave", "pentad-duration", function () {
  map.getCanvas().style.cursor = "";
});
