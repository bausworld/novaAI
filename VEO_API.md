# VEO Video Generation API — Reference

**Source**: Google Gemini API (ai.google.dev)
**Last updated**: March 2026

---

## Authentication

- **Header**: `x-goog-api-key: YOUR_API_KEY`
- **API Key format**: `AIzaSy...` (Google AI API key from Google AI Studio)
- **Base URL**: `https://generativelanguage.googleapis.com/v1beta`

---

## Available Models

| Model Code | Audio | Resolution | Duration | Input Modes | Status |
|---|---|---|---|---|---|
| `veo-3.1-generate-preview` | Native audio + video | 720p, 1080p (8s only), 4k (8s only) | 4s, 6s, 8s | Text, Image, Video (extension) | Preview |
| `veo-3.1-fast-generate-preview` | Native audio + video | 720p, 1080p (16:9 only) | 8s | Text, Image | Stable |
| `veo-2` | Silent only | 720p | 5–8s | Text, Image | Stable |

All models output at **24fps**. Veo 3.1 generates **1 video per request**. Veo 2 can generate **1 or 2**.

---

## REST Endpoints

### 1. Generate Video (Long-Running Operation)

```
POST https://generativelanguage.googleapis.com/v1beta/models/{model}:predictLongRunning
```

**Headers**:
```
x-goog-api-key: YOUR_API_KEY
Content-Type: application/json
```

**Request Body**:
```json
{
  "instances": [
    {
      "prompt": "A cinematic shot of a majestic lion in the savannah."
    }
  ],
  "parameters": {
    "aspectRatio": "16:9",
    "durationSeconds": 8,
    "resolution": "720p",
    "personGeneration": "allow_all"
  }
}
```

**Response**: Returns an `Operation` object:
```json
{
  "name": "operations/xxx-xxx-xxx",
  "metadata": { ... },
  "done": false
}
```

### 2. Poll Operation Status

```
GET https://generativelanguage.googleapis.com/v1beta/{operation.name}
```

**Headers**:
```
x-goog-api-key: YOUR_API_KEY
```

**Response** (when done):
```json
{
  "name": "operations/xxx-xxx-xxx",
  "done": true,
  "response": {
    "generateVideoResponse": {
      "generatedSamples": [
        {
          "video": {
            "uri": "https://generativelanguage.googleapis.com/v1beta/files/...",
            "encoding": "video/mp4"
          }
        }
      ]
    }
  }
}
```

### 3. Download Video File

```
GET {video.uri}
```

**Headers**:
```
x-goog-api-key: YOUR_API_KEY
```

Returns raw video bytes (MP4).

---

## All Generation Parameters

### Instance Fields (in `instances[]`)

| Parameter | Type | Description |
|---|---|---|
| `prompt` | string | Text description for the video. Max 1,024 tokens. Supports dialogue in quotes, SFX descriptions, ambient noise cues. |
| `image` | Image object | Initial image to animate (image-to-video). Base64 data with mimeType. |
| `lastFrame` | Image object | Final frame for interpolation. Must be used with `image`. (Veo 3.1 only) |
| `referenceImages` | array | Up to 3 reference images for style/content guidance. Each has `image` and `referenceType: "asset"`. (Veo 3.1 only) |
| `video` | Video object | Previously generated Veo video for extension. (Veo 3.1 only) |

### Config Parameters (in `parameters`)

| Parameter | Type | Values | Default | Notes |
|---|---|---|---|---|
| `aspectRatio` | string | `"16:9"`, `"9:16"` | `"16:9"` | Landscape or portrait |
| `durationSeconds` | integer | **Veo 3.1**: `4`, `6`, `8` / **Veo 2**: `5`, `6`, `8` | `8` | Must be `8` for 1080p, 4k, extension, or reference images |
| `resolution` | string | `"720p"`, `"1080p"`, `"4k"` | `"720p"` | 1080p and 4k require 8s duration. Extension = 720p only. Veo 2 doesn't support this. |
| `personGeneration` | string | `"allow_all"`, `"allow_adult"`, `"dont_allow"` | varies | Text-to-video: `"allow_all"` only for Veo 3.x. Image-to-video: `"allow_adult"` only. |
| `numberOfVideos` | integer | `1` (Veo 3.x), `1` or `2` (Veo 2) | `1` | Videos per request |
| `negativePrompt` | string | freeform text | — | Describe what you don't want. Don't use "no" or "don't" — just name the unwanted elements (e.g., "wall, frame, dark tones"). |
| `seed` | integer | any integer | — | Slightly improves reproducibility. Not deterministic. Available for Veo 3 models. |

---

## Image-to-Video Format

For the `image` field in instances:
```json
{
  "instances": [
    {
      "prompt": "Panning wide shot of a calico kitten sleeping in the sunshine",
      "image": {
        "bytesBase64Encoded": "<base64-encoded-image-data>",
        "mimeType": "image/png"
      }
    }
  ],
  "parameters": {
    "aspectRatio": "16:9"
  }
}
```

