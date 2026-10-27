const fs = require('fs');
const path = require('path');

function getPngDimensions(filePath) {
  const buf = fs.readFileSync(filePath);
  // PNG signature: 8 bytes, IHDR chunk length: 4 bytes, chunk type: 4 bytes ("IHDR"), width: 4 bytes, height: 4 bytes
  const width = buf.readUInt32BE(16);
  const height = buf.readUInt32BE(20);
  return { width, height };
}

const dir = 'C:\\Users\\ldm\\.gemini\\antigravity-ide\\brain\\82db63d6-5528-446f-9663-aa02883ba5dd\\.user_uploaded';
const img1 = path.join(dir, 'media_1792948565960.png');
const img2 = path.join(dir, 'media_1792948571172.png');

console.log('Image 1 (Current):', getPngDimensions(img1));
console.log('Image 2 (Reference):', getPngDimensions(img2));
