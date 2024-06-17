const express = require("express");
const httpProxy = require("http-proxy");
const axios = require("axios");

const app = express();

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

const PORT = 5000;
const FIRST_SERVER_PORT = 4001;
const SECOND_SERVER_PORT = 4002;

const allServers = [
  { host: `http://localhost:${FIRST_SERVER_PORT}`, isHealthy: true },
  { host: `http://localhost:${SECOND_SERVER_PORT}`, isHealthy: true },
];

let currentServerIndex = 0;

const proxy = httpProxy.createProxyServer({});

async function checkServerHealth(server) {
  try {
    const response = await axios.get(server.host + "/");
    server.isHealthy = response.status === 200;
  } catch (error) {
    server.isHealthy = false;
  }

  if (server.isHealthy) {
    console.log(`Server ${server.host} is healthy`);
  } else {
    console.log(`Server ${server.host} is unhealthy`);
  }
}

async function performHealthChecks() {
  await Promise.all(allServers.map(checkServerHealth));
}

setInterval(() => {
  performHealthChecks()
    .then(() => {
      console.log("Health check performed");
    })
    .catch((err) => {
      console.error("Health check failed", err);
    });
}, 10000);

function getNextServer() {
  if (healthyServers.length === 0) return null;

  const server = healthyServers[currentServer % healthyServers.length];
  currentServer = (currentServer + 1) % healthyServers.length;
  return server;
}

function getNextServer() {
  const healthyServers = allServers.filter((server) => server.isHealthy);
  if (healthyServers.length === 0) return null;

  const server = healthyServers[currentServerIndex % healthyServers.length];
  currentServerIndex = (currentServerIndex + 1) % healthyServers.length;
  return server.host;
}

app.use(async (req, res) => {
  const target = await getNextServer();

  if (target) {
    proxy.web(req, res, { target });
  } else {
    res
      .status(502)
      .send("No healthy backends available to handle the request.");
  }
});

app.listen(PORT, () => {
  console.log(`Load balancer started on port ${PORT}`);
});
