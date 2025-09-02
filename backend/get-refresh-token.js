const https = require('https');
const querystring = require('querystring');
require('dotenv').config();

const authCode = '4/0AVMBsJjyENLO7giXfj5FxSn6jXVB1S_p25XLuH_r6QiswepFQ7v7ndZvQ3MXGnArMqrDhg';

function getRefreshToken() {
  const postData = querystring.stringify({
    code: authCode,
    client_id: process.env.GMAIL_CLIENT_ID,
    client_secret: process.env.GMAIL_CLIENT_SECRET,
    redirect_uri: process.env.GMAIL_REDIRECT_URI,
    grant_type: 'authorization_code'
  });

  const options = {
    hostname: 'oauth2.googleapis.com',
    path: '/token',
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
      'Content-Length': Buffer.byteLength(postData)
    }
  };

  const req = https.request(options, (res) => {
    let data = '';

    res.on('data', (chunk) => {
      data += chunk;
    });

    res.on('end', () => {
      try {
        const response = JSON.parse(data);
        
        if (response.refresh_token) {
          console.log('Success! Here are your tokens:\n');
          console.log('Refresh Token:', response.refresh_token);
          console.log('\nAdd this to your .env file:');
          console.log(`GMAIL_REFRESH_TOKEN=${response.refresh_token}`);
          
          if (response.access_token) {
            console.log('\nAccess Token (temporary):', response.access_token);
          }
        } else {
          console.error('Error:', response);
        }
      } catch (error) {
        console.error('Failed to parse response:', data);
      }
    });
  });

  req.on('error', (error) => {
    console.error('Error getting refresh token:', error);
  });

  req.write(postData);
  req.end();
}

getRefreshToken();