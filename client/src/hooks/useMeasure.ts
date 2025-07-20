import { useCallback, useLayoutEffect, useState } from 'react';

export interface Dimensions {
  width: number;
  height: number;
  top: number;
  left: number;
  bottom: number;
  right: number;
  x: number;
  y: number;
}

export function useMeasure(): [
  (node: HTMLElement | null) => void,
  Dimensions,
  HTMLElement | null
] {
  const [dimensions, setDimensions] = useState<Dimensions>({
    width: 0,
    height: 0,
    top: 0,
    left: 0,
    bottom: 0,
    right: 0,
    x: 0,
    y: 0,
  });
  const [node, setNode] = useState<HTMLElement | null>(null);

  const ref = useCallback((node: HTMLElement | null) => {
    setNode(node);
  }, []);

  useLayoutEffect(() => {
    if (!node) return;

    const measure = () => {
      if (node) {
        const rect = node.getBoundingClientRect();
        setDimensions({
          width: rect.width,
          height: rect.height,
          top: rect.top,
          left: rect.left,
          bottom: rect.bottom,
          right: rect.right,
          x: rect.x,
          y: rect.y,
        });
      }
    };

    measure();

    // ResizeObserver를 사용하여 크기 변화 감지
    if (typeof ResizeObserver !== 'undefined') {
      const resizeObserver = new ResizeObserver(measure);
      resizeObserver.observe(node);
      
      return () => {
        resizeObserver.disconnect();
      };
    } else {
      // ResizeObserver가 지원되지 않는 경우 window resize 이벤트 사용
      window.addEventListener('resize', measure);
      return () => {
        window.removeEventListener('resize', measure);
      };
    }
  }, [node]);

  return [ref, dimensions, node];
}