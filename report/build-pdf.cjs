const path = require('path');
const fs = require('fs');
const { execSync } = require('child_process');
const { chromium } = require('playwright');

async function buildReportPdf() {
  console.log('=== DriftJS Project Report Build Pipeline ===');

  const reportDir = __dirname;
  const frontMatterHtmlPath = path.join(reportDir, 'front-matter.html');
  const chaptersHtmlPath = path.join(reportDir, 'chapters.html');

  const frontMatterPdf = path.join(reportDir, 'front-matter.pdf');
  const chaptersPdf = path.join(reportDir, 'chapters.pdf');
  const finalPdf = path.join(reportDir, 'DriftJS_Final_Project_Report.pdf');

  const browser = await chromium.launch();
  const page = await browser.newPage();

  // Step 1: Render Chapters first to determine exact physical pagination
  console.log('Step 1: Rendering Chapters (1.0 to 8.0)...');
  await page.goto('file://' + chaptersHtmlPath, { waitUntil: 'networkidle' });
  await page.pdf({
    path: chaptersPdf,
    format: 'A4',
    margin: {
      top: '1.0in',
      bottom: '1.0in',
      left: '1.2in',
      right: '1.0in'
    },
    displayHeaderFooter: true,
    headerTemplate: `
      <div style="font-family: 'Times New Roman', serif; font-size: 9.5pt; width: 100%; text-align: right; margin-right: 1.0in; box-sizing: border-box; color: #333333;">
        DRIFTJS: A REGISTER-BASED VIRTUAL MACHINE FOR WEB USER INTERFACES
      </div>
    `,
    footerTemplate: `
      <div style="font-family: 'Times New Roman', serif; font-size: 10pt; width: 100%; text-align: right; margin-right: 1.0in; box-sizing: border-box; color: #000000;">
        <span class="pageNumber"></span>
      </div>
    `,
    printBackground: true
  });

  // Step 2: Extract real page numbers from chapters.pdf using Python pypdf
  console.log('Step 2: Extracting exact page numbers from chapters.pdf...');
  const extractScript = `
import pypdf, json

reader = pypdf.PdfReader('${chaptersPdf}')
exact_headers = [
    ('1.0', '1.0 INTRODUCTION'),
    ('1.1', '1.1 OVERVIEW OF PROPOSED SYSTEM'),
    ('1.2', '1.2 PROBLEM STATEMENT'),
    ('1.3', '1.3 OBJECTIVES'),
    ('1.4', '1.4 SCOPE OF THE PROJECT'),
    ('1.5', '1.5 LIMITATIONS'),
    ('1.6', '1.6 TECHNICAL REQUIREMENTS AND TECHNOLOGIES USED'),
    ('2.0', '2.0 SYSTEM REQUIREMENTS SPECIFICATION'),
    ('2.1', '2.1 USER CHARACTERISTICS'),
    ('2.2', '2.2 FUNCTIONAL REQUIREMENTS'),
    ('2.3', '2.3 NON-FUNCTIONAL REQUIREMENTS'),
    ('3.0', '3.0 SYSTEM ANALYSIS AND DESIGN'),
    ('3.1', '3.1 USER-BASED MODELING'),
    ('3.2', '3.2 SYSTEM ARCHITECTURE'),
    ('3.3', '3.3 DATA MODELING'),
    ('4.0', '4.0 USER INTERFACE DESIGN'),
    ('4.1', '4.1 UI/UX DESIGN'),
    ('4.2', '4.2 NAVIGATION AND SCREEN FLOW'),
    ('5.0', '5.0 IMPLEMENTATION'),
    ('5.1', '5.1 DEVELOPMENT ENVIRONMENT'),
    ('5.2', '5.2 MODULE-WISE IMPLEMENTATION'),
    ('5.3', '5.3 IMPORTANT SOURCE CODE'),
    ('5.4', '5.4 AI/ML MODEL IMPLEMENTATION'),
    ('6.0', '6.0 TESTING AND RESULTS'),
    ('6.1', '6.1 TESTING STRATEGY'),
    ('6.2', '6.2 TEST CASES'),
    ('6.3', '6.3 RESULTS'),
    ('6.4', '6.4 PERFORMANCE EVALUATION'),
    ('7.0', '7.0 CONCLUSION AND FUTURE ENHANCEMENT'),
    ('7.1', '7.1 CONCLUSION'),
    ('7.2', '7.2 FUTURE ENHANCEMENT'),
    ('8.0', '8.0 REFERENCES')
]

results = {}
for idx, page in enumerate(reader.pages):
    pnum = idx + 1
    lines = [l.strip() for l in page.extract_text().split('\\n')]
    for code, title in exact_headers:
        if code not in results:
            for l in lines:
                if l.upper() == title.upper() or l.startswith(code + ' '):
                    results[code] = pnum
                    break

print(json.dumps(results))
`;

  const pageMapOutput = execSync(`python3 -c "${extractScript.replace(/"/g, '\\"')}"`).toString().trim();
  const pageMap = JSON.parse(pageMapOutput);
  console.log('Extracted Page Map:', pageMap);

  // Step 3: Update front-matter.html with exact extracted page numbers
  console.log('Step 3: Synchronizing Table of Contents in front-matter.html...');
  let frontMatterContent = fs.readFileSync(frontMatterHtmlPath, 'utf8');

  const tocEntries = [
    { code: '1.0', label: '1.0', title: '<strong>INTRODUCTION</strong>', isBold: true },
    { code: '1.1', label: '1.1', title: 'Overview of Proposed System' },
    { code: '1.2', label: '1.2', title: 'Problem Statement' },
    { code: '1.3', label: '1.3', title: 'Objectives' },
    { code: '1.4', label: '1.4', title: 'Scope of the Project' },
    { code: '1.5', label: '1.5', title: 'Limitations' },
    { code: '1.6', label: '1.6', title: 'Technical Requirements and Technologies Used' },
    { code: '2.0', label: '2.0', title: '<strong>SYSTEM REQUIREMENTS SPECIFICATION</strong>', isBold: true },
    { code: '2.1', label: '2.1', title: 'User Characteristics' },
    { code: '2.2', label: '2.2', title: 'Functional Requirements' },
    { code: '2.3', label: '2.3', title: 'Non-Functional Requirements' },
    { code: '3.0', label: '3.0', title: '<strong>SYSTEM ANALYSIS AND DESIGN</strong>', isBold: true },
    { code: '3.1', label: '3.1', title: 'User-Based Modeling' },
    { code: '3.2', label: '3.2', title: 'System Architecture' },
    { code: '3.3', label: '3.3', title: 'Data Modeling' },
    { code: '4.0', label: '4.0', title: '<strong>USER INTERFACE DESIGN</strong>', isBold: true },
    { code: '4.1', label: '4.1', title: 'UI/UX Design' },
    { code: '4.2', label: '4.2', title: 'Navigation and Screen Flow' },
    { code: '5.0', label: '5.0', title: '<strong>IMPLEMENTATION</strong>', isBold: true },
    { code: '5.1', label: '5.1', title: 'Development Environment' },
    { code: '5.2', label: '5.2', title: 'Module-Wise Implementation' },
    { code: '5.3', label: '5.3', title: 'Important Source Code' },
    { code: '5.4', label: '5.4', title: 'AI/ML Model Implementation' },
    { code: '6.0', label: '6.0', title: '<strong>TESTING AND RESULTS</strong>', isBold: true },
    { code: '6.1', label: '6.1', title: 'Testing Strategy' },
    { code: '6.2', label: '6.2', title: 'Test Cases' },
    { code: '6.3', label: '6.3', title: 'Results' },
    { code: '6.4', label: '6.4', title: 'Performance Evaluation' },
    { code: '7.0', label: '7.0', title: '<strong>CONCLUSION AND FUTURE ENHANCEMENT</strong>', isBold: true },
    { code: '7.1', label: '7.1', title: 'Conclusion' },
    { code: '7.2', label: '7.2', title: 'Future Enhancement' },
    { code: '8.0', label: '8.0', title: '<strong>REFERENCES</strong>', isBold: true }
  ];

  let tbodyRows = `
        <tr><td></td><td>Certificate</td><td style="text-align: right;">ii</td></tr>
        <tr><td></td><td>Acknowledgement</td><td style="text-align: right;">iii</td></tr>
        <tr><td></td><td>Project Abstract</td><td style="text-align: right;">v</td></tr>
`;

  for (const entry of tocEntries) {
    const pnum = pageMap[entry.code] || '-';
    if (entry.isBold) {
      tbodyRows += `        <tr><td><strong>${entry.label}</strong></td><td>${entry.title}</td><td style="text-align: right;"><strong>${pnum}</strong></td></tr>\n`;
    } else {
      tbodyRows += `        <tr><td>${entry.label}</td><td>${entry.title}</td><td style="text-align: right;">${pnum}</td></tr>\n`;
    }
  }

  // Replace toc-tbody content only
  frontMatterContent = frontMatterContent.replace(
    /<tbody id="toc-tbody">[\s\S]*?<\/tbody>/,
    `<tbody id="toc-tbody">\n${tbodyRows}      </tbody>`
  );

  fs.writeFileSync(frontMatterHtmlPath, frontMatterContent, 'utf8');

  // Step 4: Render Front Matter to PDF
  console.log('Step 4: Rendering Front Matter to PDF...');
  await page.goto('file://' + frontMatterHtmlPath, { waitUntil: 'networkidle' });
  await page.pdf({
    path: frontMatterPdf,
    format: 'A4',
    margin: {
      top: '1.0in',
      bottom: '1.0in',
      left: '1.2in',
      right: '1.0in'
    },
    displayHeaderFooter: false,
    printBackground: true
  });

  await browser.close();

  // Step 5: Merge with pdfunite
  console.log('Step 5: Merging Front Matter and Chapters into final PDF...');
  execSync(`pdfunite "${frontMatterPdf}" "${chaptersPdf}" "${finalPdf}"`);

  console.log('✓ SUCCESS: Created perfectly synchronized final report: ' + finalPdf);
}

buildReportPdf().catch(err => {
  console.error('Build failed:', err);
  process.exit(1);
});
