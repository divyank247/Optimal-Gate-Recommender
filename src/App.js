import React, { useState, useEffect, useCallback } from "react";
import "./styles/App.css"; 

const App = () => {
  const [location, setLocation] = useState("");
  const [gates, setGates] = useState([]);
  const [reloadTime, setReloadTime] = useState(30);
  const [showSplash, setShowSplash] = useState(true);

  useEffect(() => {
    const timer = setTimeout(() => setShowSplash(false), 4500);
    return () => clearTimeout(timer);
  }, []);

  const fetchGates = useCallback(async (loc) => {
    if (!loc.trim()) {
      return;
    }
  
    try {
      const response = await fetch(
        `http://localhost:3001/api/all-gates-eta?user_location=${encodeURIComponent(loc)}&society_id=67d981612ca1e004ba65e726`
      );
  
      const data = await response.json();
  
      if (data.error || !Array.isArray(data.gates)) {
        alert(data.error || "Failed to fetch gates.");
        setGates([]);
      } else {
        const bestGate = data.gates.reduce((best, gate) => {
          const bestTime = parseInt(best.estimatedTime.split(" ")[0], 10);
          const currentTime = parseInt(gate.estimatedTime.split(" ")[0], 10);
          return currentTime < bestTime ? gate : best;
        }, data.gates[0]);
  
        setGates(
          data.gates.map((gate) => ({
            ...gate,
            isBest: gate.id === bestGate.id,
          }))
        );
      }
    } catch (error) {
      alert("Failed to fetch gates. Check console for details.");
    }
  }, []);
  
  

  useEffect(() => {
    const interval = setInterval(() => {
      setReloadTime((prev) => {
        if (prev === 1) {
          fetchGates(location);
          return 30;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [fetchGates, location]);

  useEffect(() => {
    document.getElementById("location-input")?.focus();
  }, []);

  if (showSplash) {
    return (
      <div className="splash-screen">
        <h1>Optimal Gate Recommendation</h1>
        <div className="splash-content">
          <img src="/Manyata_Tech_Park_Logo.png" alt="Manyata Logo" className="manyata-logo" />
          <br></br>
          <span>Powered by   </span>
          <img src="/Mindera_Logo.png" alt="Mindera Logo" className="mindera-logo" />
        </div>
      </div>
    );
  }

  return (
    <div className="app-container">
      <h1 className="title">Find Best Entry Gate</h1>
      <div className="input-container">
        <input
          id="location-input"
          type="text"
          value={location}
          onChange={(e) => setLocation(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              fetchGates(location);
            }
          }}
          placeholder="Enter your location"
          className="location-input"
        />
        <button
          onClick={() => {
            fetchGates(location);
          }}
          className="search-button"
        >
          Search
        </button>
      </div>
      <p className="reload-timer">🔄 Reloading in {reloadTime}s</p>

      <ul className="gate-list">
  {gates.length === 0 ? (
    <p className="no-gates">🔍 No gates found. Enter a valid location and search.</p>
  ) : (
    gates.map((gate, index) => (
      <li key={gate.id} className={`gate-item ${index === 0 ? "best-gate" : ""}`}>
        <div>
          <strong>{gate.name} {index === 0 ? "(BEST)" : ""}</strong> - {gate.estimatedTime}, {gate.distance}
        </div>
      </li>
    ))
  )}
</ul>
    </div>
  );
};

export default App;
