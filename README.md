# V.ZONE

A minimalist, client-side screen recording studio inspired by Jonathan Ive design principles. Built with React, TypeScript, and FFmpeg.wasm.

## Features

- **Client-Side Recording**: Uses `MediaRecorder` API. No data leaves your browser.
- **Auto-Zoom Leash**: Tracks clicks during recording to create zoom metadata (visualized in the editor).
- **Background Engine**: Wrap your screen recordings in professional solid or gradient backgrounds.
- **FFmpeg Processing**: Transcodes WebM to MP4 directly in the browser.

## Setup & Development

1. **Install Dependencies** (if moving to a local environment):
   ```bash
   npm install react react-dom lucide-react @ffmpeg/ffmpeg @ffmpeg/util
   npm install -D tailwindcss typescript @types/react
   ```

2. **Cross-Origin Isolation (Crucial for FFmpeg)**:
   FFmpeg.wasm requires `SharedArrayBuffer`, which is only available if the server sends these headers:
   ```
   Cross-Origin-Opener-Policy: same-origin
   Cross-Origin-Embedder-Policy: require-corp
   ```
   *If testing locally without these headers, the export function may fail.*

3. **Run Locally**:
   Use Vite or Next.js to serve the app.

## Deployment

### Vercel
1. Add a `vercel.json` to the root to enable headers:
   ```json
   {
     "headers": [
       {
         "source": "/(.*)",
         "headers": [
           { "key": "Cross-Origin-Opener-Policy", "value": "same-origin" },
           { "key": "Cross-Origin-Embedder-Policy", "value": "require-corp" }
         ]
       }
     ]
   }
   ```
2. Deploy via git push.

### Firebase Hosting
1. Update `firebase.json`:
   ```json
   "headers": [ {
     "source": "**",
     "headers": [
       { "key": "Cross-Origin-Embedder-Policy", "value": "require-corp" },
       { "key": "Cross-Origin-Opener-Policy", "value": "same-origin" }
     ]
   } ]
   ```

## Usage

1. Click **Start Recording**.
2. Select the screen or tab you wish to record.
3. Use the floating control panel to pause or stop.
4. Clicks inside the V.ZONE tab are tracked as "Zoom Points".
5. After recording, customize your background style.
6. Click **Process & Export** to render the final MP4.
