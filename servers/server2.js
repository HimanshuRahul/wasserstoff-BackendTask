const express = require("express");
const axios = require("axios");

const app = express();

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

const PORT = 4002;

app.get("/", (req, res) => {
  setTimeout(() => res.send("Slow response from server 2"), 2000);
});

if (require.main === module) {
  app.listen(PORT, () => {
    console.log(`Server started on PORT ${PORT}`);
  });
}

module.exports = app;
