#!/usr/bin/env node

/**
 * Bundle Analysis Script
 * Analyzes the production build and provides optimization recommendations
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

// Colors for console output
const colors = {
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  cyan: '\x1b[36m',
  reset: '\x1b[0m',
  bold: '\x1b[1m'
};

function colorize(text, color) {
  return `${colors[color]}${text}${colors.reset}`;
}

function analyzeBuildDirectory() {
  const buildDir = path.join(__dirname, '../dist/public');
  
  if (!fs.existsSync(buildDir)) {
    console.log(colorize('❌ Build directory not found. Run "npm run build" first.', 'red'));
    process.exit(1);
  }

  console.log(colorize('📊 Analyzing Bundle Size...', 'bold'));
  console.log('');

  const assetsDir = path.join(buildDir, 'assets');
  
  if (!fs.existsSync(assetsDir)) {
    console.log(colorize('❌ Assets directory not found in build.', 'red'));
    process.exit(1);
  }

  const jsFiles = [];
  const cssFiles = [];
  const otherFiles = [];

  function scanDirectory(dir, relativePath = '') {
    const files = fs.readdirSync(dir);
    
    files.forEach(file => {
      const filePath = path.join(dir, file);
      const relativeFilePath = path.join(relativePath, file);
      const stats = fs.statSync(filePath);
      
      if (stats.isDirectory()) {
        scanDirectory(filePath, relativeFilePath);
      } else {
        const fileInfo = {
          name: file,
          path: relativeFilePath,
          size: stats.size,
          type: path.extname(file).toLowerCase()
        };

        if (fileInfo.type === '.js') {
          jsFiles.push(fileInfo);
        } else if (fileInfo.type === '.css') {
          cssFiles.push(fileInfo);
        } else {
          otherFiles.push(fileInfo);
        }
      }
    });
  }

  scanDirectory(assetsDir);

  // Sort files by size (largest first)
  jsFiles.sort((a, b) => b.size - a.size);
  cssFiles.sort((a, b) => b.size - a.size);
  otherFiles.sort((a, b) => b.size - a.size);

  // Calculate totals
  const totalJS = jsFiles.reduce((sum, file) => sum + file.size, 0);
  const totalCSS = cssFiles.reduce((sum, file) => sum + file.size, 0);
  const totalOther = otherFiles.reduce((sum, file) => sum + file.size, 0);
  const totalSize = totalJS + totalCSS + totalOther;

  console.log(colorize('📈 Bundle Size Summary', 'bold'));
  console.log('─'.repeat(50));
  console.log(`${colorize('JavaScript:', 'blue')} ${formatBytes(totalJS)} (${jsFiles.length} files)`);
  console.log(`${colorize('CSS:', 'green')} ${formatBytes(totalCSS)} (${cssFiles.length} files)`);
  console.log(`${colorize('Other:', 'yellow')} ${formatBytes(totalOther)} (${otherFiles.length} files)`);
  console.log('─'.repeat(50));
  console.log(`${colorize('Total:', 'bold')} ${formatBytes(totalSize)}`);
  console.log('');

  // Analyze JavaScript files
  if (jsFiles.length > 0) {
    console.log(colorize('🔍 JavaScript Bundle Analysis', 'bold'));
    console.log('─'.repeat(50));
    
    jsFiles.slice(0, 10).forEach((file, index) => {
      const percentage = ((file.size / totalJS) * 100).toFixed(1);
      const icon = getFileIcon(file.name);
      console.log(`${index + 1}.  ${icon} ${file.name}`);
      console.log(`    ${formatBytes(file.size)} (${percentage}% of JS bundle)`);
    });
    
    if (jsFiles.length > 10) {
      console.log(`    ... and ${jsFiles.length - 10} more files`);
    }
    console.log('');
  }

  // Performance recommendations
  console.log(colorize('💡 Optimization Recommendations', 'bold'));
  console.log('─'.repeat(50));
  
  const recommendations = generateRecommendations({
    jsFiles,
    cssFiles,
    totalSize,
    totalJS,
    totalCSS
  });
  
  recommendations.forEach((rec, index) => {
    console.log(`${index + 1}. ${rec}`);
  });
  
  console.log('');
  
  // Bundle health score
  const healthScore = calculateHealthScore({
    totalSize,
    totalJS,
    jsFileCount: jsFiles.length,
    largestJS: jsFiles[0]?.size || 0
  });
  
  console.log(colorize('🏥 Bundle Health Score', 'bold'));
  console.log('─'.repeat(50));
  console.log(`Score: ${getHealthScoreDisplay(healthScore)}/100`);
  console.log(getHealthScoreMessage(healthScore));
  console.log('');
}

function getFileIcon(filename) {
  if (filename.includes('vendor') || filename.includes('react')) return '📚';
  if (filename.includes('chunk')) return '🧩';
  if (filename.includes('main') || filename.includes('index')) return '🏠';
  if (filename.includes('chart')) return '📊';
  if (filename.includes('form')) return '📝';
  return '📦';
}

function generateRecommendations({ jsFiles, totalSize, totalJS, jsFileCount }) {
  const recommendations = [];
  
  // Size-based recommendations
  if (totalSize > 2000000) { // > 2MB
    recommendations.push(colorize('🚨 Bundle is very large (>2MB). Consider aggressive code splitting.', 'red'));
  } else if (totalSize > 1000000) { // > 1MB
    recommendations.push(colorize('⚠️ Bundle is large (>1MB). Review and optimize heavy dependencies.', 'yellow'));
  }
  
  // JavaScript-specific recommendations
  if (totalJS > 800000) { // > 800KB
    recommendations.push(colorize('📦 JavaScript bundle is large. Consider lazy loading and tree shaking.', 'yellow'));
  }
  
  // File count recommendations
  if (jsFileCount > 20) {
    recommendations.push(colorize('📂 Many JavaScript files. Consider consolidating smaller chunks.', 'yellow'));
  } else if (jsFileCount < 3) {
    recommendations.push(colorize('🔄 Consider splitting large chunks for better caching.', 'blue'));
  }
  
  // Specific file recommendations
  const largestFile = jsFiles[0];
  if (largestFile && largestFile.size > 500000) { // > 500KB
    recommendations.push(colorize(`✂️ Largest file (${largestFile.name}) is ${formatBytes(largestFile.size)}. Consider splitting.`, 'yellow'));
  }
  
  // Vendor chunk analysis
  const vendorFiles = jsFiles.filter(file => file.name.includes('vendor'));
  if (vendorFiles.length > 3) {
    recommendations.push(colorize('📚 Multiple vendor chunks detected. Review vendor splitting strategy.', 'blue'));
  }
  
  // Best practices
  recommendations.push(colorize('✅ Enable gzip/brotli compression on your server.', 'green'));
  recommendations.push(colorize('🔄 Implement service worker for caching strategies.', 'green'));
  recommendations.push(colorize('⚡ Consider preloading critical chunks.', 'green'));
  
  return recommendations;
}

function calculateHealthScore({ totalSize, totalJS, jsFileCount, largestJS }) {
  let score = 100;
  
  // Deduct points for large bundle size
  if (totalSize > 2000000) score -= 30; // -30 for >2MB
  else if (totalSize > 1000000) score -= 15; // -15 for >1MB
  else if (totalSize > 500000) score -= 5; // -5 for >500KB
  
  // Deduct points for large JS bundle
  if (totalJS > 800000) score -= 20; // -20 for >800KB JS
  else if (totalJS > 500000) score -= 10; // -10 for >500KB JS
  
  // Deduct points for too many or too few chunks
  if (jsFileCount > 20) score -= 10; // -10 for too many files
  else if (jsFileCount < 2) score -= 15; // -15 for no code splitting
  
  // Deduct points for very large individual files
  if (largestJS > 500000) score -= 15; // -15 for >500KB single file
  
  return Math.max(0, score);
}

function getHealthScoreDisplay(score) {
  if (score >= 90) return colorize(score, 'green');
  if (score >= 70) return colorize(score, 'yellow');
  return colorize(score, 'red');
}

function getHealthScoreMessage(score) {
  if (score >= 90) return colorize('Excellent! Your bundle is well optimized.', 'green');
  if (score >= 70) return colorize('Good, but there\'s room for improvement.', 'yellow');
  if (score >= 50) return colorize('Needs optimization. Review the recommendations above.', 'yellow');
  return colorize('Poor bundle health. Immediate optimization required.', 'red');
}

function formatBytes(bytes) {
  if (bytes === 0) return '0 B';
  
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(1))} ${sizes[i]}`;
}

// Run the analysis
if (require.main === module) {
  analyzeBuildDirectory();
}

module.exports = { analyzeBuildDirectory };