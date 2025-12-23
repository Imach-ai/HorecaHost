const https = require('https');
const fs = require('fs');
const path = require('path');

const fontsDir = path.join(__dirname, 'fonts');

// Create fonts directory if it doesn't exist
if (!fs.existsSync(fontsDir)) {
  fs.mkdirSync(fontsDir, { recursive: true });
}

const fonts = [
  {
    name: 'Roboto-Regular.ttf',
    url: 'https://github.com/googlefonts/roboto/raw/main/src/hinted/Roboto-Regular.ttf'
  },
  {
    name: 'Roboto-Medium.ttf',
    url: 'https://github.com/googlefonts/roboto/raw/main/src/hinted/Roboto-Medium.ttf'
  },
  {
    name: 'Roboto-Italic.ttf',
    url: 'https://github.com/googlefonts/roboto/raw/main/src/hinted/Roboto-Italic.ttf'
  },
  {
    name: 'Roboto-MediumItalic.ttf',
    url: 'https://github.com/googlefonts/roboto/raw/main/src/hinted/Roboto-MediumItalic.ttf'
  }
];

function downloadFile(url, dest) {
  return new Promise((resolve, reject) => {
    const file = fs.createWriteStream(dest);
    
    const request = (url) => {
      https.get(url, (response) => {
        // Handle redirect
        if (response.statusCode === 301 || response.statusCode === 302) {
          request(response.headers.location);
          return;
        }
        
        if (response.statusCode !== 200) {
          reject(new Error(`Failed to download: ${response.statusCode}`));
          return;
        }
        
        response.pipe(file);
        file.on('finish', () => {
          file.close();
          resolve();
        });
      }).on('error', (err) => {
        fs.unlink(dest, () => {});
        reject(err);
      });
    };
    
    request(url);
  });
}

async function setupFonts() {
  console.log('📥 Downloading fonts for PDF generation...\n');
  
  for (const font of fonts) {
    const destPath = path.join(fontsDir, font.name);
    
    if (fs.existsSync(destPath)) {
      console.log(`  ✓ ${font.name} (already exists)`);
      continue;
    }
    
    try {
      process.stdout.write(`  ⬇ Downloading ${font.name}...`);
      await downloadFile(font.url, destPath);
      console.log(' ✓');
    } catch (error) {
      console.log(` ✗ Failed: ${error.message}`);
    }
  }
  
  console.log('\n✅ Font setup complete!');
  console.log('📁 Fonts directory:', fontsDir);
}

setupFonts().catch(console.error);

