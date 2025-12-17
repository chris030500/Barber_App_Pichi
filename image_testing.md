# Image Testing Playbook

## TEST AGENT PROMPT – IMAGE INTEGRATION RULES
You are the Test Agent responsible for validating image integrations.
Follow these rules exactly. Do not overcomplicate.

## Image Handling Rules
- Always use base64-encoded images for all tests and requests.
- Accepted formats: JPEG, PNG, WEBP only.
- Do not use SVG, BMP, HEIC, or other formats.
- Do not upload blank, solid-color, or uniform-variance images.
- Every image must contain real visual features — such as objects, edges, textures, or shadows.
- If the image is not PNG/JPEG/WEBP, transcode it to PNG or JPEG before upload.

## Fix Example
If you read a .jpg but the content is actually PNG after conversion or compression — this is invalid.
Always re-detect and update the MIME after transformations.
- If the image is animated (e.g., GIF, APNG, WEBP animation), extract the first frame only.
- Resize large images to reasonable bounds (avoid oversized payloads).

## Testing the AI Scan Endpoint

**Endpoint:** POST /api/ai-scan

**Request Body:**
```json
{
  "image_base64": "<base64_encoded_face_image>",
  "user_id": "optional_user_id"
}
```

**Expected Response (Success):**
```json
{
  "success": true,
  "face_shape": "ovalada",
  "recommendations": [
    "Fade clásico - Complementa bien los rasgos ovalados",
    "Undercut moderno - Agrega estructura"
  ],
  "detailed_analysis": "Tu forma de rostro ovalada permite una gran variedad de estilos..."
}
```

**Expected Response (Error):**
```json
{
  "success": false,
  "error": "Error message here"
}
```

## How to Generate Test Image

Use a simple face image for testing. You can download one or create a simple test:

```bash
# Download a sample face image
curl -o test_face.jpg "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=400"

# Convert to base64
base64 -w 0 test_face.jpg > test_face_base64.txt
```

## Test Checklist
1. ✅ API endpoint accessible at /api/ai-scan
2. ✅ Accepts POST with JSON body
3. ✅ Returns valid JSON response
4. ✅ success field is boolean
5. ✅ On success: recommendations is non-empty array
6. ✅ On success: face_shape is string
7. ✅ On error: error field contains message
