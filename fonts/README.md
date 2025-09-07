# Fonts Directory

This directory contains font files for PDF generation.

## Korean Fonts

For proper Korean text rendering in PDFs, we need to include Korean fonts in the project.

### Recommended Fonts

1. **Noto Sans KR** - Google's open-source font with excellent Korean support
   - Download from: https://fonts.google.com/noto/specimen/Noto+Sans+KR
   - License: OFL (Open Font License)

2. **Nanum Gothic** - Naver's open-source Korean font
   - Download from: https://hangeul.naver.com/font
   - License: OFL

### Installation

1. Download the font files (.ttf or .otf)
2. Place them in this directory
3. Update the PDF generation service to use these fonts

### Usage in PDFKit

```javascript
const fontPath = path.join(__dirname, '../../fonts/NotoSansKR-Regular.ttf');
if (fs.existsSync(fontPath)) {
  doc.registerFont('Korean', fontPath);
  doc.font('Korean');
}
```

### For Vercel Deployment

Fonts in this directory will be included in the deployment package and accessible at runtime.