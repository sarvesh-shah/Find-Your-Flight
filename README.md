# Find-Your-Flight

Find Your Flight - CS612 Assignment 3

📋 Project Overview

Find Your Flight is a full-stack web application that allows users to search airlines, airports, routes, current weather, and visually map airport locations and flight paths.
This project is built using Node.js, Express.js, PostgreSQL, Vanilla JavaScript, HTML5, CSS3, and Leaflet.js.

It satisfies all the mandatory and extra credit requirements outlined for Assignment #3.

⚙️ How to Run the Project
Pre-requisites:

Node.js installed

PostgreSQL database with five tables (airlines, airports, countries, routes, planes) from Assignment #1 created and operational.

Steps:

Download and unzip the project folder.

Open a terminal and navigate to the project folder.

Install required dependencies:

```bash

npm install

```
Start the server:

```bash

npm start

```
Open your browser and visit:

```arduino

http://localhost:8001

```

✅ Now you can start exploring airline, airport, and flight data interactively!

🧠 Main Features Implemented

1. ✈️ Country Lookup by Airline

Input a country code (like US, IN).

Click Search to view all airlines in that country.

Airlines data includes Name, IATA, ICAO, Callsign, Country.

2. 🛫 Country Lookup by Airport

Input a country code.

Click Search to view all airports from that country.

Airports data includes Name, City, IATA, ICAO, Country, Latitude, Longitude.

3. 🏢 Airline Info

Enter an airline IATA code (e.g., UA).

Displays the airline's information and all routes they serve.

4. 🛬 Airport Info

Enter an airport IATA code (e.g., JFK).

Displays the airport’s details, including current weather.

📍 The airport is pinned on the map automatically.

5. 🔀 Airport Comparison

Input two airport IATA codes.

Displays:

Airlines operating between them

Distance between the airports

Flight path plotted on the map visually.

🌟 Additional Features

Loader animation while data is fetched.

Flip-style text animation on table data (mimicking real airport boards).

Weather API integration to show daily high/low temperature at airports.

Leaflet.js map integration with:

Custom flight icon markers ✈️.

Visual route lines connecting airports.

Interactive tables and animated map updates.

📦 Technologies Used

Backend: Node.js, Express.js, PostgreSQL

Frontend: HTML5, CSS3, Vanilla JavaScript

APIs: Open-Meteo Weather API

Maps: Leaflet.js (OpenStreetMap tiles)

✍️ Author
Project for: CS612 – Concepts and Structures in Internet Computing – Spring 2025

Student: Sarvesh Shah

Instructor: Doosan Baik

