const url = 'https://ecymkdlpklithkhopxmx.supabase.co/rest/v1/';
const anonKey = 'sb_publishable_gjLYfIOdnRdOFXb7JSmMCw_TgWmC9zV';

async function testKey() {
  try {
    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'apikey': anonKey,
        'Authorization': `Bearer ${anonKey}`
      }
    });
    console.log('Status:', response.status);
    const text = await response.text();
    console.log('Response:', text);
  } catch (err) {
    console.error('Error:', err);
  }
}

testKey();
