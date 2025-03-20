const express = require('express');
const mongoose = require('mongoose');
const router = express.Router();
const axios = require('axios');
const geocodeAddress = require("../utils/geocodeAddress");
const Gate = require('../models/Gate');
const Society = require('../models/Society');
const { findOptimalGate } = require('../services/routeService');
const { parseCoordinates, validateCoordinates } = require('../utils/calculateTime');
const {getTrafficInfo} = require('../services/trafficService')

router.get("/all-gates-eta", async (req, res) => {
  try {
    const { user_location, society_id } = req.query;

    if (!user_location || !society_id) {
      return res.status(400).json({ error: "Missing user location or society ID" });
    }

    const gates = await Gate.find({ societyId: society_id, isActive: true });

    if (!gates.length) {
      return res.status(404).json({ error: "No active gates found for this society" });
    }

    const formatTime = (seconds) => {
      if (!seconds || seconds === "N/A") return "Unavailable";
      const minutes = Math.floor(seconds / 60);
      const remainingSeconds = seconds % 60;
      return `${minutes} min ${remainingSeconds} sec`;
    };

    const formatDistance = (meters) => {
      if (!meters || meters === "N/A") return "Unavailable";
      return `${(meters / 1000).toFixed(1)} km`;
    };

    const gatesWithETA = (
      await Promise.all(
        gates.map(async (gate) => {
          try {
            const gateLocation = `${gate.location.coordinates[1]},${gate.location.coordinates[0]}`;
            const trafficData = await getTrafficInfo(user_location, gateLocation);

            if (!trafficData || !trafficData.duration || !trafficData.distance) {
              console.warn(`⚠️ Skipping ${gate.name}: Invalid traffic data`);
              return null;
            }

            return {
              id: gate._id,
              name: gate.name,
              location: gate.location,
              estimatedTime: formatTime(trafficData.duration),
              distance: formatDistance(trafficData.distance),
            };
          } catch (error) {
            return null;
          }
        })
      )
    ).filter(Boolean);

    if (!gatesWithETA.length) {
      return res.status(500).json({ error: "Failed to retrieve ETA for all gates." });
    }

    gatesWithETA.sort((a, b) => a.estimatedTime.localeCompare(b.estimatedTime, undefined, { numeric: true }));

    res.json({ gates: gatesWithETA });
  } catch (error) {
    res.status(500).json({ error: "Internal server error" });
  }
});


router.get('/optimal-gate', async (req, res) => {
  try {
    let { user_location, society_id } = req.query;

    if (!user_location || !society_id) {
      return res.status(400).json({ error: 'Missing required parameters: user_location and society_id' });
    }

    let userCoords;

    if (/^-?\d+(\.\d+)?,-?\d+(\.\d+)?$/.test(user_location.trim())) {
      userCoords = parseCoordinates(user_location.trim());
    } else {
      userCoords = await geocodeAddress(user_location);
      if (!userCoords) {
        return res.status(400).json({ error: "Invalid location provided. Could not fetch coordinates." });
      }
    }

    validateCoordinates(userCoords.lat, userCoords.lng);

    if (!mongoose.Types.ObjectId.isValid(society_id)) {
      return res.status(400).json({ error: 'Invalid society_id format' });
    }

    const society = await Society.findById(society_id);
    if (!society) {
      return res.status(404).json({ error: 'Society not found' });
    }

    const userLocationStr = `${userCoords.lat},${userCoords.lng}`;

    const result = await findOptimalGate(userLocationStr, society_id);

    res.json(result);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Create a new gate
router.post('/gates', async (req, res) => {
  try {
    const { name, lat, lng, societyId } = req.body;
    
    if (!name || !lat || !lng || !societyId) {
      return res.status(400).json({ error: 'Missing required fields' });
    }
    
    validateCoordinates(parseFloat(lat), parseFloat(lng));
    
    const society = await Society.findById(societyId);
    if (!society) {
      return res.status(404).json({ error: 'Society not found' });
    }
    
    const newGate = new Gate({
      name,
      location: {
        type: 'Point',
        coordinates: [parseFloat(lng), parseFloat(lat)] 
      },
      societyId
    });
    
    await newGate.save();
    res.status(201).json(newGate);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Create a new society
router.post('/societies', async (req, res) => {
  try {
    const { name, area, boundary } = req.body;
    
    if (!name || !area || !boundary) {
      return res.status(400).json({ error: 'Missing required fields' });
    }
    
    const newSociety = new Society({
      name,
      area,
      boundary: {
        type: 'Polygon',
        coordinates: boundary
      }
    });
    
    await newSociety.save();
    res.status(201).json(newSociety);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Update a gate(partial update)
router.patch('/gates/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { name, lat, lng, isActive } = req.body;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ error: 'Invalid gate ID format' });
    }

    const gate = await Gate.findById(id);
    if (!gate) {
      return res.status(404).json({ error: 'Gate not found' });
    }

    if (name) gate.name = name;

    if (lat !== undefined && lng !== undefined) {
      const parsedLat = parseFloat(lat);
      const parsedLng = parseFloat(lng);
      await validateCoordinates(parsedLat, parsedLng);
      gate.location.coordinates = [parsedLng, parsedLat];
    }

    if (typeof isActive === 'boolean') {
      gate.isActive = isActive;
    }

    await gate.save();
    res.json(gate);
  } catch (error) {
    console.error('API error:', error.message);
    res.status(500).json({ error: error.message });
  }
});

// Get all gates for a society
router.get('/societies/:societyId/gates', async (req, res) => {
  try {
    const { societyId } = req.params;

    const society = await Society.findById(societyId);
    if (!society) {
      return res.status(404).json({ error: 'Society not found' });
    }
    
    const gates = await Gate.find({ societyId });
    res.json(gates);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});


// Update a gate
router.put('/gates/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { name, lat, lng, isActive } = req.body;
    
    const gate = await Gate.findById(id);
    if (!gate) {
      return res.status(404).json({ error: 'Gate not found' });
    }
    
    if (name) gate.name = name;
    
    if (lat && lng) {
      validateCoordinates(parseFloat(lat), parseFloat(lng));
      gate.location.coordinates = [parseFloat(lng), parseFloat(lat)];
    }
    
    if (isActive !== undefined) {
      gate.isActive = isActive;
    }
    
    await gate.save();
    res.json(gate);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Delete a gate
router.delete('/gates/:id', async (req, res) => {
  try {
    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ error: 'Invalid gate ID format' });
    }

    const gate = await Gate.findByIdAndDelete(id);
    if (!gate) {
      return res.status(404).json({ error: 'Gate not found' });
    }

    res.json({ message: 'Gate deleted successfully' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
