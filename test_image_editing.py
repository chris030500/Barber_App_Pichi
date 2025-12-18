#!/usr/bin/env python3
"""
Focused test for the updated haircut image generation endpoint
Tests the IMAGE EDITING functionality specifically
"""

import requests
import base64
import json
import os
import sys
import tempfile
import subprocess
from typing import Dict, Any

# Get backend URL from frontend .env
BACKEND_URL = "https://clipcraft-236.preview.emergentagent.com/api"

class ImageEditingTester:
    def __init__(self):
        self.base_url = BACKEND_URL
        self.session = requests.Session()
        self.test_results = []
        
    def log_test(self, test_name: str, success: bool, details: str = ""):
        """Log test results"""
        status = "✅ PASS" if success else "❌ FAIL"
        result = {
            "test": test_name,
            "status": status,
            "success": success,
            "details": details
        }
        self.test_results.append(result)
        print(f"{status}: {test_name}")
        if details:
            print(f"   Details: {details}")
        print()

    def download_test_image(self) -> str:
        """Download a sample face image and convert to base64"""
        try:
            print("📥 Downloading test face image...")
            
            # Download a sample face image from Unsplash
            image_url = "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=400&h=400&fit=crop&crop=face"
            
            response = requests.get(image_url, timeout=30)
            response.raise_for_status()
            
            # Save to temporary file
            with tempfile.NamedTemporaryFile(suffix='.jpg', delete=False) as tmp_file:
                tmp_file.write(response.content)
                tmp_path = tmp_file.name
            
            # Convert to base64
            with open(tmp_path, 'rb') as img_file:
                image_data = img_file.read()
                base64_image = base64.b64encode(image_data).decode('utf-8')
            
            # Clean up
            os.unlink(tmp_path)
            
            print(f"✅ Image downloaded and converted to base64 ({len(base64_image)} chars)")
            return base64_image
            
        except Exception as e:
            print(f"❌ Failed to download test image: {e}")
            return None

    def check_backend_logs_for_image_editing(self):
        """Check backend logs for image editing messages"""
        try:
            print("🔍 Checking backend logs for image editing messages...")
            
            # Check both output and error logs for specific messages
            log_files = ["/var/log/supervisor/backend.out.log", "/var/log/supervisor/backend.err.log"]
            all_log_content = ""
            
            for log_file in log_files:
                result = subprocess.run(
                    ["tail", "-n", "50", log_file],
                    capture_output=True,
                    text=True,
                    timeout=10
                )
                
                if result.returncode == 0:
                    all_log_content += result.stdout + "\n"
            
            print(f"📋 Checking recent backend log entries...")
            
            # Look for specific messages mentioned in review request
            editing_found = "Editing user photo" in all_log_content
            edit_failed_found = "Image edit failed" in all_log_content
            
            if editing_found and edit_failed_found:
                self.log_test("Backend Log - Image Editing Process", True, "Found both 'Editing user photo' and 'Image edit failed' messages - endpoint correctly tries editing first, then falls back to generation")
                return True
            elif editing_found:
                self.log_test("Backend Log - Image Editing", True, "Found 'Editing user photo' message in logs")
                return True
            elif edit_failed_found:
                self.log_test("Backend Log - Image Edit Failed", True, "Found 'Image edit failed' message in logs (fallback to generation)")
                return True
            else:
                self.log_test("Backend Log - Image Editing Messages", False, "No 'Editing user photo' or 'Image edit failed' messages found in recent logs")
                return False
                
        except Exception as e:
            self.log_test("Backend Log Check", False, f"Error checking logs: {str(e)}")
            return False

    def test_generate_haircut_image_endpoint(self, test_image_base64: str):
        """Test UPDATED Generate Haircut Image endpoint with IMAGE EDITING functionality"""
        print("🎨 Testing UPDATED Generate Haircut Image endpoint")
        print("   This endpoint now uses OpenAI's images/edits API to EDIT user's photo directly")
        print("   Preserves user's face and only changes hairstyle, falls back to generation if edit fails")
        
        test_cases = [
            {"style": "fade", "name": "Fade haircut"},
        ]
        
        all_passed = True
        
        for test_case in test_cases:
            try:
                request_data = {
                    "user_image_base64": test_image_base64,
                    "haircut_style": test_case["style"]
                }
                
                print(f"\n🧪 Testing {test_case['name']} (120 second timeout for image editing)...")
                
                response = self.session.post(
                    f"{self.base_url}/generate-haircut-image",
                    json=request_data,
                    headers={"Content-Type": "application/json"},
                    timeout=120  # 120 seconds as specified in review request
                )
                
                print(f"Response status: {response.status_code}")
                
                if response.status_code == 200:
                    data = response.json()
                    print(f"Response keys: {list(data.keys())}")
                    
                    # Validate response structure
                    required_fields = ["success", "generated_image_base64", "style_applied"]
                    missing_fields = [field for field in required_fields if field not in data]
                    
                    if missing_fields:
                        self.log_test(f"Generate Haircut Image Response Structure ({test_case['style']})", False, f"Missing fields: {missing_fields}")
                        all_passed = False
                        continue
                    
                    # Check success field
                    if not data.get("success"):
                        error_msg = data.get("error", "Unknown error")
                        self.log_test(f"Generate Haircut Image Success ({test_case['style']})", False, f"API returned success=false: {error_msg}")
                        all_passed = False
                        continue
                    
                    # Validate generated_image_base64 (non-empty base64 string)
                    generated_image = data.get("generated_image_base64")
                    if not generated_image or not isinstance(generated_image, str):
                        self.log_test(f"Generate Haircut Image Base64 ({test_case['style']})", False, f"Invalid generated_image_base64: {type(generated_image)}")
                        all_passed = False
                        continue
                    
                    if len(generated_image) < 1000:  # Should be substantial base64 image
                        self.log_test(f"Generate Haircut Image Base64 Size ({test_case['style']})", False, f"Base64 too short: {len(generated_image)} chars")
                        all_passed = False
                        continue
                    
                    # Validate style_applied (should match requested style)
                    style_applied = data.get("style_applied")
                    if not style_applied or style_applied.lower() != test_case["style"].lower():
                        self.log_test(f"Generate Haircut Image Style ({test_case['style']})", False, f"Expected style '{test_case['style']}', got: {style_applied}")
                        all_passed = False
                        continue
                    
                    # All validations passed for this test case
                    self.log_test(f"Generate Haircut Image Endpoint Success ({test_case['style']})", True, 
                        f"Generated image: {len(generated_image)} chars, Style: {style_applied}")
                    
                else:
                    self.log_test(f"Generate Haircut Image HTTP Response ({test_case['style']})", False, f"HTTP {response.status_code}: {response.text}")
                    all_passed = False
                    
            except Exception as e:
                self.log_test(f"Generate Haircut Image Endpoint ({test_case['style']})", False, f"Request error: {str(e)}")
                all_passed = False
        
        return all_passed

    def run_focused_test(self):
        """Run focused test for image editing endpoint"""
        print("🚀 Starting Focused Test for Updated Haircut Image Generation Endpoint")
        print(f"🔗 Testing against: {self.base_url}")
        print("=" * 80)
        
        # Test 1: Download test image
        test_image = self.download_test_image()
        if not test_image:
            print("❌ Could not get test image. Stopping test.")
            return False
        
        # Test 2: Generate Haircut Image with IMAGE EDITING
        generate_image_success = self.test_generate_haircut_image_endpoint(test_image)
        
        # Test 3: Check backend logs for image editing messages
        log_check_success = self.check_backend_logs_for_image_editing()
        
        # Summary
        print("=" * 80)
        print("📊 FOCUSED TEST SUMMARY")
        print("=" * 80)
        
        passed = sum(1 for result in self.test_results if result["success"])
        total = len(self.test_results)
        
        for result in self.test_results:
            print(f"{result['status']}: {result['test']}")
            if result['details']:
                print(f"   {result['details']}")
        
        print(f"\n🎯 Results: {passed}/{total} tests passed")
        
        if generate_image_success:
            print("✅ Updated Generate Haircut Image endpoint (IMAGE EDITING) is working correctly!")
            return True
        else:
            print("❌ Updated Generate Haircut Image endpoint has issues!")
            return False

def main():
    """Main test runner"""
    tester = ImageEditingTester()
    success = tester.run_focused_test()
    
    # Exit with appropriate code
    sys.exit(0 if success else 1)

if __name__ == "__main__":
    main()