"use strict";
(function () {
  window.addEventListener("load", init);
  let routeLine = null; 

  function init() {
    id("country_btn_airline").addEventListener("click", requestCountryairline);
    id("country_btn_airport").addEventListener("click", requestCountryairport);
    id("airline_btn").addEventListener("click", requestAirline);
    id("airport_btn").addEventListener("click", requestAirport);
    id("route_btn").addEventListener("click", requestRouteComparison);
    initMap();

    document.querySelectorAll("input[type='text']").forEach(input => {
      input.addEventListener("blur", () => {
        input.value = input.value.trim().toUpperCase();
      });
    });
  }

  async function requestCountryairline() {
    const code = id("country_code_airline").value;
    if (!code) return;
    showLoader();

    try {
      const res = await fetch(`/airlines?country=${code}`);
      if (res.ok) {
        const data = await res.json();
        populateTable("airline_lists", data);
      } else {
        handleError(await res.text());
      }
    } catch (err) {
      handleError(err);
    } finally {
      hideLoader();
    }
  }

  async function requestCountryairport() {
    const code = id("country_code_airport").value;
    if (!code) return;
    showLoader();

    try {
      const res = await fetch(`/airports?country=${code}`);
      if (res.ok) {
        const data = await res.json();
        populateTable("airport_lists", data);
      } else {
        handleError(await res.text());
      }
    } catch (err) {
      handleError(err);
    } finally {
      hideLoader();
    }
  }

  async function requestAirline() {
    const code = id("airline_code").value;
    if (!code) return;
    showLoader();

    try {
      const resAirports = await fetch(`/airlines?iata=${code}`);
      const resRoutes = await fetch(`/routes?airline=${code}`);

      if (resAirports.ok) {
        const airports = await resAirports.json();
        populateTable("airline_airports", airports);
      }

      if (resRoutes.ok) {
        const routes = await resRoutes.json();
        populateTable("airline_routes", routes);
      }

      if (!resAirports.ok && !resRoutes.ok) {
        handleError(await resAirports.text());
      }
    } catch (err) {
      handleError(err);
    } finally {
      hideLoader();
    }
  }

  async function requestAirport() {
    const code = id("airport_code").value;
    if (!code) return;
    showLoader();

    try {
      const res = await fetch(`/airports?iata=${code}`);
      if (res.ok) {
        const data = await res.json();
        if (!data.length) return;

        const airport = data[0];
        id("airport_info").innerHTML = `
          <strong>${airport.name}</strong> (${airport.iata})<br/>
          ${airport.city}, ${airport.country}<br/>
          ICAO: ${airport.icao}<br/>
          Weather: High ${airport.high}°C / Low ${airport.low}°C<br/>
          Location: Lat ${airport.latitude}, Lng ${airport.longitude}<br/>
        `;
        addAirportMarker(airport, "Selected Airport");
        map.setView([airport.latitude, airport.longitude], 6);

        await requestRoutesFrom(code);
        await requestRoutesTo(code);
        await requestAirportAirlines(code);
      } else {
        handleError(await res.text());
      }
    } catch (err) {
      handleError(err);
    } finally {
      hideLoader();
    }
  }

  async function requestRouteComparison() {
    const from = id("route_from").value;
    const to = id("route_to").value;
    if (!from || !to) return;
    showLoader();
  
    try {
      const routeRes = await fetch(`/routes?departure=${from}&arrival=${to}`);
      const distanceRes = await fetch(`/routes/distance?from=${from}&to=${to}`);
  
      if (routeRes.ok && distanceRes.ok) {
        const routes = await routeRes.json();
        const distanceData = await distanceRes.json();
  
        populateTable("airlines_between", routes);
        id("route_distance").textContent = `Distance: ${distanceData.distance} km`;
  
        const fromCoord = distanceData.coords?.from;
        const toCoord = distanceData.coords?.to;
  
        if (fromCoord && toCoord) {
          if (routeLine) {
            map.removeLayer(routeLine); 
          }
  
          routeLine = L.polyline([
            [fromCoord.lat, fromCoord.lng],
            [toCoord.lat, toCoord.lng]
          ], {
            color: "#0077ff",
            weight: 4,
            opacity: 0.9,
            dashArray: "6, 8"
          }).addTo(map);
  
          map.fitBounds(routeLine.getBounds(), { padding: [30, 30] });
  
          L.marker([fromCoord.lat, fromCoord.lng])
            .addTo(map)
            .bindPopup(`<strong>From: ${from}</strong>`)
            .openPopup();
  
          L.marker([toCoord.lat, toCoord.lng])
            .addTo(map)
            .bindPopup(`<strong>To: ${to}</strong>`);
        }
      } else {
        const errText = !routeRes.ok
          ? await routeRes.text()
          : await distanceRes.text();
        handleError(errText);
      }
    } catch (err) {
      handleError(err);
    } finally {
      hideLoader();
    }
  }
  

  async function requestRoutesFrom(iata) {
    const res = await fetch(`/routes?departure=${iata}`);
    if (res.ok) {
      const data = await res.json();
      populateTable("routes_from", data);
    }
  }

  async function requestRoutesTo(iata) {
    const res = await fetch(`/routes?arrival=${iata}`);
    if (res.ok) {
      const data = await res.json();
      populateTable("routes_to", data);
    }
  }

  async function requestAirportAirlines(iata) {
    const res = await fetch(`/airport/airlines?iata=${iata}`);
    if (res.ok) {
      const data = await res.json();
      populateTable("airport_airlines", data);
    }
  }

  function populateTable(containerId, data) {
    const table = qs(`#${containerId} table`);
    table.innerHTML = "";
  
    if (!data || data.length === 0) {
      table.innerHTML = "<tr><td>No data available.</td></tr>";
      return;
    }
  
    const keys = Object.keys(data[0]);
  
    const thead = table.createTHead();
    const headRow = thead.insertRow();
    keys.forEach(key => {
      const th = document.createElement("th");
      th.textContent = key;
      headRow.appendChild(th);
    });
  
    const tbody = document.createElement("tbody");
    data.forEach(obj => {
      const row = tbody.insertRow();
      row.dataset.iata = obj["iata"] || "";
  
      keys.forEach(k => {
        const cell = row.insertCell();
        const val = (obj[k] || "-").toString().toUpperCase();
        
      
        if (val.length < 20) {
          cell.innerHTML = [...val].map((char, i) =>
            `<span class="flip-cell" style="animation-delay: ${i * 30}ms">${char}</span>`
          ).join("");
        } else {
          cell.textContent = val;
        }
      });
    });
    table.appendChild(tbody);
  }
  

  function showLoader() {
    id("global_loader").style.display = "block";
  }

  function hideLoader() {
    id("global_loader").style.display = "none";
  }

  function handleError(err) {
    console.error("Request failed:", err);
    alert("Error: " + err);
  }

  function id(idName) {
    return document.getElementById(idName);
  }

  function qs(selector) {
    return document.querySelector(selector);
  }

  let map;
  function initMap() {
    map = L.map("map").setView([20, 0], 2);
    L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
    maxZoom: 19,
    attribution: '&copy; <a href="http://www.openstreetmap.org/copyright">OpenStreetMap</a>'
}).addTo(map);
  }

  function addAirportMarker(airport, label = "") {
    if (!map) return;
  
    const marker = L.marker([airport.latitude, airport.longitude]).addTo(map);
    const popupContent = `
      <strong>${airport.name}</strong><br>
      ${airport.city}, ${airport.country}<br>
      ${label ? `<em>${label}</em><br>` : ""}
      Lat: ${airport.latitude}<br>
      Lng: ${airport.longitude}
    `;
    marker.bindPopup(popupContent).openPopup();
  }
  

})();