## Interpolation (First + Last Frame)

```json
{
  "instances": [
    {
      "prompt": "A cinematic transition...",
      "image": {
        "bytesBase64Encoded": "<first-frame-base64>",
        "mimeType": "image/png"
      }
    }
  ],
  "parameters": {
    "lastFrame": {
      "bytesBase64Encoded": "<last-frame-base64>",
      "mimeType": "image/png"
    }
  }
}
```

## Video Extension

- Extend previously generated Veo videos by ~7 seconds, up to 20 times
- Max total video length: 148 seconds
- Resolution locked to 720p for extensions
- Input video must be from a previous Veo generation (stored for 2 days)
- Voice extension only works if voice is in the last 1 second of original

```json
{
  "instances": [
    {
      "prompt": "Continue the action with...",
      "video": {
        "uri": "https://generativelanguage.googleapis.com/v1beta/files/...",
        "mimeType": "video/mp4"
      }
    }
  ],
  "parameters": {
    "numberOfVideos": 1,
    "resolution": "720p"
  }
}
```

## Reference Images (Veo 3.1 Only)

Up to 3 images to guide content (person, character, product preservation):

```json
{
  "instances": [
    {
      "prompt": "A woman walking on the beach wearing the dress...",
      "referenceImages": [
        {
          "image": { "bytesBase64Encoded": "...", "mimeType": "image/png" },
          "referenceType": "asset"
        },
        {
          "image": { "bytesBase64Encoded": "...", "mimeType": "image/png" },
          "referenceType": "asset"
        }
      ]
    }
  ],
  "parameters": {
    "durationSeconds": 8
  }
}
```

---

## Constraints & Rules

| Constraint | Detail |
|---|---|
| 1080p / 4k | Must use 8-second duration |
| Extension | Must use 720p, 8-second duration |
| Reference images | Must use 8-second duration, Veo 3.1 only |
| Interpolation | Veo 3.1 only |
| Max prompt | 1,024 tokens |
| Video retention | 2 days on server (timer resets if referenced for extension) |
| Output format | MP4, 24fps |
| Watermarking | All videos watermarked with SynthID |

---

## Latency

- **Minimum**: ~11 seconds
- **Maximum**: ~6 minutes (during peak hours)
- Higher resolution = higher latency
- 4k is significantly slower and more expensive than 720p

---

## Prompt Writing Guide

### Required Elements
- **Subject**: Object, person, animal, scenery (e.g., "cityscape", "puppies")
- **Action**: What the subject does (walking, running, turning head)
- **Style**: Creative direction keywords (sci-fi, horror film, film noir, cartoon, 3D animated)

### Optional Elements
- **Camera positioning/motion**: aerial view, eye-level, top-down shot, dolly shot, worm's eye, tracking drone view, POV shot
- **Composition**: wide shot, close-up, single-shot, two-shot, extreme close-up
- **Focus/lens**: shallow focus, deep focus, soft focus, macro lens, wide-angle lens
- **Ambiance**: blue tones, night, warm tones, muted orange, natural light, sunrise

### Audio Prompting (Veo 3.x)
- **Dialogue**: Use quotes. `"This must be the key," he murmured.`
- **Sound effects**: Describe explicitly. `tires screeching loudly, engine roaring`
- **Ambient noise**: Describe the environment. `A faint, eerie hum resonates in the background.`

### Negative Prompts
- Don't use "no" or "don't"
- Just name unwanted elements: `urban background, man-made structures, dark atmosphere`

---

## Error Handling

- Safety filters may block generation — no charge if blocked
- Audio processing issues may block video — no charge if blocked
- EU/UK/CH/MENA regions: `personGeneration` restricted to `"allow_adult"` (Veo 3) or `"dont_allow"` + `"allow_adult"` (Veo 2)

---

## Implementation Plan for Nova

### API Route: `/api/veo`

1. **POST** — Start video generation
   - Accept: `prompt`, `aspectRatio`, `durationSeconds`, `resolution`, `personGeneration`, `negativePrompt`, `model`
   - Call `predictLongRunning` → return `operationName`

2. **GET** `?operationName=xxx` — Poll operation status
   - Call operations endpoint → return `{ done, videoUrl? }`

3. **GET** `?download=xxx` — Proxy video download
   - Fetch video bytes from Google → stream to client as MP4

### Environment Variables
```
VEO_API_KEY=AIzaSyCY-7pah_1zZbrZRQd2F9KeOzyVLOuc4Ak
GOOGLE_PROJECT_ID=project-55e2f0fb-c7d2-4cdf-b42
```

### Chat Integration
- Detect intent: "generate a video of...", "create a video...", "make a video..."
- Show generation options in UI before generating
- Display video player with download button in chat
- Poll operation status with progress indicator
