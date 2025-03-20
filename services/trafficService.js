const axios = require("axios");
require("dotenv").config();

const apiKey = process.env.GOOGLE_MAPS_API_KEY;

if (!apiKey) {
  process.exit(1);
}

const getTrafficInfo = async (origin, destination) => {
  try {

    const [originLat, originLng] = origin.split(",").map(Number);
    const [destLat, destLng] = destination.split(",").map(Number);

    if (isNaN(originLat) || isNaN(originLng) || isNaN(destLat) || isNaN(destLng)) {
      throw new Error("Invalid latitude or longitude format");
    }

    const requestBody = {
      origin: { location: { latLng: { latitude: originLat, longitude: originLng } } },
      destination: { location: { latLng: { latitude: destLat, longitude: destLng } } },
      travelMode: "DRIVE",
      routingPreference: "TRAFFIC_AWARE",
      departureTime: new Date(Date.now() + 2 * 60 * 1000).toISOString(),
      computeAlternativeRoutes: false,
    };

    const response = await axios.post(
      "https://routes.googleapis.com/directions/v2:computeRoutes",
      requestBody,
      {
        headers: {
          "Content-Type": "application/json",
          "X-Goog-Api-Key": apiKey,
          "X-Goog-FieldMask": "routes.duration,routes.distanceMeters",
        },
      }
    );

    if (!response.data || !response.data.routes || response.data.routes.length === 0) {
      throw new Error("No route found.");
    }
    const route = response.data.routes[0];

    if (!route.duration) {
      throw new Error("⚠️ Missing duration in API response.");
    }

    let durationSeconds = 0;

    if (route.duration.includes("PT")) {
      const durationMatch = route.duration.match(/PT(\d+H)?(\d+M)?(\d+S)?/);
      durationSeconds = durationMatch
        .slice(1)
        .map((t) => (t ? parseInt(t) : 0))
        .reduce((acc, time, idx) => acc + time * [3600, 60, 1][idx], 0);
    } else if (route.duration.endsWith("s")) {
      durationSeconds = parseInt(route.duration.replace("s", ""));
    } else {
      throw new Error(`⚠️ Unexpected duration format: ${route.duration}`);
    }

    return {
      distance: route.distanceMeters,
      duration: durationSeconds
    };
  } catch (error) {
    return null; 
  }
};

module.exports = { getTrafficInfo };
