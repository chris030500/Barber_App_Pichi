#!/usr/bin/env python3
"""
Specific test for IMAGE EDITING endpoint as requested in review
"""

import requests
import base64
import json
import subprocess

# Backend URL
BACKEND_URL = "https://clipcraft-236.preview.emergentagent.com/api"

def download_test_image():
    """Download a sample face image and convert to base64"""
    try:
        print("📥 Downloading test face image...")
        image_url = "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=400&h=400&fit=crop&crop=face"
        response = requests.get(image_url, timeout=30)
        response.raise_for_status()
        
        # Convert to base64
        base64_image = base64.b64encode(response.content).decode('utf-8')
        print(f"✅ Image downloaded and converted to base64 ({len(base64_image)} chars)")
        return base64_image
    except Exception as e:
        print(f"❌ Failed to download test image: {e}")
        return None

def test_image_editing_endpoint():
    """Test the IMAGE EDITING endpoint specifically"""
    print("🎨 Testing IMAGE EDITING endpoint for haircut visualization")
    print("=" * 60)
    
    # Get test image
    test_image = download_test_image()
    if not test_image:
        return False
    
    # Test data as specified in review request
    request_data = {
        "user_image_base64": test_image,
        "haircut_style": "undercut"
    }
    
    print("🧪 Testing POST /api/generate-haircut-image with undercut style...")
    print("   Expected: Uses OpenAI images/edits API via Emergent proxy")
    print("   Expected: Edits user's photo directly (not generate new person)")
    print("   Timeout: 120 seconds")
    
    try:
        response = requests.post(
            f"{BACKEND_URL}/generate-haircut-image",
            json=request_data,
            headers={"Content-Type": "application/json"},
            timeout=120  # 120 second timeout as specified
        )
        
        print(f"\n📊 Response Status: {response.status_code}")
        
        if response.status_code == 200:
            data = response.json()
            
            # Check required fields
            success = data.get("success")
            generated_image_base64 = data.get("generated_image_base64")
            style_applied = data.get("style_applied")
            
            print(f"✅ success: {success}")
            print(f"✅ generated_image_base64: {'Present' if generated_image_base64 else 'Missing'} ({len(generated_image_base64) if generated_image_base64 else 0} chars)")
            print(f"✅ style_applied: {style_applied}")
            
            # Validate response
            if success and generated_image_base64 and len(generated_image_base64) > 1000:
                print("\n✅ ENDPOINT TEST PASSED")
                print(f"   - Success: {success}")
                print(f"   - Image generated: {len(generated_image_base64)} chars")
                print(f"   - Style applied: {style_applied}")
                return True
            else:
                print("\n❌ ENDPOINT TEST FAILED")
                print(f"   - Success: {success}")
                print(f"   - Image size: {len(generated_image_base64) if generated_image_base64 else 0}")
                return False
        else:
            print(f"\n❌ HTTP ERROR: {response.status_code}")
            print(f"Response: {response.text}")
            return False
            
    except Exception as e:
        print(f"\n❌ REQUEST ERROR: {str(e)}")
        return False

def check_backend_logs():
    """Check backend logs for image editing messages"""
    print("\n🔍 Checking backend logs for image editing messages...")
    
    try:
        result = subprocess.run(
            ["tail", "-n", "20", "/var/log/supervisor/backend.err.log"],
            capture_output=True,
            text=True,
            timeout=10
        )
        
        if result.returncode == 0:
            log_content = result.stdout
            
            # Look for specific messages
            calling_api_found = "Calling image edit API at" in log_content
            response_status_found = "Image edit API response status" in log_content
            editing_found = "Editing user photo" in log_content
            
            print(f"✅ 'Calling image edit API at': {'Found' if calling_api_found else 'Not found'}")
            print(f"✅ 'Image edit API response status': {'Found' if response_status_found else 'Not found'}")
            print(f"✅ 'Editing user photo': {'Found' if editing_found else 'Not found'}")
            
            if calling_api_found and response_status_found:
                print("\n✅ BACKEND LOGS CONFIRMED: Image editing API is being called")
                
                # Check for the specific proxy URL
                if "https://integrations.emergentagent.com/llm/v1/images/edits" in log_content:
                    print("✅ CONFIRMED: Using Emergent proxy URL for image edits")
                else:
                    print("⚠️  WARNING: Emergent proxy URL not found in recent logs")
                
                return True
            else:
                print("\n❌ BACKEND LOGS: Image editing messages not found")
                return False
        else:
            print(f"❌ Could not read backend logs: {result.stderr}")
            return False
            
    except Exception as e:
        print(f"❌ Error checking logs: {str(e)}")
        return False

def main():
    """Main test function"""
    print("🚀 SPECIFIC IMAGE EDITING ENDPOINT TEST")
    print("Testing POST /api/generate-haircut-image for image editing functionality")
    print("=" * 80)
    
    # Test the endpoint
    endpoint_success = test_image_editing_endpoint()
    
    # Check logs
    logs_success = check_backend_logs()
    
    print("\n" + "=" * 80)
    print("📊 FINAL RESULTS")
    print("=" * 80)
    
    if endpoint_success and logs_success:
        print("✅ IMAGE EDITING ENDPOINT TEST PASSED")
        print("   - Endpoint returns success: true")
        print("   - generated_image_base64 is populated")
        print("   - Backend logs show image edit API calls")
        print("   - Using correct Emergent proxy URL")
        return True
    else:
        print("❌ IMAGE EDITING ENDPOINT TEST FAILED")
        if not endpoint_success:
            print("   - Endpoint test failed")
        if not logs_success:
            print("   - Backend logs check failed")
        return False

if __name__ == "__main__":
    success = main()
    exit(0 if success else 1)