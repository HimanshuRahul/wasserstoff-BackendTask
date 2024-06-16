const express = require("express");
const axios = require("axios");

const app = express();

const PORT = 5000;

app.listen(PORT, () => {
  console.log(`Load balancer started on PORT ${PORT}`);
});
