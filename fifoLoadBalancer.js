// const express = require("express");
// const httpProxy = require("http-proxy");
// const axios = require("axios");

// const app = express();

// app.use(express.json());
// app.use(express.urlencoded({ extended: true }));

// const PORT = 5001;

// const FIRST_SERVER_PORT = 4001;
// const SECOND_SERVER_PORT = 4002;

// const allServers = [
//   { host: `http://localhost:${FIRST_SERVER_PORT}`, isHealthy: true },
//   { host: `http://localhost:${SECOND_SERVER_PORT}`, isHealthy: true },
// ];

// const requestQueue = [];
// const proxy = httpProxy.createProxyServer({});

// async function checkServerHealth(server) {
//   try {
//     const response = await axios.get(server.host + "/");
//     server.isHealthy = response.status === 200;
//   } catch (error) {
//     server.isHealthy = false;
//   }

//   if (server.isHealthy) {
//     console.log(`Server ${server.host} is healthy`);
//   } else {
//     console.log(`Server ${server.host} is unhealthy`);
//   }
// }

// async function performHealthChecks() {
//   await Promise.all(allServers.map(checkServerHealth));
// }

// setInterval(() => {
//   performHealthChecks()
//     .then(() => {
//       console.log("Health check performed");
//     })
//     .catch((err) => {
//       console.error("Health check failed", err);
//     });
// }, 10000);

// async function processQueue() {
//   if (requestQueue.length > 0) {
//     const reqRes = requestQueue.shift();
//     const req = reqRes.req;
//     const res = reqRes.res;

//     const healthyServers = allServers.filter((server) => server.isHealthy);
//     if (healthyServers.length === 0) {
//       res
//         .status(502)
//         .send("No healthy backends available to handle the request.");
//       return;
//     }

//     const target = healthyServers[0].host;
//     console.log(`Proxying request to: ${target}`);

//     proxy.web(req, res, { target }, (err) => {
//       if (err) {
//         console.error(`Error proxying request: ${err}`);
//         res.status(500).send("Error proxying request");
//       }
//     });

//     proxy.once("proxyRes", (proxyRes) => {
//       let body = "";
//       proxyRes.on("data", (chunk) => {
//         body += chunk;
//       });
//       proxyRes.on("end", () => {
//         console.log(`Response from target server: ${body}`);
//       });
//     });
//   }
// }

// app.use((req, res) => {
//   requestQueue.push({ req, res });
//   processQueue();
// });

// proxy.on("error", (err, req, res) => {
//   console.error("Proxy error:", err);
//   res.status(500).send("Proxy error occurred.");
// });

// app.listen(PORT, () => {
//   console.log(`FIFO load balancer started on port ${PORT}`);
// });

// trying to make fifo work
const express = require("express");
const httpProxy = require("http-proxy");
const axios = require("axios");

const app = express();

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

const PORT = 5001;

const FIRST_SERVER_PORT = 4001;
const SECOND_SERVER_PORT = 4002;

const allServers = [
  { host: `http://localhost:${FIRST_SERVER_PORT}`, isHealthy: true },
  { host: `http://localhost:${SECOND_SERVER_PORT}`, isHealthy: true },
];

const requestQueue = [];
const proxy = httpProxy.createProxyServer({});

let currentServerIndex = 0;

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

async function processQueue() {
  while (requestQueue.length > 0) {
    const healthyServers = allServers.filter((server) => server.isHealthy);
    if (healthyServers.length === 0) {
      const reqRes = requestQueue.shift();
      const req = reqRes.req;
      const res = reqRes.res;
      res
        .status(502)
        .send("No healthy backends available to handle the request.");
      continue;
    }

    let target;
    do {
      target = healthyServers[currentServerIndex].host;
      currentServerIndex = (currentServerIndex + 1) % healthyServers.length;
    } while (!target);

    const reqRes = requestQueue.shift();
    const req = reqRes.req;
    const res = reqRes.res;

    console.log(`Proxying request to: ${target}`);

    proxy.web(req, res, { target }, (err) => {
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
  }
}

app.use((req, res) => {
  requestQueue.push({ req, res });
  processQueue();
});

proxy.on("error", (err, req, res) => {
  console.error("Proxy error:", err);
  res.status(500).send("Proxy error occurred.");
});

app.listen(PORT, () => {
  console.log(`FIFO load balancer started on port ${PORT}`);
});
