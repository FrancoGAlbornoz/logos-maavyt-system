const fs = require('fs');

let c = fs.readFileSync('src/routes/gmailRoutes.js', 'utf8');
c = c.replace(
  "const { syncGmail, getGmailStatus } = require('../controllers/gmailController');",
  "const { syncGmail, getGmailStatus, fixDatabaseClients } = require('../controllers/gmailController');"
);
fs.writeFileSync('src/routes/gmailRoutes.js', c, 'utf8');

// I also added a route in index.js earlier for /api/v1/fix-db. I'll make sure it's complete, but I don't need to import anything there since it's inline.
