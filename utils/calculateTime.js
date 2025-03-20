const parseCoordinates = (coordinateString) => {
  if (!coordinateString || typeof coordinateString !== "string") {
    throw new Error("Invalid coordinate string");
  }

  const [lat, lng] = coordinateString.split(",").map(coord => parseFloat(coord.trim()));

  if (isNaN(lat) || isNaN(lng)) {
    throw new Error('Invalid coordinates format. Use "latitude,longitude"');
  }

  validateCoordinates(lat, lng);

  return { lat, lng };
};

const formatCoordinates = (coordinates) => {
  if (!coordinates || typeof coordinates !== "object") {
    throw new Error("Invalid coordinates input");
  }

  const { lat, lng } = coordinates;

  if (lat == null || lng == null || isNaN(lat) || isNaN(lng)) {
    throw new Error("Invalid coordinates object");
  }

  return `${lat},${lng}`;
};

const validateCoordinates = (lat, lng) => {
  if (lat == null || lng == null || isNaN(lat) || isNaN(lng)) {
    throw new Error("Invalid latitude or longitude values");
  }

  if (lat < -90 || lat > 90) {
    throw new Error("Latitude must be between -90 and 90");
  }

  if (lng < -180 || lng > 180) {
    throw new Error("Longitude must be between -180 and 180");
  }

  return true;
};

const formatTime = (seconds) => {
  const minutes = Math.floor(seconds / 60);
  const remainingSeconds = seconds % 60;
  return `${minutes} min ${remainingSeconds} sec`;
};


module.exports = {
  parseCoordinates,
  formatCoordinates,
  validateCoordinates,
  formatTime
};
