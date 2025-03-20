const { getTrafficInfo } = require('./trafficService');
const Gate = require('../models/Gate');
const mongoose = require('mongoose');

const findOptimalGate = async (userLocation, societyId) => {
  try {
    const gates = await Gate.find({ societyId: new mongoose.Types.ObjectId(societyId), isActive: true });

    if (!gates || gates.length === 0) {
      throw new Error('No active gates found for this society');
    }

    const gatePromises = gates.map(async (gate) => {
      if (!gate.location || !gate.location.coordinates || gate.location.coordinates.length !== 2) {
        return null;
      }

      const gateLat = gate.location.coordinates[1];
      const gateLng = gate.location.coordinates[0];
      const gateLocation = `${gateLat},${gateLng}`;

      const userToGateInfo = await getTrafficInfo(userLocation, gateLocation);

      if (!userToGateInfo || typeof userToGateInfo.duration !== 'number') {
        return null;
      }

      return {
        gate: {
          id: gate._id,
          name: gate.name,
          location: { lat: gateLat, lng: gateLng }
        },
        estimatedTime: userToGateInfo.duration,
      };
    });

    const gateResults = (await Promise.all(gatePromises)).filter(Boolean);

    if (gateResults.length === 0) {
      throw new Error('No valid routes found to any gates.');
    }

    gateResults.sort((a, b) => a.estimatedTime - b.estimatedTime);

    const recommendedGate = gateResults[0];
    const otherGates = gateResults.slice(1);
    const avgTimeOtherGates = otherGates.length > 0
      ? otherGates.reduce((sum, g) => sum + g.estimatedTime, 0) / otherGates.length
      : recommendedGate.estimatedTime;

    const timeSaved = Math.max(0, Math.round(avgTimeOtherGates - recommendedGate.estimatedTime));

    return {
      recommendedGate: recommendedGate.gate,
      estimatedTime: formatTime(recommendedGate.estimatedTime),
      timeSaved: formatTime(timeSaved),
    };
  } catch (error) {
    throw error;
  }
};

const formatTime = (seconds) => {
  const minutes = Math.floor(seconds / 60);
  const remainingSeconds = seconds % 60;
  return `${minutes} min ${remainingSeconds} sec`;
};


module.exports = { findOptimalGate };
