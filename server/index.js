const express = require("express");

const app = express();
const port = Number(process.env.PORT) || 3001;

app.get("/api/health", (_request, response) => {
  response.json({ status: "ok" });
});

app.listen(port, "0.0.0.0", () => {
  console.log(`HireTrack API listening on port ${port}`);
});
