export function TestComponent() {
  return (
    <div className="p-8 text-center">
      <div className="text-lg font-medium text-gray-900 mb-2">🔍 테스트 컴포넌트</div>
      <div className="text-gray-600">React 애플리케이션이 정상적으로 작동하고 있습니다!</div>
      <div className="mt-4 p-4 bg-yellow-50 border border-yellow-200 rounded">
        <div className="text-sm">이 메시지가 보인다면 React 렌더링이 정상입니다.</div>
      </div>
    </div>
  );
}