"use strict";

const { Client } = require('pg');
const express = require('express');
const app = express();
app.use(express.json());
const axios = require("axios");
app.use(express.static("public"));
const PORT = 8001;
app.listen(PORT);

const clientConfig = { 
    user: 'postgres',
    password: 'mypacepostgresql', 
    host: 'my-pace-postgresql.cf84o0uo2fzm.us-east-2.rds.amazonaws.com', 
    port: 5432, 
    ssl: { 
      rejectUnauthorized: false, 
  } 
}; 

app.get('/airlines', async function (req, res) {
  const country = req.query['country']; 
  const icao = req.query['icao']; 
  const iata = req.query['iata'];
  const client = new Client(clientConfig);

  let query = "SELECT a.* FROM airlines a JOIN countries c ON a.country = c.name WHERE 1=1";
  let data = [];

  if (country) {query += ` AND c.code = $${data.length+1}::text`;data.push(country); }
  if (icao) {query += ` AND a.icao = $${data.length+1}::text`;data.push(icao)}
  if (iata) {query += ` AND a.iata = $${data.length+1}::text`;data.push(iata);}

  query += " GROUP BY a.iata, a.name, a.icao, a.callsign, a.country ORDER BY a.name";
  await client.connect();
  const result = await client.query(query, data);

  if (result.rowCount === 0) {
    return res.status(404).send( "No airlines found.");
  }
  else{
    res.set("Content-Type", "application/json");
    res.send(result.rows);
  }
  await client.end();
});

app.post('/airlines', async function (req, res) {
  const name = req.body['name'];
  const country = req.body['country']; 
  const icao = req.body['icao']; 
  const iata = req.body['iata'];
  if (!name || !country) return res.status(404).send("Name and country are required." );

  const client = new Client(clientConfig);
  try {
      await client.connect();
      await client.query("INSERT INTO airlines (name, country, icao, iata) Values ($1::text, $2::text, $3::text, $4::text)", [name, country, icao, iata]);
      res.status(200).send("Airline added.");
  } catch (error) {
      console.error(error);
      res.status(500).send("Failed to add airline." );
  } finally {
      await client.end();
  }
});

app.delete('/airlines', async function (req, res) {
  const icao = req.body['icao']; 
  const iata = req.body['iata'];
  if (!icao && !iata) return res.status(400).send("ICAO or IATA code is required to delete an airline.");

  const client = new Client(clientConfig);
  await client.connect();
  let query = "DELETE FROM airlines WHERE";
  let data = [];

  if (icao) {data.push(icao); query += ` icao = $${data.length}::text`;}
  if (iata) {if (data.length > 0) query += " OR"; data.push(iata);query += ` iata = $${data.length}::text`;}

  const result = await client.query(query, data);
  if (result.rowCount === 0) return res.status(404).send("Airline not found." );
  res.set("Content-Type", "application/json");res.send("Airline deleted.");
  await client.end();
});

async function getWeatherData(latitude, longitude) {
  try {
      const weatherAPI = `https://api.open-meteo.com/v1/forecast?latitude=${latitude}&longitude=${longitude}&daily=temperature_2m_max,temperature_2m_min&timezone=auto&forecast_days=1`;
      
      const response = await axios.get(weatherAPI);
      const weather = response.data.daily;

      return {
          high: weather.temperature_2m_max[0],
          low: weather.temperature_2m_min[0]
      };
  } catch (error) {
      console.error("Error fetching weather data:", error.message);
      return { high: null, low: null }; 
  }
}

app.get('/airports', async function (req, res) {
  const country = req.query['country']; 
  const icao = req.query['icao']; 
  const iata = req.query['iata'];
  const client = new Client(clientConfig);
  
  let query = "SELECT a.* FROM airports a JOIN countries c ON a.country = c.name WHERE 1=1";
  let data = [];

  if (country) { query += ` AND c.code = $${data.length+1}::text`; data.push(country); }
  if (icao) { query += ` AND a.icao = $${data.length+1}::text`; data.push(icao); }
  if (iata) { query += ` AND a.iata = $${data.length+1}::text`; data.push(iata); }
  
  query += " GROUP BY a.iata, a.name, a.icao, a.city, a.country, a.latitude, a.longitude ORDER BY a.name";
  await client.connect();
  const result = await client.query(query, data);
  if (result.rowCount === 0) {
    return res.status(404).send("No airports found.");
  }
  else{
    let Airports = [];
    if (iata){
    for (let airport of result.rows) {
        const weather = await getWeatherData(airport.latitude, airport.longitude);
        Airports.push({
            name: airport.name,
            city: airport.city,
            country: airport.country,
            iata: airport.iata,
            icao: airport.icao,
            latitude: airport.latitude,
            longitude: airport.longitude,
            high: weather.high,
            low: weather.low
        });
    }
    res.set("Content-Type", "application/json");
    res.send(Airports);
  }
  else{res.set("Content-Type", "application/json");
      res.send(result.rows);}
}
  await client.end();
});

