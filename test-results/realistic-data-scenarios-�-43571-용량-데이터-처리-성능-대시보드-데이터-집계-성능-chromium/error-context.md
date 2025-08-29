# Page snapshot

```yaml
- generic [ref=e2]:
  - region "Notifications (F8)":
    - list
  - generic [ref=e4]:
    - generic [ref=e5]:
      - img [ref=e7]
      - heading "발주 관리 시스템" [level=1] [ref=e11]
      - paragraph [ref=e12]: 계정에 로그인하여 시스템을 이용하세요
    - generic [ref=e13]:
      - generic [ref=e15]: 로그인
      - generic [ref=e17]:
        - generic [ref=e18]:
          - generic [ref=e19]: 이메일
          - textbox "이메일" [ref=e20]
        - generic [ref=e21]:
          - generic [ref=e22]: 비밀번호
          - generic [ref=e23]:
            - textbox "비밀번호를 입력하세요" [ref=e24]
            - button [ref=e25] [cursor=pointer]:
              - img
        - button "로그인" [ref=e26] [cursor=pointer]:
          - generic [ref=e27] [cursor=pointer]:
            - img
            - text: 로그인
    - generic [ref=e28]:
      - paragraph [ref=e29]: "기본 로그인 정보:"
      - generic [ref=e30]:
        - generic [ref=e31]:
          - generic [ref=e32]: "이메일: admin@company.com"
          - button "이메일 복사" [ref=e33] [cursor=pointer]:
            - img [ref=e34] [cursor=pointer]
        - generic [ref=e37]:
          - generic [ref=e38]: "비밀번호: admin123"
          - button "비밀번호 복사" [ref=e39] [cursor=pointer]:
            - img [ref=e40] [cursor=pointer]
```