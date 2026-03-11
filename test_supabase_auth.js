const url = 'https://ecymkdlpklithkhopxmx.supabase.co/auth/v1/settings';
const anonKey = 'sb_publishable_gjLYfIOdnRdOFXb7JSmMCw_TgWmC9zV';

async function testKey() {
  try {
    const response = await fetch(url + '?apikey=' + anonKey, {
      method: 'GET',
    });
    console.log('Status:', response.status);
    const text = await response.text();
    console.log('Response:', text);
  } catch (err) {
    console.error('Error:', err);
  }
}

testKey();