app.get('/airport/airlines', async function (req, res) {
    const iata = req.query.iata;
    if (!iata) return res.status(400).send("Missing 'iata' query parameter.");
  
    const client = new Client(clientConfig);
    await client.connect();
  
    const result = await client.query(`
      SELECT DISTINCT r.airline 
      FROM routes r 
      WHERE r.departure = $1::text OR r.arrival = $1::text
    `, [iata]);
  
    if (result.rowCount === 0) {
      return res.status(404).send("No airlines found.");
    }
  
    res.set("Content-Type", "application/json");
    res.send(result.rows);
    await client.end();
  });  

app.post('/airports', async function (req, res) {
  const name = req.body['name'];
  const country = req.body['country']; 
  const icao = req.body['icao']; 
  const iata = req.body['iata'];
  if (!name || !country) return res.status(400).send("Name and country are required.");

  const client = new Client(clientConfig);
  try {
      await client.connect();
      await client.query("INSERT INTO airports (name, country, icao, iata) Values ($1::text, $2::text, $3::text, $4::text)", [name, country, icao, iata]);
      res.status(201).send("Airport added.");
  } catch (error) {
      console.error(error);
      res.status(500).send("Failed to add airport.");
  } finally {
      await client.end();
  }
});

app.delete('/airports', async function (req, res) {
  const icao = req.body['icao']; 
  const iata = req.body['iata'];
  if (!icao && !iata) return res.status(400).send("ICAO or IATA code is required to delete an airport.");

  const client = new Client(clientConfig);
  await client.connect();
  let query = "DELETE FROM airports WHERE ";
  let data = [];

  if (icao) { query += ` icao = $${data.length+1}::text`;data.push(icao);}
  if (iata) {if (data.length > 0) query += " OR";query += ` iata = $${data.length+1}::text`;data.push(iata)}
  
  const result = await client.query(query, data);
  if (result.rowCount === 0) return res.status(404).send("Airport not found.");
  res.set("Content-Type", "application/json");res.send("Airport deleted.");
  await client.end();
});

function haversineDistance(lat1, lon1, lat2, lon2) {
  const R = 6378; 
  const toRadians = deg => (deg * Math.PI) / 180;

  const dLat = toRadians(lat2 - lat1);
  const dLon = toRadians(lon2 - lon1);
  
  const a = Math.sin(dLat / 2) ** 2 + Math.cos(toRadians(lat1)) * Math.cos(toRadians(lat2)) * Math.sin(dLon / 2) ** 2;
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

  return R * c;
}

app.get('/routes/distance', async function (req, res) {
  const from = req.query['from']; 
  const to = req.query['to'];

  if (!from || !to) {
    return res.status(400).send("Both 'from' and 'to' airport codes are required.");
  }

  const client = new Client(clientConfig);
  await client.connect();

  try {
    const result = await client.query(
      "SELECT iata, latitude, longitude FROM airports WHERE iata = $1 OR iata = $2",
      [from, to]
    );

    if (result.rowCount < 2) {
      return res.status(404).send("Invalid airport codes.");
    }

    const coords = {};
    result.rows.forEach(row => {
      if (row.iata === from) coords.from = { lat: row.latitude, lng: row.longitude };
      if (row.iata === to) coords.to = { lat: row.latitude, lng: row.longitude };
    });

    const distance = haversineDistance(
      coords.from.lat, coords.from.lng,
      coords.to.lat, coords.to.lng
    );

    res.set("Content-Type", "application/json");
    res.send({ from, to, distance, coords });

  } catch (error) {
    console.error("Error in /routes/distance:", error.message);
    res.status(500).send("Internal Server Error.");
  } finally {
    await client.end();
  }
});


