const express = require("express");
const axios = require("axios");

const app = express();

const PORT = 4001;

app.get("/", (req, res) => {
  setTimeout(() => res.send("Fast response from server 1"), 100);
});

app.listen(PORT, () => {
  console.log(`Server started on PORT ${PORT}`);
});
