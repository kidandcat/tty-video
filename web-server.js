var start = require("./video");
var express = require("express");

//App setup
var app = express();

//Add the middleware to the desired routes
app.get("/", function(req, res) {
  const head = {
    "Content-Type": "text/plain"
  };
  res.writeHead(200, head);
  start(res, "https://www.youtube.com/watch?v=VgSGnj68NSg", {
    cols: 200,
    rows: 60
  });
});

app.listen(1000, function() {
  console.log("listening on port 1000!");
});
