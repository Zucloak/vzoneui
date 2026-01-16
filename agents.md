
# Agents Log

## V.ZONE - v1.0.0
- Initialized React 18 TypeScript Project.
- Implemented `MediaRecorder` API for screen capture.
- Created `DraggableControls` component with floating UI logic.
- Implemented "Invisible Leash" mechanism:
  - Uses global `window` event listeners during recording state.
  - Captures `clientX/Y` relative to viewport.
  - Generates `ZoomEffect` metadata array.
- Integrated `BackgroundPicker` for solid and gradient backgrounds.
- Set up `ffmpeg.wasm` service:
  - Loads core asynchronously.
  - Handles Blob to File conversion.
  - Prepares simplified pipeline for padding and transcoding.
  - **Note:** Complex `zoompan` filters are disabled in the basic demo to ensure stability without backend generation logic, but the architecture supports passing the metadata.
- Styled with Tailwind CSS following "Jonathan Ive" minimalism (Neutral grays, rounded corners, soft shadows).

## V.ZONE - v1.0.1
- Fixed `getDisplayMedia` error by adding `display-capture` to `metadata.json` permissions list.

## V.ZONE - v1.0.2
- Fixed FFmpeg `Failed to construct 'Worker'` error:
  - Browsers block workers from cross-origin CDNs.
  - Solution: Manually fetched the `@ffmpeg/ffmpeg` library worker script as a Blob and passed its local URL to `ffmpeg.load()` via the `workerURL` option.
  - Standardized assets to version `0.12.10` for stability.

## V.ZONE - v1.0.3
- Enhanced FFmpeg Worker Fix:
  - Updated `index.html` import map to use `unpkg.com` for `@ffmpeg/ffmpeg` (0.12.10) to ensure main thread and worker versions match perfectly.
  - Refactored `services/ffmpegService.ts` to explicitly fetch the worker script text and create a Blob, bypassing `toBlobURL` for the worker to guarantee a local origin execution.
  - Confirmed `coreURL` and `wasmURL` point to the matching 0.12.10 versions.

## V.ZONE - v1.0.4
- Critical FFmpeg Worker Fix:
  - Switched from ESM `worker.js` to UMD `worker.js` for the Blob URL creation. The ESM worker contained relative imports that failed when executed from a blob origin.
  - Added explicit `mode: 'cors'` to the worker fetch request.
  - Added logging to confirm Blob URL generation.

## V.ZONE - v1.0.5
- FFmpeg Fetch/CDN Fix:
  - Switched all FFmpeg asset URLs from `unpkg.com` to `cdn.jsdelivr.net` to resolve persistent "Failed to fetch" errors likely due to CDN outages or strict CORS.
  - Refactored `loadFFmpeg` to use `toBlobURL` for the worker script as well (pointing to UMD), ensuring a consistent and robust loading pipeline for all 3 assets (Core, Wasm, Worker).