app.post('/routes', async function (req, res) {
  const airline = req.body['airline'];
  const departure = req.body['departure']; 
  const arrival = req.body['arrival']; 
  let planes = req.body['planes'];

  if (!airline || !departure || !arrival || !planes) {
    return res.status(400).send("All fields (airline, departure, arrival, planes) are required.");
  }

  planes = Array.isArray(planes) ? planes : [planes];

  const client = new Client(clientConfig);
  await client.connect();

  const airlineResult = await client.query("SELECT 1 FROM airlines WHERE iata = $1::text", [airline]);
  if (airlineResult.rowCount === 0) {
    return res.status(404).send("Invalid airline code.");
  }

  const depResult = await client.query("SELECT 1 FROM airports WHERE iata = $1::text", [departure]);
  if (depResult.rowCount === 0) {
    return res.status(404).send("Invalid departure airport code.");
  }

  const arrResult = await client.query("SELECT 1 FROM airports WHERE iata = $1::text", [arrival]);
  if (arrResult.rowCount === 0) {
    return res.status(404).send("Invalid arrival airport code.");
  }

  for (let plane of planes) {
    const planeResult = await client.query("SELECT 1 FROM planes WHERE code = $1::text", [plane]);
    if (planeResult.rowCount === 0) {
      return res.status(404).send("Invalid plane type code: " + plane);
    }
  }

  await client.query("INSERT INTO routes (airline, departure, arrival, planes) VALUES ($1::text, $2::text, $3::text, $4::text)", [airline, departure, arrival, planes.join(" ")]);

  res.status(201).send("Route added.");
  await client.end();
});

app.get("/routes", async function (req, res) {
  const { airline, departure, arrival, plane } = req.query;
  const client = new Client(clientConfig);
  let query = `
    SELECT r.airline, r.departure, r.arrival, r.planes
    FROM routes r
    WHERE 1=1`;
  let params = [];

  if (airline) {
    query += ` AND r.airline = $${params.length + 1}::text`;
    params.push(airline);
  }
  if (departure) {
    query += ` AND r.departure = $${params.length + 1}::text`;
    params.push(departure);
  }
  if (arrival) {
    query += ` AND r.arrival = $${params.length + 1}::text`;
    params.push(arrival);
  }
  if (plane) {
    query += ` AND r.planes LIKE '%' || $${params.length + 1}::text || '%'`;
    params.push(plane);
  }

  await client.connect();
  const result = await client.query(query, params);

  if (result.rowCount === 0) {
    return res.status(404).send("No matching routes found.");
  }

  res.set("Content-Type", "application/json");
  res.send(result.rows);
  await client.end();
});

app.delete('/routes', async function (req, res) {
  const airline = req.body['airline'];
  const departure = req.body['departure'];
  const arrival = req.body['arrival'];

  if (!airline || !departure || !arrival) {
    return res.status(400).send("All fields (airline, departure, arrival) are required.");
  }

  const client = new Client(clientConfig);
  await client.connect();
  const result = await client.query("DELETE FROM routes WHERE airline = $1::text AND departure = $2::text AND arrival = $3::text", [airline, departure, arrival]);

  if (result.rowCount === 0) {
    return res.status(404).send("Route not found.");
  }

  res.set("Content-Type", "application/json");res.send("Route deleted.");
  await client.end();
});

app.put('/routes', async function (req, res) {
  const airline = req.body['airline'];
  const departure = req.body['departure'];
  const arrival = req.body['arrival'];
  let planes = req.body['planes'];

  if (!airline || !departure || !arrival || !planes) {
    return res.status(400).send("All fields (airline, departure, arrival, planes) are required.");
  }

  planes = Array.isArray(planes) ? planes : [planes];

  const client = new Client(clientConfig);
  await client.connect();

  const routeResult = await client.query("SELECT planes FROM routes WHERE airline = $1::text AND departure = $2::text AND arrival = $3::text", [airline, departure, arrival]);

  if (routeResult.rowCount === 0) {
    return res.status(404).send("Route does not exist.");
  }

  let existingPlanes = routeResult.rows[0].planes.split(" ");
  
  for (let newType of planes) {
    if (!existingPlanes.includes(newType)) {
      existingPlanes.push(newType);
    }
  }

  await client.query("UPDATE routes SET planes = $1::text WHERE airline = $2::text AND departure = $3::text AND arrival = $4::text", [existingPlanes.join(" "), airline, departure, arrival]);

  res.set("Content-Type", "application/json");
  res.send("Route updated with new plane types.");
  await client.end();
});