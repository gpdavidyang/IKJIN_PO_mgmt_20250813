#!/usr/bin/env python3

import sys
import os
import requests
import json

# PO Template 시스템 테스트 스크립트

def test_po_template_system():
    base_url = "http://localhost:3000/api/po-template"
    
    print("=== PO Template 시스템 테스트 ===")
    
    # 1. Mock DB 상태 확인
    print("\n1. Mock DB 상태 확인...")
    try:
        response = requests.get(f"{base_url}/db-stats")
        if response.status_code == 200:
            data = response.json()
            print(f"✅ Mock DB 상태: {data['data']['stats']}")
        else:
            print(f"❌ Mock DB 상태 확인 실패: {response.status_code}")
    except Exception as e:
        print(f"❌ 연결 실패: {e}")
        return False
    
    # 2. PO Template 파일 업로드
    print("\n2. PO Template 파일 업로드...")
    file_path = "PO_Template01__Ext_20250716_2.xlsx"
    
    if not os.path.exists(file_path):
        print(f"❌ 파일을 찾을 수 없습니다: {file_path}")
        return False
    
    try:
        with open(file_path, 'rb') as f:
            files = {
                'file': (file_path, f, 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet')
            }
            response = requests.post(f"{base_url}/upload", files=files)
            
        if response.status_code == 200:
            data = response.json()
            print(f"✅ 파일 업로드 성공")
            print(f"   - 파일명: {data['data']['fileName']}")
            print(f"   - 총 발주서: {data['data']['totalOrders']}")
            print(f"   - 총 아이템: {data['data']['totalItems']}")
            
            # 파싱된 데이터 저장
            orders = data['data']['orders']
            file_path_uploaded = data['data']['filePath']
            
        else:
            print(f"❌ 파일 업로드 실패: {response.status_code}")
            print(f"   응답: {response.text}")
            return False
            
    except Exception as e:
        print(f"❌ 업로드 오류: {e}")
        return False
    
    # 3. Mock DB에 저장
    print("\n3. Mock DB에 저장...")
    try:
        save_data = {"orders": orders}
        response = requests.post(f"{base_url}/save", json=save_data)
        
        if response.status_code == 200:
            data = response.json()
            print(f"✅ DB 저장 성공")
            print(f"   - 저장된 발주서: {data['data']['savedOrders']}")
            print(f"   - DB 상태: {data['data']['dbStats']}")
        else:
            print(f"❌ DB 저장 실패: {response.status_code}")
            print(f"   응답: {response.text}")
            
    except Exception as e:
        print(f"❌ DB 저장 오류: {e}")
    
    # 4. 시트 추출
    print("\n4. 갑지/을지 시트 추출...")
    try:
        extract_data = {"filePath": file_path_uploaded}
        response = requests.post(f"{base_url}/extract-sheets", json=extract_data)
        
        if response.status_code == 200:
            data = response.json()
            print(f"✅ 시트 추출 성공")
            print(f"   - 추출된 시트: {data['data']['extractedSheets']}")
            print(f"   - 추출 파일: {data['data']['extractedPath']}")
        else:
            print(f"❌ 시트 추출 실패: {response.status_code}")
            print(f"   응답: {response.text}")
            
    except Exception as e:
        print(f"❌ 시트 추출 오류: {e}")
    
    # 5. 최종 DB 상태 확인
    print("\n5. 최종 DB 상태 확인...")
    try:
        response = requests.get(f"{base_url}/db-stats")
        if response.status_code == 200:
            data = response.json()
            print(f"✅ 최종 DB 상태: {data['data']['stats']}")
            
            # 샘플 데이터 출력
            sample_data = data['data']['sampleData']
            if sample_data['recentOrders']:
                print(f"\n📋 최근 발주서 예시:")
                for order in sample_data['recentOrders'][:2]:
                    print(f"   - {order['orderNumber']}: {order['totalAmount']}원")
                    
            if sample_data['recentItems']:
                print(f"\n📦 최근 아이템 예시:")
                for item in sample_data['recentItems'][:3]:
                    print(f"   - {item['itemName']}: {item['quantity']}개 x {item['unitPrice']}원")
                    
        else:
            print(f"❌ 최종 상태 확인 실패: {response.status_code}")
            
    except Exception as e:
        print(f"❌ 최종 상태 확인 오류: {e}")
    
    print("\n=== 테스트 완료 ===")
    return True

if __name__ == "__main__":
    success = test_po_template_system()
    sys.exit(0 if success else 1)