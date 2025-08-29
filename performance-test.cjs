// 간단한 성능 테스트 스크립트
const { chromium } = require('playwright');

async function performanceTest() {
  const browser = await chromium.launch();
  const context = await browser.newContext();
  const page = await context.newPage();

  console.log('🚀 성능 테스트 시작...\n');

  // 메트릭 수집 활성화
  await page.addInitScript(() => {
    window.performanceMetrics = [];
  });

  // 홈페이지 로드 성능
  console.log('📊 홈페이지 로드 성능 측정');
  const startTime = Date.now();
  await page.goto('http://localhost:3000');
  const loadTime = Date.now() - startTime;
  console.log(`   ✅ 페이지 로드 시간: ${loadTime}ms\n`);

  // Core Web Vitals 측정
  const metrics = await page.evaluate(() => {
    return new Promise((resolve) => {
      if ('web-vital' in window) {
        resolve(window.webVitals);
      } else {
        // 기본 성능 메트릭 수집
        const navigation = performance.getEntriesByType('navigation')[0];
        resolve({
          domContentLoaded: navigation.domContentLoadedEventEnd - navigation.domContentLoadedEventStart,
          loadComplete: navigation.loadEventEnd - navigation.loadEventStart,
          firstPaint: performance.getEntriesByName('first-paint')[0]?.startTime || 0,
          firstContentfulPaint: performance.getEntriesByName('first-contentful-paint')[0]?.startTime || 0
        });
      }
    });
  });

  console.log('📈 성능 메트릭:');
  console.log(`   • DOM Content Loaded: ${metrics.domContentLoaded || 'N/A'}ms`);
  console.log(`   • Load Complete: ${metrics.loadComplete || 'N/A'}ms`);
  console.log(`   • First Paint: ${metrics.firstPaint || 'N/A'}ms`);
  console.log(`   • First Contentful Paint: ${metrics.firstContentfulPaint || 'N/A'}ms\n`);

  // 메모리 사용량 측정
  const memoryInfo = await page.evaluate(() => {
    if ('memory' in performance) {
      return {
        usedJSHeapSize: performance.memory.usedJSHeapSize,
        totalJSHeapSize: performance.memory.totalJSHeapSize,
        jsHeapSizeLimit: performance.memory.jsHeapSizeLimit
      };
    }
    return null;
  });

  if (memoryInfo) {
    console.log('💾 메모리 사용량:');
    console.log(`   • 사용된 JS Heap: ${(memoryInfo.usedJSHeapSize / 1024 / 1024).toFixed(2)} MB`);
    console.log(`   • 전체 JS Heap: ${(memoryInfo.totalJSHeapSize / 1024 / 1024).toFixed(2)} MB`);
    console.log(`   • JS Heap 제한: ${(memoryInfo.jsHeapSizeLimit / 1024 / 1024).toFixed(2)} MB\n`);
  }

  // 네트워크 리소스 분석
  const resources = await page.evaluate(() => {
    const entries = performance.getEntriesByType('resource');
    const analysis = {
      total: entries.length,
      totalSize: 0,
      types: {},
      slowest: null,
      averageLoadTime: 0
    };

    let totalLoadTime = 0;
    let maxLoadTime = 0;

    entries.forEach(entry => {
      const loadTime = entry.responseEnd - entry.requestStart;
      totalLoadTime += loadTime;

      if (loadTime > maxLoadTime) {
        maxLoadTime = loadTime;
        analysis.slowest = {
          name: entry.name,
          duration: loadTime
        };
      }

      const type = entry.name.split('.').pop() || 'other';
      analysis.types[type] = (analysis.types[type] || 0) + 1;

      if (entry.transferSize) {
        analysis.totalSize += entry.transferSize;
      }
    });

    analysis.averageLoadTime = totalLoadTime / entries.length;
    return analysis;
  });

  console.log('🌐 네트워크 리소스 분석:');
  console.log(`   • 총 리소스 수: ${resources.total}`);
  console.log(`   • 총 전송 크기: ${(resources.totalSize / 1024).toFixed(2)} KB`);
  console.log(`   • 평균 로드 시간: ${resources.averageLoadTime.toFixed(2)}ms`);
  if (resources.slowest) {
    console.log(`   • 가장 느린 리소스: ${resources.slowest.name} (${resources.slowest.duration.toFixed(2)}ms)`);
  }
  console.log(`   • 리소스 유형 분포:`, resources.types);

  await browser.close();
  
  console.log('\n✅ 성능 테스트 완료');
}

performanceTest().catch(console.error);