#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

// Utility to parse command line arguments
function parseArgs() {
  const args = process.argv.slice(2);
  const options = {
    input: null,
    outputDir: './out',
    format: 'mdx', // mdx or html
    template: null, // optional template file
  };

  for (let i = 0; i < args.length; i++) {
    if (args[i] === '--input' || args[i] === '-i') {
      options.input = args[++i];
    } else if (args[i] === '--output' || args[i] === '-o') {
      options.outputDir = args[++i];
    } else if (args[i] === '--format' || args[i] === '-f') {
      options.format = args[++i].toLowerCase();
    } else if (args[i] === '--template' || args[i] === '-t') {
      options.template = args[++i];
    }
  }

  return options;
}

// Generate an SEO-friendly slug
function generateSlug(str) {
  return str
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, '') // Remove non-word characters
    .replace(/[\s_-]+/g, '-') // Replace spaces and underscores with hyphens
    .replace(/^-+|-+$/g, ''); // Remove leading/trailing hyphens
}

// Ensure directory exists
function ensureDirSync(dirPath) {
  if (!fs.existsSync(dirPath)) {
    fs.mkdirSync(dirPath, { recursive: true });
  }
}

// Default HTML Template optimized for SEO
function defaultHtmlTemplate(data) {
  const title = `${data.keyword} in ${data.location} | Top Services`;
  const description = `Looking for the best ${data.keyword} in ${data.location}? We provide top-rated, professional services. Contact us today!`;
  
  return `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>${title}</title>
    <meta name="description" content="${description}">
    <link rel="canonical" href="https://example.com/${data.slug}">
    <meta property="og:title" content="${title}">
    <meta property="og:description" content="${description}">
    <meta property="og:type" content="article">
    <meta name="twitter:card" content="summary_large_image">
    <!-- Schema Markup -->
    <script type="application/ld+json">
    {
      "@context": "https://schema.org",
      "@type": "Service",
      "serviceType": "${data.keyword}",
      "areaServed": {
        "@type": "Place",
        "name": "${data.location}"
      },
      "provider": {
        "@type": "Organization",
        "name": "Your Company Name"
      }
    }
    </script>
</head>
<body>
    <header>
        <h1>Expert ${data.keyword} Services in ${data.location}</h1>
    </header>
    <main>
        <article>
            <section>
                <h2>Why Choose Us for ${data.keyword}?</h2>
                <p>When you need reliable <strong>${data.keyword}</strong> in <strong>${data.location}</strong>, you want a team you can trust. Our experienced professionals deliver high-quality results tailored to your specific needs.</p>
            </section>
            <section>
                <h2>Our Service Areas in ${data.location}</h2>
                <p>We are proud to serve the entire ${data.location} area, providing prompt and professional ${data.keyword} services.</p>
            </section>
        </article>
    </main>
    <footer>
        <p>&copy; ${new Date().getFullYear()} Your Company Name. All rights reserved.</p>
    </footer>
</body>
</html>`;
}

// Default MDX Template optimized for SEO
function defaultMdxTemplate(data) {
  const title = `${data.keyword} in ${data.location}`;
  const description = `Find the best ${data.keyword} services in ${data.location}. Expert solutions tailored to your needs.`;
  
  return `---
title: "${title}"
description: "${description}"
canonicalUrl: "https://example.com/${data.slug}"
date: "${new Date().toISOString()}"
location: "${data.location}"
keyword: "${data.keyword}"
---

# Expert ${data.keyword} Services in ${data.location}

Looking for the best **${data.keyword}** in **${data.location}**? We provide top-rated, professional services.

## Why Choose Us for ${data.keyword}?

When you need reliable ${data.keyword} in ${data.location}, you want a team you can trust. Our experienced professionals deliver high-quality results tailored to your specific needs.

<SchemaMarkup 
  type="Service" 
  serviceType="${data.keyword}" 
  location="${data.location}" 
/>

## Contact Us Today

Ready to get started? Contact our team in ${data.location} for all your ${data.keyword} needs.
`;
}

function generatePages() {
  const options = parseArgs();

  if (!options.input) {
    console.error('Error: Please provide an input JSON file using --input <path>');
    console.error('Usage: node generate_pages.js --input data.json [--output ./out] [--format mdx|html]');
    process.exit(1);
  }

  if (!fs.existsSync(options.input)) {
    console.error(`Error: Input file "${options.input}" not found.`);
    process.exit(1);
  }

  if (options.format !== 'html' && options.format !== 'mdx') {
    console.error(`Error: Invalid format "${options.format}". Must be 'html' or 'mdx'.`);
    process.exit(1);
  }

  console.log(`Reading data from ${options.input}...`);
  
  let data;
  try {
    const rawData = fs.readFileSync(options.input, 'utf8');
    data = JSON.parse(rawData);
  } catch (err) {
    console.error('Error parsing JSON:', err.message);
    process.exit(1);
  }

  if (!Array.isArray(data)) {
    console.error('Error: Input JSON must be an array of objects.');
    process.exit(1);
  }

  ensureDirSync(options.outputDir);
  console.log(`Output directory: ${options.outputDir}`);
  console.log(`Generating ${data.length} ${options.format.toUpperCase()} pages...`);

  let successCount = 0;
  let errorCount = 0;

  data.forEach((item, index) => {
    if (!item.keyword || !item.location) {
      console.warn(`Warning: Skipping item at index ${index} due to missing 'keyword' or 'location'.`);
      errorCount++;
      return;
    }

    const slug = generateSlug(`${item.keyword}-${item.location}`);
    const fileName = `${slug}.${options.format}`;
    const filePath = path.join(options.outputDir, fileName);

    const templateData = { ...item, slug };
    
    let content = '';
    if (options.template && fs.existsSync(options.template)) {
        // Simple template string replacement if custom template provided
        let customTemplate = fs.readFileSync(options.template, 'utf8');
        content = customTemplate.replace(/{{\s*(\w+)\s*}}/g, (match, key) => {
            return templateData[key] || '';
        });
    } else {
        // Use defaults
        content = options.format === 'html' ? defaultHtmlTemplate(templateData) : defaultMdxTemplate(templateData);
    }

    try {
      fs.writeFileSync(filePath, content, 'utf8');
      successCount++;
    } catch (err) {
      console.error(`Error writing ${fileName}:`, err.message);
      errorCount++;
    }
  });

  console.log('\n--- Summary ---');
  console.log(`Successfully generated: ${successCount} pages`);
  if (errorCount > 0) {
    console.log(`Errors/Skipped: ${errorCount}`);
  }
  console.log('Done!');
}

generatePages();
