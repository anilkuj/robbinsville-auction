
const fs = require('fs');
const content = fs.readFileSync('D:/Claude/robbinsville-auction/BidButton_content.txt', 'utf8');
fs.writeFileSync('D:/Claude/robbinsville-auction/client/src/components/auction/BidButton.jsx', content, 'utf8');
console.log('Written', content.length, 'chars');
