#!/usr/bin/env python3
"""
Backend API Testing Script for BarberSuite
Tests the authentication and navigation flow
"""

import requests
import json
import sys
from typing import Dict, Any, List

# Backend URL from the review request
BACKEND_URL = "https://barbersuite.preview.emergentagent.com"

def test_user_endpoint_specific():
    """
    Test the specific user endpoint for email: borresp2000@gmail.com
    Expected behavior:
    - Endpoint should return ONLY one user
    - User should have email: borresp2000@gmail.com
    - User should have role: client
    - User should have user_id: user_6110f9b5f90c
    """
    print("=" * 60)
    print("TESTING USER ENDPOINT FOR SPECIFIC EMAIL")
    print("=" * 60)
    
    email = "borresp2000@gmail.com"
    expected_user_id = "user_6110f9b5f90c"
    expected_role = "client"
    
    try:
        # Test the endpoint
        url = f"{BACKEND_URL}/api/users"
        params = {"email": email}
        
        print(f"Testing: GET {url}?email={email}")
        response = requests.get(url, params=params, timeout=30)
        
        print(f"Status Code: {response.status_code}")
        
        if response.status_code != 200:
            print(f"❌ FAILED: Expected status 200, got {response.status_code}")
            print(f"Response: {response.text}")
            return False
            
        # Parse response
        try:
            users = response.json()
        except json.JSONDecodeError as e:
            print(f"❌ FAILED: Invalid JSON response: {e}")
            print(f"Response text: {response.text}")
            return False
            
        print(f"Response: {json.dumps(users, indent=2)}")
        
        # Verify it's a list
        if not isinstance(users, list):
            print(f"❌ FAILED: Expected list response, got {type(users)}")
            return False
            
        # Verify exactly one user
        if len(users) != 1:
            print(f"❌ FAILED: Expected exactly 1 user, got {len(users)} users")
            return False
            
        user = users[0]
        
        # Verify user structure
        if not isinstance(user, dict):
            print(f"❌ FAILED: Expected user to be dict, got {type(user)}")
            return False
            
        # Verify email
        if user.get("email") != email:
            print(f"❌ FAILED: Expected email '{email}', got '{user.get('email')}'")
            return False
            
        # Verify role
        if user.get("role") != expected_role:
            print(f"❌ FAILED: Expected role '{expected_role}', got '{user.get('role')}'")
            return False
            
        # Verify user_id
        if user.get("user_id") != expected_user_id:
            print(f"❌ FAILED: Expected user_id '{expected_user_id}', got '{user.get('user_id')}'")
            return False
            
        print("✅ SUCCESS: All validations passed!")
        print(f"   - Found exactly 1 user")
        print(f"   - Email: {user.get('email')}")
        print(f"   - Role: {user.get('role')}")
        print(f"   - User ID: {user.get('user_id')}")
        
        return True
        
    except requests.exceptions.RequestException as e:
        print(f"❌ FAILED: Network error: {e}")
        return False
    except Exception as e:
        print(f"❌ FAILED: Unexpected error: {e}")
        return False

def test_api_health():
    """Test if the API is running and accessible"""
    print("=" * 60)
    print("TESTING API HEALTH")
    print("=" * 60)
    
    try:
        url = f"{BACKEND_URL}/api/"
        print(f"Testing: GET {url}")
        response = requests.get(url, timeout=10)
        
        print(f"Status Code: {response.status_code}")
        
        if response.status_code == 200:
            try:
                data = response.json()
                print(f"Response: {json.dumps(data, indent=2)}")
                print("✅ API is healthy and accessible")
                return True
            except:
                print(f"Response: {response.text}")
                print("✅ API is accessible but response is not JSON")
                return True
        else:
            print(f"❌ API health check failed with status {response.status_code}")
            print(f"Response: {response.text}")
            return False
            
    except requests.exceptions.RequestException as e:
        print(f"❌ API is not accessible: {e}")
        return False

def main():
    """Run all tests"""
    print("BARBERSUITE BACKEND API TESTING")
    print("Testing authentication and navigation flow")
    print(f"Backend URL: {BACKEND_URL}")
    print()
    
    results = []
    
    # Test API health first
    health_result = test_api_health()
    results.append(("API Health", health_result))
    
    print()
    
    # Test specific user endpoint
    user_result = test_user_endpoint_specific()
    results.append(("User Endpoint (borresp2000@gmail.com)", user_result))
    
    # Summary
    print()
    print("=" * 60)
    print("TEST SUMMARY")
    print("=" * 60)
    
    all_passed = True
    for test_name, result in results:
        status = "✅ PASS" if result else "❌ FAIL"
        print(f"{test_name}: {status}")
        if not result:
            all_passed = False
    
    print()
    if all_passed:
        print("🎉 ALL TESTS PASSED!")
        sys.exit(0)
    else:
        print("💥 SOME TESTS FAILED!")
        sys.exit(1)

if __name__ == "__main__":
    main()