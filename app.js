// script.js

document.addEventListener('DOMContentLoaded', () => {
  const url = 'https://so-por-hoje.github.io/reuniao-agora/meetings.json';

  fetch(url)
    .then(response => {
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      return response.json();
    })
    .then(data => {
      if (!data || typeof data !== 'object') {
        throw new Error('Invalid JSON format');
      }

      console.log('✅ JSON fetched successfully');
      
      if (Array.isArray(data)) {
        console.log(`📦 Loaded array with ${data.length} items`);
      } else {
        console.log('📂 Loaded object with keys:', Object.keys(data));
      }

      // Example: print first entry
      const firstEntry = Array.isArray(data) ? data[0] : Object.values(data)[0];
      console.log('🧾 First item in dataset:', firstEntry);
    })
    .catch(error => {
      console.error('❌ Error fetching or processing JSON:', error);
    });
});
