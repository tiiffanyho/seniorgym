# Hand OA Exercise Tracker - API Key Setup

## Where to Put Your OpenAI API Key

You have **3 options** to set your API key:

### Option 1: `.env.local` File (Recommended) ✅
Create a file named `.env.local` in the `sit-to-stand-ai/` directory with:
```
VITE_OPENAI_API_KEY=sk-proj-YOUR-ACTUAL-KEY-HERE
```

**File location:** `/Users/ethanzhang/Desktop/seniorgym/sit-to-stand-ai/.env.local`

The app will automatically load this when you refresh the page.

### Option 2: Browser Console (Quick Test)
1. Open your browser (Chrome/Safari/Firefox)
2. Go to `http://localhost:8000`
3. Open DevTools: **F12** or **Cmd+Option+J** (Mac)
4. In the Console tab, paste:
```javascript
localStorage.setItem('OPENAI_API_KEY', 'sk-proj-YOUR-ACTUAL-KEY-HERE')
location.reload()
```
5. Replace `sk-proj-YOUR-ACTUAL-KEY-HERE` with your actual key
6. Press Enter

### Option 3: Environment Variables
If you're using a build system (Vite, etc.), set:
```
VITE_OPENAI_API_KEY=sk-proj-YOUR-ACTUAL-KEY-HERE
```

## How to Get Your API Key

1. Go to [platform.openai.com](https://platform.openai.com)
2. Log in to your account
3. Click **API keys** in the left sidebar
4. Click **Create new secret key**
5. Copy the key (it starts with `sk-proj-`)
6. Use it in one of the options above

## Verify It's Working

1. Open the browser console (**F12**)
2. You should see: `✅ OpenAI API key loaded - AI summaries enabled`
3. Run an exercise
4. After finishing, you'll get an AI-powered session summary instead of a generic one

## Current Status

**File created:** ✅ `/Users/ethanzhang/Desktop/seniorgym/sit-to-stand-ai/.env.local`
- Your API key is already in this file

**App is ready:** ✅ Just refresh the page at `http://localhost:8000`

The config loader will automatically pick up your key from `.env.local`!
