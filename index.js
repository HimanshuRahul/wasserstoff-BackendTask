const express = require("express");
const { createProxyMiddleware } = require("http-proxy-middleware");

const app = express();

// Load balancers
const loadBalancer = require("./loadBalancers/loadBalancer");
const fifoLoadBalancer = require("./loadBalancers/fifoLoadBalancer");
const weightLoadBalancer = require("./loadBalancers/weightLoadBalancer");

// Servers
const server1 = require("./servers/server1");
const server2 = require("./servers/server2");

// Mount each load balancer and server on a different endpoint
app.use("/load-balancer", loadBalancer);
app.use("/fifo-load-balancer", fifoLoadBalancer);
app.use("/weight-load-balancer", weightLoadBalancer);

// Alternatively, if the servers are independent and need to be proxied:
app.use(
  "/server1",
  createProxyMiddleware({ target: "http://localhost:4001", changeOrigin: true })
);
app.use(
  "/server2",
  createProxyMiddleware({ target: "http://localhost:4002", changeOrigin: true })
);

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Main server running on port ${PORT}`);
});
