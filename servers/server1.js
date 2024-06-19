const express = require("express");

const app = express();

const PORT = 4001;

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.get("/", (req, res) => {
  res.send("Fast response from server 1");
});

if (require.main === module) {
  app.listen(PORT, () => {
    console.log(`Server started on PORT ${PORT}`);
  });
}

module.exports = app;
