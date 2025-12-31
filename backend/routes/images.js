const express = require('express');
const https = require('https');
const http = require('http');
const { URL } = require('url');
const { Client } = require('basic-ftp');
const stream = require('stream');

const router = express.Router();

// FTP Configuration
const FTP_CONFIG = {
  host: 'gator4456.hostgator.com',
  port: 21,
  user: 'admin@horecahost.com',
  password: Buffer.from('b1ZmLWRXbTdkSy1X', 'base64').toString('utf-8'),
  basePath: '/public_html/posted_images/product/300x300'
};

// Proxy endpoint for images - serves from database, falls back to FTP if not found
router.get('/product/:productId', async (req, res) => {
  try {
    const { productId } = req.params;
    
    if (!productId) {
      return res.status(400).json({ error: 'Product ID is required' });
    }

    // First, try to get image from database
    try {
      const { getDb } = require('../database');
      const db = getDb();
      
      if (db) {
        const stmt = await db.prepare('SELECT image_data, image_mime_type FROM products WHERE id = ?');
        const product = await stmt.get(productId);
        
        if (product && product.image_data) {
          // Image found in database - serve it directly
          const contentType = product.image_mime_type || 'image/png';
          res.setHeader('Content-Type', contentType);
          res.setHeader('Cache-Control', 'public, max-age=31536000'); // Cache for 1 year
          res.setHeader('Content-Length', product.image_data.length);
          res.send(product.image_data);
          return;
        }
      }
    } catch (dbError) {
      // If database query fails, fall back to FTP
      console.log(`Database query failed for product ${productId}, trying FTP...`);
    }

    // Fallback: Try to fetch from FTP (for images not yet imported)
    const filenamePatterns = [
      `post_0000_${productId}.png`,
      `post_0000_${productId}.jpg`,
      `post_0000_${productId}.jpeg`,
      `post_${productId}.png`,
      `post_${productId}.jpg`,
      `post_${productId}.jpeg`,
    ];

    const client = new Client();
    let imageBuffer = null;
    let contentType = 'image/png'; // Default to PNG since all files are PNG

    try {
      // Configure FTP client with timeout and connection settings
      client.ftp.timeout = 30000; // 30 seconds timeout
      client.ftp.keepAlive = 30000; // Keep connection alive
      
      // Connect with retry logic
      let connected = false;
      let retries = 3;
      
      while (!connected && retries > 0) {
        try {
          await client.access({
            host: FTP_CONFIG.host,
            user: FTP_CONFIG.user,
            password: FTP_CONFIG.password,
            secure: false, // Use plain FTP (not FTPS)
            secureOptions: undefined
          });
          
          // Use passive mode explicitly (better for firewalls and NAT)
          await client.ensureDir(FTP_CONFIG.basePath);
          connected = true;
        } catch (connectError) {
          retries--;
          if (retries === 0) {
            throw connectError;
          }
          // Wait before retry
          await new Promise(resolve => setTimeout(resolve, 1000));
          console.log(`FTP connection retry... (${3 - retries}/3)`);
        }
      }

      // Try each filename pattern
      for (const filename of filenamePatterns) {
        try {
          const remotePath = `${FTP_CONFIG.basePath}/${filename}`;
          
          // Download to buffer using stream (correct basic-ftp API)
          const chunks = [];
          const writable = new stream.Writable({
            write(chunk, encoding, callback) {
              chunks.push(chunk);
              callback();
            }
          });
          
          // Try to download with timeout
          await Promise.race([
            client.downloadTo(writable, remotePath),
            new Promise((_, reject) => 
              setTimeout(() => reject(new Error('Download timeout')), 20000)
            )
          ]);
          
          imageBuffer = Buffer.concat(chunks);
          
          // Determine content type from filename
          if (filename.endsWith('.png')) {
            contentType = 'image/png';
          } else if (filename.endsWith('.jpg') || filename.endsWith('.jpeg')) {
            contentType = 'image/jpeg';
          } else {
            contentType = 'image/png'; // Default to PNG
          }
          
          break; // Found the image, exit loop
        } catch (err) {
          // Log for debugging (only first pattern to avoid spam)
          if (filename === filenamePatterns[0]) {
            console.log(`Image not found: ${filename} - ${err.message}`);
          }
          // Try next pattern
          continue;
        }
      }

      // Close connection properly
      try {
        await client.close();
      } catch (closeErr) {
        // Ignore close errors
      }

      if (!imageBuffer) {
        return res.status(404).json({ error: 'Image not found' });
      }

      // Set appropriate headers
      res.setHeader('Content-Type', contentType);
      res.setHeader('Cache-Control', 'public, max-age=31536000'); // Cache for 1 year
      res.setHeader('Content-Length', imageBuffer.length);

      // Send the image
      res.send(imageBuffer);
    } catch (ftpError) {
      console.error('FTP connection error:', ftpError.message);
      console.error('FTP error details:', {
        code: ftpError.code,
        message: ftpError.message,
        stack: ftpError.stack?.split('\n')[0]
      });
      
      // Try to close connection if it exists
      try {
        if (client && typeof client.close === 'function') {
          await client.close();
        }
      } catch (e) {
        // Ignore close errors
      }
      
      // Return appropriate error based on error type
      if (ftpError.message.includes('timeout') || ftpError.message.includes('Timeout')) {
        return res.status(504).json({ error: 'FTP server timeout - please try again' });
      } else if (ftpError.message.includes('ECONNREFUSED') || ftpError.message.includes('connection')) {
        return res.status(503).json({ error: 'FTP server connection failed' });
      } else {
        return res.status(404).json({ error: 'Image not found on FTP server' });
      }
    }
  } catch (error) {
    console.error('Error in image proxy:', error);
    res.status(500).json({ error: 'Failed to proxy image' });
  }
});

// Legacy proxy endpoint for direct URLs
router.get('/proxy', async (req, res) => {
  try {
    const { url } = req.query;
    
    if (!url) {
      return res.status(400).json({ error: 'URL parameter is required' });
    }

    // Decode the URL
    const imageUrl = decodeURIComponent(url);
    
    // If it's an FTP URL, redirect to our product endpoint
    if (imageUrl.startsWith('ftp://')) {
      // Extract product ID from URL (supports both post_0000_{id} and post_{id} patterns)
      const match = imageUrl.match(/post_0000_(\d+)/) || imageUrl.match(/post_(\d+)/);
      if (match) {
        return res.redirect(`/api/images/product/${match[1]}`);
      }
    }
    
    // If it's an HTTP URL, try to fetch it
    if (imageUrl.startsWith('http://') || imageUrl.startsWith('https://')) {
      const parsedUrl = new URL(imageUrl);
      const protocol = parsedUrl.protocol === 'https:' ? https : http;

      protocol.get(imageUrl, (imageRes) => {
        if (imageRes.statusCode !== 200) {
          return res.status(imageRes.statusCode).json({ error: 'Failed to fetch image' });
        }

        res.setHeader('Content-Type', imageRes.headers['content-type'] || 'image/png');
        res.setHeader('Cache-Control', 'public, max-age=31536000');
        imageRes.pipe(res);
      }).on('error', (error) => {
        console.error('Error fetching image:', error);
        res.status(500).json({ error: 'Failed to fetch image' });
      });
    } else {
      res.status(400).json({ error: 'Invalid URL format' });
    }
  } catch (error) {
    console.error('Error in image proxy:', error);
    res.status(500).json({ error: 'Failed to proxy image' });
  }
});

module.exports = router;

