const axios = require("axios");
require("dotenv").config();

const geocodeAddress = async (address) => {
  try {
    const response = await axios.get("https://maps.googleapis.com/maps/api/geocode/json", {
      params: { address, key: process.env.GOOGLE_MAPS_API_KEY },
    });

    if (response.data.status !== "OK") {
      throw new Error(`Geocoding failed: ${response.data.status}`);
    }

    const location = response.data.results[0].geometry.location;
    return { lat: location.lat, lng: location.lng };
  } catch (error) {
    return null;
  }
};

module.exports = geocodeAddress;
