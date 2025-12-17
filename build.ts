import { $ } from 'bun';
import { mkdir, rm, cp, readdir } from 'fs/promises';
import { join } from 'path';
import { existsSync } from 'fs';

const outdir = './dist';

// Clean dist directory
if (existsSync(outdir)) {
    await rm(outdir, { recursive: true });
}
await mkdir(outdir, { recursive: true });
await mkdir(join(outdir, 'assets'), { recursive: true });

// Build CSS with Tailwind
console.log('Building CSS...');
await $`bunx tailwindcss -i ./src/globals.css -o ${outdir}/assets/index.css --minify`;

// Bundle JavaScript with Bun
console.log('Bundling JavaScript...');
const result = await Bun.build({
    entrypoints: ['./src/main.tsx'],
    outdir: join(outdir, 'assets'),
    target: 'browser',
    minify: true,
    splitting: true,
    sourcemap: 'external',
    naming: '[dir]/[name]-[hash].[ext]',
    define: {
        'process.env.NODE_ENV': '"production"',
    },
});

if (!result.success) {
    console.error('Build failed:', result.logs);
    process.exit(1);
}

// Get the generated JS file name
const jsFiles = result.outputs.filter(o => o.path.endsWith('.js') && !o.path.includes('chunk'));
const mainJs = jsFiles[0];
const jsFileName = mainJs.path.split('/').pop();

// Copy static assets
console.log('Copying static assets...');
const publicFiles = ['tauri.svg', 'icon.png'];
for (const file of publicFiles) {
    const sourcePath = `public/${file}`;
    if (existsSync(sourcePath)) {
        await cp(sourcePath, join(outdir, file));
    }
}

// Copy assets from src/assets if they exist
if (existsSync('./src/assets')) {
    const assetFiles = await readdir('./src/assets');
    for (const file of assetFiles) {
        await cp(join('./src/assets', file), join(outdir, 'assets', file));
    }
}

// Generate index.html
const indexHtml = `<!doctype html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <link rel="icon" type="image/svg+xml" href="/vite.svg" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>RSI Assistant</title>
    <link rel="stylesheet" href="/assets/index.css" />
  </head>
  <body>
    <div id="root"></div>
    <script type="module" src="/assets/${jsFileName}"></script>
  </body>
</html>
`;

await Bun.write(join(outdir, 'index.html'), indexHtml);

console.log('✓ Build complete');
console.log(`  Output: ${outdir}/`);
