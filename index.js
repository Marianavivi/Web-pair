const express = require('express');
const app = express();
const bodyParser = require("body-parser");
const path = require('path');
const PORT = process.env.PORT || 8000;
const code = require('./pair');

// Set maximum listeners to prevent memory leak warnings
require('events').EventEmitter.defaultMaxListeners = 500;

// Middleware for parsing JSON and URL-encoded data
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

// Route to handle /code requests
app.use('/code', code);

// Route to serve the HTML file
app.use('/', async (req, res, next) => {
  res.sendFile(path.join(__dirname, 'pair.html'));
});

// Start the server and listen on the specified port
app.listen(PORT, () => {
  console.log(`⏩ Server running on http://localhost:${PORT}`);
});

module.exports = app;
