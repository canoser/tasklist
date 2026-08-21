const fs = require('fs');
const path = require('path');

const dir = 'C:/YazilimCalisma/planlama_app/WebApp/Frontend/src';

const replacements = {
  '--bg-primary': '--bg',
  '--bg-secondary': '--surface',
  '--bg-card': '--surface',
  '--bg-input': '--surface2',
  '--text-primary': '--text',
  '--text-secondary': '--text2',
  '--text-muted': '--text3',
  '--border-color': '--border',
  '--accent-primary': '--accent',
  '--primary-color': '--accent',
  '--danger': '--red',
  '--border-radius-sm': '--radius-sm',
  '--border-radius-md': '--radius',
  '--border-radius-lg': '--radius',
  '--brand-primary': '--accent'
};

function walkSync(currentDirPath, callback) {
  fs.readdirSync(currentDirPath).forEach(function (name) {
    var filePath = path.join(currentDirPath, name);
    var stat = fs.statSync(filePath);
    if (stat.isFile()) {
      callback(filePath, stat);
    } else if (stat.isDirectory()) {
      walkSync(filePath, callback);
    }
  });
}

let modifiedCount = 0;

walkSync(dir, function(filePath) {
  if (filePath.endsWith('.css') || filePath.endsWith('.jsx')) {
    let content = fs.readFileSync(filePath, 'utf8');
    let original = content;
    
    for (const [oldVar, newVar] of Object.entries(replacements)) {
      // Create a global regex for each variable
      const regex = new RegExp(oldVar, 'g');
      content = content.replace(regex, newVar);
    }
    
    if (content !== original) {
      fs.writeFileSync(filePath, content, 'utf8');
      modifiedCount++;
      console.log(`Updated: ${filePath}`);
    }
  }
});

console.log(`Total files modified: ${modifiedCount}`);
