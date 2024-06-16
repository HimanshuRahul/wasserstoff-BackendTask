const express = require("express");
const axios = require("axios");

const app = express();

const PORT = 4002;

app.get("/", (req, res) => {
  setTimeout(() => res.send("Slow response from server 2"), 2000);
});

app.listen(PORT, () => {
  console.log(`Server started on PORT ${PORT}`);
});
