// Configuration loader for environment variables
// This file reads from .env.local SYNCHRONOUSLY so it's ready when script.js loads

window.__ENV__ = {};

try {
    // Use XMLHttpRequest for synchronous loading (deprecated but works for .env.local)
    const xhr = new XMLHttpRequest();
    xhr.open('GET', '.env.local', false);  // false = synchronous
    xhr.send();
    
    if (xhr.status === 200) {
        const text = xhr.responseText;
        // Parse .env.local format
        const lines = text.split('\n').filter(line => line.trim() && !line.startsWith('#'));
        
        lines.forEach(line => {
            const [key, ...valueParts] = line.split('=');
            const value = valueParts.join('=').trim();
            if (key && value) {
                window.__ENV__[key.trim()] = value;
            }
        });
        
        if (window.__ENV__.VITE_OPENAI_API_KEY) {
            console.log('✅ Configuration loaded from .env.local');
        }
    }
} catch (error) {
    console.log('ℹ️  Could not load .env.local file');
}

