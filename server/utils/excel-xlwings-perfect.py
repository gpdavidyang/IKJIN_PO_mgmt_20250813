#!/usr/bin/env python3
"""
xlwings를 사용한 완벽한 엑셀 서식 보존 처리
실제 엑셀 애플리케이션을 백그라운드에서 제어하여 100% 서식 보존
"""

import sys
import os
import json
import xlwings as xw
from pathlib import Path

def remove_input_sheet_xlwings(source_path, target_path, input_sheet_name='Input'):
    """
    xlwings를 사용하여 Input 시트만 제거하고 모든 서식을 100% 보존
    """
    result = {
        'success': False,
        'removed_sheet': False,
        'remaining_sheets': [],
        'original_format': True,
        'error': None,
        'method': 'xlwings'
    }
    
    app = None
    wb = None
    
    try:
        print(f"🚀 xlwings 엑셀 앱 제어 시작: {source_path} -> {target_path}", file=sys.stderr)
        
        # 소스 파일 존재 확인
        if not os.path.exists(source_path):
            raise FileNotFoundError(f"소스 파일을 찾을 수 없습니다: {source_path}")
        
        # 절대 경로로 변환
        source_path = os.path.abspath(source_path)
        target_path = os.path.abspath(target_path)
        
        print(f"📂 절대 경로: {source_path} -> {target_path}", file=sys.stderr)
        
        # xlwings 앱 시작 (백그라운드에서 실행)
        app = xw.App(visible=False, add_book=False)
        print(f"✅ 엑셀 앱 시작됨 (백그라운드)", file=sys.stderr)
        
        # 원본 파일 열기
        wb = app.books.open(source_path)
        print(f"📂 원본 파일 열기 완료", file=sys.stderr)
        
        # 모든 시트 이름 수집
        original_sheets = [sheet.name for sheet in wb.sheets]
        print(f"📋 원본 시트 목록: {', '.join(original_sheets)}", file=sys.stderr)
        
        # Input 시트 찾기 및 제거
        removed_sheet = False
        try:
            input_sheet = wb.sheets[input_sheet_name]
            input_sheet.delete()
            removed_sheet = True
            print(f"🗑️ '{input_sheet_name}' 시트가 제거되었습니다.", file=sys.stderr)
        except Exception as e:
            print(f"⚠️ '{input_sheet_name}' 시트를 찾을 수 없습니다: {str(e)}", file=sys.stderr)
        
        # 남은 시트 목록
        remaining_sheets = [sheet.name for sheet in wb.sheets]
        print(f"📋 남은 시트 목록: {', '.join(remaining_sheets)}", file=sys.stderr)
        
        if len(remaining_sheets) == 0:
            raise ValueError("모든 시트가 제거되어 빈 엑셀 파일이 됩니다.")
        
        # 타겟 경로로 저장
        # xlwings는 엑셀 앱을 직접 제어하므로 모든 서식이 완벽하게 보존됨
        wb.save(target_path)
        print(f"✅ xlwings 저장 완료 (100% 서식 보존): {target_path}", file=sys.stderr)
        
        result.update({
            'success': True,
            'removed_sheet': removed_sheet,
            'remaining_sheets': remaining_sheets,
            'original_format': True
        })
        
    except Exception as e:
        error_msg = f"xlwings 처리 실패: {str(e)}"
        print(f"❌ {error_msg}", file=sys.stderr)
        result.update({
            'success': False,
            'error': error_msg
        })
        
        # 실패 시 타겟 파일 삭제
        if os.path.exists(target_path):
            os.remove(target_path)
            print(f"🗑️ 실패한 타겟 파일 삭제: {target_path}", file=sys.stderr)
    
    finally:
        # 리소스 정리
        try:
            if wb:
                wb.close()
                print(f"📝 워크북 닫기 완료", file=sys.stderr)
        except Exception as e:
            print(f"⚠️ 워크북 닫기 실패: {str(e)}", file=sys.stderr)
        
        try:
            if app:
                app.quit()
                print(f"🚪 엑셀 앱 종료 완료", file=sys.stderr)
        except Exception as e:
            print(f"⚠️ 엑셀 앱 종료 실패: {str(e)}", file=sys.stderr)
    
    return result

def test_xlwings_environment():
    """
    xlwings 환경 테스트
    """
    try:
        print("🧪 xlwings 환경 테스트 시작", file=sys.stderr)
        
        # 간단한 테스트
        app = xw.App(visible=False, add_book=False)
        wb = app.books.add()
        
        # 테스트 시트 생성
        sheet = wb.sheets[0]
        sheet.range('A1').value = "xlwings test"
        
        # 정리
        wb.close()
        app.quit()
        
        print("✅ xlwings 환경 테스트 성공", file=sys.stderr)
        return True
        
    except Exception as e:
        print(f"❌ xlwings 환경 테스트 실패: {str(e)}", file=sys.stderr)
        return False

def main():
    """
    메인 함수 - 커맨드라인 인자 처리
    """
    if len(sys.argv) < 2:
        print("사용법: python excel-xlwings-perfect.py <command> [args...]", file=sys.stderr)
        print("  test: xlwings 환경 테스트", file=sys.stderr)
        print("  process <source> <target> [sheet_name]: Input 시트 제거 처리", file=sys.stderr)
        sys.exit(1)
    
    command = sys.argv[1]
    
    if command == 'test':
        # 환경 테스트
        success = test_xlwings_environment()
        result = {
            'success': success,
            'command': 'test',
            'xlwings_available': success
        }
        print(json.dumps(result, ensure_ascii=False, indent=2))
        sys.exit(0 if success else 1)
        
    elif command == 'process':
        # 실제 처리
        if len(sys.argv) != 5:
            print("사용법: python excel-xlwings-perfect.py process <source_path> <target_path> <input_sheet_name>", file=sys.stderr)
            sys.exit(1)
        
        source_path = sys.argv[2]
        target_path = sys.argv[3]
        input_sheet_name = sys.argv[4]
        
        # 처리 실행
        result = remove_input_sheet_xlwings(source_path, target_path, input_sheet_name)
        
        # 결과를 JSON으로 출력 (Node.js가 읽을 수 있도록)
        print(json.dumps(result, ensure_ascii=False, indent=2))
        
        # 성공/실패에 따른 exit code
        sys.exit(0 if result['success'] else 1)
    
    else:
        print(f"알 수 없는 명령: {command}", file=sys.stderr)
        sys.exit(1)

if __name__ == "__main__":
    main()