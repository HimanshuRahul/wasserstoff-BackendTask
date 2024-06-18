const express = require("express");
const httpProxy = require("http-proxy");
const axios = require("axios");

const app = express();
const proxy = httpProxy.createProxyServer({});
const PORT = 5003;
const FIRST_SERVER_PORT = 4001;
const SECOND_SERVER_PORT = 4002;

const servers = [
  {
    host: `http://localhost:${FIRST_SERVER_PORT}`,
    weight: 1,
    isHealthy: true,
    currentWeight: 0,
  },
  {
    host: `http://localhost:${SECOND_SERVER_PORT}`,
    weight: 1,
    isHealthy: true,
    currentWeight: 0,
  },
];

async function checkServerHealth(server) {
  try {
    const response = await axios.get(server.host + "/");
    server.isHealthy = response.status === 200;
  } catch (error) {
    server.isHealthy = false;
  }
  console.log(
    `Server ${server.host} health check: ${
      server.isHealthy ? "Healthy" : "Unhealthy"
    }`
  );
}

async function performHealthChecks() {
  await Promise.all(servers.map(checkServerHealth));
}

setInterval(performHealthChecks, 10000); // Perform health checks every 10 seconds

function getNextServer() {
  let totalWeight = 0;
  let bestServer = null;

  servers.forEach((server) => {
    if (server.isHealthy) {
      server.currentWeight += server.weight;
      totalWeight += server.weight;

      if (!bestServer || server.currentWeight > bestServer.currentWeight) {
        bestServer = server;
      }
    }
  });

  if (bestServer) {
    bestServer.currentWeight -= totalWeight;
    console.log(
      `Selected server: ${bestServer.host} with current weight: ${bestServer.currentWeight}`
    );
  }

  return bestServer;
}

app.use((req, res) => {
  const targetServer = getNextServer();

  if (!targetServer) {
    res
      .status(502)
      .send("No healthy backends available to handle the request.");
    return;
  }

  console.log(`Proxying request to: ${targetServer.host}`);
  proxy.web(req, res, { target: targetServer.host }, (err) => {
    if (err) {
      console.error(`Error proxying request: ${err}`);
      res.status(500).send("Error proxying request");
    }
  });

  proxy.once("proxyRes", (proxyRes) => {
    let body = "";
    proxyRes.on("data", (chunk) => {
      body += chunk;
    });
    proxyRes.on("end", () => {
      console.log(`Response from target server: ${body}`);
    });
  });
});

proxy.on("error", (err, req, res) => {
  console.error("Proxy error:", err);
  res.status(500).send("Proxy error occurred.");
});

app.listen(PORT, () => {
  console.log(`Weight-based round robin load balancer started on port ${PORT}`);
});
