const fs = require('fs');

let content = fs.readFileSync('src/services/gmailService.js', 'utf8');

// Replace 15 days with 30 days (1 month)
const regex = /minDate\.setDate\(today\.getDate\(\) - 15\);/g;
content = content.replace(regex, "minDate.setDate(today.getDate() - 30);");

fs.writeFileSync('src/services/gmailService.js', content, 'utf8');
console.log("Updated gmailService.js to 30 days");
