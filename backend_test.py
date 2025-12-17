#!/usr/bin/env python3
"""
Backend API Testing Suite for Barbershop Management App
Tests the AI Scan endpoint with Gemini 2.5 Flash integration
"""

import requests
import base64
import json
import os
import sys
from typing import Dict, Any
import tempfile
import subprocess

# Get backend URL from frontend .env
BACKEND_URL = "https://barberpro-7.preview.emergentagent.com/api"

class BackendTester:
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

    def test_api_root(self):
        """Test if API root endpoint is accessible"""
        try:
            response = self.session.get(f"{self.base_url}/")
            
            if response.status_code == 200:
                data = response.json()
                if "BarberShop API" in data.get("message", ""):
                    self.log_test("API Root Endpoint", True, f"API accessible: {data.get('message')}")
                    return True
                else:
                    self.log_test("API Root Endpoint", False, f"Unexpected response: {data}")
                    return False
            else:
                self.log_test("API Root Endpoint", False, f"HTTP {response.status_code}: {response.text}")
                return False
                
        except Exception as e:
            self.log_test("API Root Endpoint", False, f"Connection error: {str(e)}")
            return False

    def test_ai_scan_endpoint_success(self, test_image_base64: str):
        """Test AI scan endpoint with valid image"""
        try:
            # Prepare request data
            request_data = {
                "image_base64": test_image_base64,
                "user_id": "test_user_ai_scan_123"
            }
            
            print("🤖 Testing AI Scan endpoint with face image...")
            
            # Send request
            response = self.session.post(
                f"{self.base_url}/ai-scan",
                json=request_data,
                headers={"Content-Type": "application/json"},
                timeout=60  # AI processing can take time
            )
            
            print(f"Response status: {response.status_code}")
            
            if response.status_code == 200:
                data = response.json()
                print(f"Response data: {json.dumps(data, indent=2)}")
                
                # Validate response structure
                required_fields = ["success", "face_shape", "recommendations", "detailed_analysis"]
                missing_fields = [field for field in required_fields if field not in data]
                
                if missing_fields:
                    self.log_test("AI Scan Response Structure", False, f"Missing fields: {missing_fields}")
                    return False
                
                # Check success field
                if not data.get("success"):
                    error_msg = data.get("error", "Unknown error")
                    self.log_test("AI Scan Success", False, f"API returned success=false: {error_msg}")
                    return False
                
                # Validate face_shape
                face_shape = data.get("face_shape")
                if not face_shape or not isinstance(face_shape, str):
                    self.log_test("AI Scan Face Shape", False, f"Invalid face_shape: {face_shape}")
                    return False
                
                # Validate recommendations
                recommendations = data.get("recommendations", [])
                if not recommendations or not isinstance(recommendations, list) or len(recommendations) == 0:
                    self.log_test("AI Scan Recommendations", False, f"Empty or invalid recommendations: {recommendations}")
                    return False
                
                # Validate detailed_analysis
                detailed_analysis = data.get("detailed_analysis")
                if not detailed_analysis or not isinstance(detailed_analysis, str):
                    self.log_test("AI Scan Analysis", False, f"Invalid detailed_analysis: {detailed_analysis}")
                    return False
                
                # All validations passed
                self.log_test("AI Scan Endpoint Success", True, 
                    f"Face shape: {face_shape}, Recommendations: {len(recommendations)}, Analysis length: {len(detailed_analysis)} chars")
                return True
                
            else:
                self.log_test("AI Scan HTTP Response", False, f"HTTP {response.status_code}: {response.text}")
                return False
                
        except Exception as e:
            self.log_test("AI Scan Endpoint", False, f"Request error: {str(e)}")
            return False

    def test_ai_scan_endpoint_invalid_data(self):
        """Test AI scan endpoint with invalid data"""
        try:
            # Test with invalid base64
            request_data = {
                "image_base64": "invalid_base64_data",
                "user_id": "test_user_invalid"
            }
            
            response = self.session.post(
                f"{self.base_url}/ai-scan",
                json=request_data,
                headers={"Content-Type": "application/json"},
                timeout=30
            )
            
            if response.status_code == 200:
                data = response.json()
                if not data.get("success") and "error" in data:
                    self.log_test("AI Scan Invalid Data Handling", True, f"Properly handled invalid data: {data.get('error')}")
                    return True
                else:
                    self.log_test("AI Scan Invalid Data Handling", False, f"Should have failed but got: {data}")
                    return False
            else:
                # HTTP error is also acceptable for invalid data
                self.log_test("AI Scan Invalid Data Handling", True, f"HTTP error for invalid data: {response.status_code}")
                return True
                
        except Exception as e:
            self.log_test("AI Scan Invalid Data Test", False, f"Unexpected error: {str(e)}")
            return False

    def test_ai_scan_history_endpoint(self):
        """Test AI scan history endpoint"""
        try:
            user_id = "test_user_ai_scan_123"
            response = self.session.get(f"{self.base_url}/ai-scans/{user_id}")
            
            if response.status_code == 200:
                data = response.json()
                if isinstance(data, list):
                    self.log_test("AI Scan History Endpoint", True, f"Retrieved {len(data)} scan records")
                    return True
                else:
                    self.log_test("AI Scan History Endpoint", False, f"Expected list, got: {type(data)}")
                    return False
            else:
                self.log_test("AI Scan History Endpoint", False, f"HTTP {response.status_code}: {response.text}")
                return False
                
        except Exception as e:
            self.log_test("AI Scan History Endpoint", False, f"Request error: {str(e)}")
            return False

    def test_ai_scan_v2_endpoint(self, test_image_base64: str):
        """Test AI Scan V2 endpoint with reference images"""
        try:
            request_data = {
                "image_base64": test_image_base64,
                "user_id": "test_user_v2_scan"
            }
            
            print("🤖 Testing AI Scan V2 endpoint with reference images...")
            
            response = self.session.post(
                f"{self.base_url}/ai-scan-v2",
                json=request_data,
                headers={"Content-Type": "application/json"},
                timeout=60
            )
            
            print(f"Response status: {response.status_code}")
            
            if response.status_code == 200:
                data = response.json()
                print(f"Response data: {json.dumps(data, indent=2)}")
                
                # Validate response structure
                required_fields = ["success", "face_shape", "recommendations", "detailed_analysis"]
                missing_fields = [field for field in required_fields if field not in data]
                
                if missing_fields:
                    self.log_test("AI Scan V2 Response Structure", False, f"Missing fields: {missing_fields}")
                    return False
                
                # Check success field
                if not data.get("success"):
                    error_msg = data.get("error", "Unknown error")
                    self.log_test("AI Scan V2 Success", False, f"API returned success=false: {error_msg}")
                    return False
                
                # Validate recommendations structure (should be list of objects with reference_image)
                recommendations = data.get("recommendations", [])
                if not recommendations or not isinstance(recommendations, list):
                    self.log_test("AI Scan V2 Recommendations", False, f"Invalid recommendations: {recommendations}")
                    return False
                
                # Check each recommendation has required fields including reference_image
                for i, rec in enumerate(recommendations):
                    if not isinstance(rec, dict):
                        self.log_test("AI Scan V2 Recommendation Structure", False, f"Recommendation {i} is not an object: {rec}")
                        return False
                    
                    required_rec_fields = ["name", "description", "reference_image"]
                    missing_rec_fields = [field for field in required_rec_fields if field not in rec]
                    
                    if missing_rec_fields:
                        self.log_test("AI Scan V2 Recommendation Fields", False, f"Recommendation {i} missing fields: {missing_rec_fields}")
                        return False
                    
                    # Validate reference_image is a URL
                    ref_image = rec.get("reference_image")
                    if not ref_image or not isinstance(ref_image, str) or not ref_image.startswith("http"):
                        self.log_test("AI Scan V2 Reference Image", False, f"Invalid reference_image in recommendation {i}: {ref_image}")
                        return False
                
                self.log_test("AI Scan V2 Endpoint Success", True, 
                    f"Face shape: {data.get('face_shape')}, Recommendations with reference images: {len(recommendations)}")
                return True
                
            else:
                self.log_test("AI Scan V2 HTTP Response", False, f"HTTP {response.status_code}: {response.text}")
                return False
                
        except Exception as e:
            self.log_test("AI Scan V2 Endpoint", False, f"Request error: {str(e)}")
            return False

    def test_generate_haircut_image_endpoint(self, test_image_base64: str):
        """Test Generate Haircut Image endpoint"""
        try:
            request_data = {
                "user_image_base64": test_image_base64,
                "haircut_style": "fade"
            }
            
            print("🎨 Testing Generate Haircut Image endpoint (may take up to 60 seconds)...")
            
            response = self.session.post(
                f"{self.base_url}/generate-haircut-image",
                json=request_data,
                headers={"Content-Type": "application/json"},
                timeout=90  # Extended timeout as specified in review request
            )
            
            print(f"Response status: {response.status_code}")
            
            if response.status_code == 200:
                data = response.json()
                print(f"Response keys: {list(data.keys())}")
                
                # Validate response structure
                required_fields = ["success", "generated_image_base64", "style_applied"]
                missing_fields = [field for field in required_fields if field not in data]
                
                if missing_fields:
                    self.log_test("Generate Haircut Image Response Structure", False, f"Missing fields: {missing_fields}")
                    return False
                
                # Check success field
                if not data.get("success"):
                    error_msg = data.get("error", "Unknown error")
                    self.log_test("Generate Haircut Image Success", False, f"API returned success=false: {error_msg}")
                    return False
                
                # Validate generated_image_base64
                generated_image = data.get("generated_image_base64")
                if not generated_image or not isinstance(generated_image, str):
                    self.log_test("Generate Haircut Image Base64", False, f"Invalid generated_image_base64: {type(generated_image)}")
                    return False
                
                # Validate style_applied
                style_applied = data.get("style_applied")
                if not style_applied or style_applied != "fade":
                    self.log_test("Generate Haircut Image Style", False, f"Expected style 'fade', got: {style_applied}")
                    return False
                
                self.log_test("Generate Haircut Image Endpoint Success", True, 
                    f"Generated image length: {len(generated_image)} chars, Style: {style_applied}")
                return True
                
            else:
                self.log_test("Generate Haircut Image HTTP Response", False, f"HTTP {response.status_code}: {response.text}")
                return False
                
        except Exception as e:
            self.log_test("Generate Haircut Image Endpoint", False, f"Request error: {str(e)}")
            return False

    def run_all_tests(self):
        """Run all backend tests"""
        print("🚀 Starting Backend API Tests for Barbershop Management App")
        print(f"🔗 Testing against: {self.base_url}")
        print("=" * 80)
        
        # Test 1: API accessibility
        api_accessible = self.test_api_root()
        
        if not api_accessible:
            print("❌ API not accessible. Stopping tests.")
            return False
        
        # Test 2: Download test image
        test_image = self.download_test_image()
        if not test_image:
            print("❌ Could not get test image. Stopping AI scan tests.")
            return False
        
        # Test 3: AI Scan with valid data
        ai_scan_success = self.test_ai_scan_endpoint_success(test_image)
        
        # Test 4: AI Scan with invalid data
        self.test_ai_scan_endpoint_invalid_data()
        
        # Test 5: AI Scan history
        self.test_ai_scan_history_endpoint()
        
        # Summary
        print("=" * 80)
        print("📊 TEST SUMMARY")
        print("=" * 80)
        
        passed = sum(1 for result in self.test_results if result["success"])
        total = len(self.test_results)
        
        for result in self.test_results:
            print(f"{result['status']}: {result['test']}")
            if result['details']:
                print(f"   {result['details']}")
        
        print(f"\n🎯 Results: {passed}/{total} tests passed")
        
        if ai_scan_success:
            print("✅ AI Scan endpoint is working correctly!")
            return True
        else:
            print("❌ AI Scan endpoint has issues!")
            return False

def main():
    """Main test runner"""
    tester = BackendTester()
    success = tester.run_all_tests()
    
    # Exit with appropriate code
    sys.exit(0 if success else 1)

if __name__ == "__main__":
    main()