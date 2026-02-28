const https = require('https');
const http = require('http');

/**
 * Send data to an n8n Webhook
 * @param {string} triggerName - The name of the event (e.g., 'ticket_created', 'ticket_updated')
 * @param {object} payload - The data to send
 */
const triggerN8n = (triggerName, payload) => {
  // Check if N8N URL is configured
  const n8nUrl = process.env.N8N_WEBHOOK_URL;
  
  if (!n8nUrl) {
    console.log('⚠️ N8N_WEBHOOK_URL not set in .env, skipping automation.');
    return;
  }

  // Add metadata
  const data = JSON.stringify({
    event: triggerName,
    timestamp: new Date().toISOString(),
    data: payload
  });

  const url = new URL(n8nUrl);
  const options = {
    hostname: url.hostname,
    port: url.port || (url.protocol === 'https:' ? 443 : 80),
    path: url.pathname + url.search,
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Content-Length': data.length
    }
  };

  const protocol = url.protocol === 'https:' ? https : http;

  const req = protocol.request(options, (res) => {
    // We don't really need to wait for the response body, just the status
    if (res.statusCode >= 200 && res.statusCode < 300) {
      console.log(`✅ Sent ${triggerName} event to n8n`);
    } else {
      console.error(`❌ n8n returned status: ${res.statusCode}`);
    }
  });

  req.on('error', (error) => {
    console.error('❌ Error sending to n8n:', error.message);
  });

  req.write(data);
  req.end();
};

module.exports = { triggerN8n };