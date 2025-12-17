import { $ } from 'bun';
import { existsSync } from 'fs';
import { join } from 'path';

const PORT = 1420;
const CSS_OUTPUT = './src/output.css';

// Ensure CSS is compiled before starting server
console.log('Compiling Tailwind CSS...');
await $`bunx tailwindcss -i ./src/globals.css -o ${CSS_OUTPUT} --minify`;
console.log('✓ Initial CSS compiled');

// Start Tailwind in watch mode
console.log('Starting Tailwind CSS watch...');
const tailwind = Bun.spawn(['bunx', 'tailwindcss', '-i', './src/globals.css', '-o', CSS_OUTPUT, '--watch'], {
    stdout: 'inherit',
    stderr: 'inherit',
});

console.log(`Starting dev server on http://localhost:${PORT}`);

// Start Bun's built-in dev server
const server = Bun.serve({
    port: PORT,
    async fetch(req) {
        const url = new URL(req.url);
        let pathname = url.pathname;

        // Serve index.html for root
        if (pathname === '/' || pathname === '/index.html') {
            const html = await Bun.file('./index.html').text();
            // Inject the compiled CSS
            const htmlWithCss = html.replace(
                '</head>',
                '    <link rel="stylesheet" href="/src/output.css" />\n  </head>'
            );
            return new Response(htmlWithCss, {
                headers: { 'Content-Type': 'text/html' },
            });
        }

        // Serve the compiled CSS
        if (pathname === '/src/output.css') {
            if (existsSync(CSS_OUTPUT)) {
                return new Response(Bun.file(CSS_OUTPUT), {
                    headers: { 'Content-Type': 'text/css' },
                });
            } else {
                return new Response('/* CSS not yet compiled */', {
                    headers: { 'Content-Type': 'text/css' },
                    status: 404,
                });
            }
        }

        // Handle TypeScript/TSX files - transpile on the fly
        if (pathname.endsWith('.tsx') || pathname.endsWith('.ts')) {
            const filePath = '.' + pathname;
            const file = Bun.file(filePath);

            if (await file.exists()) {
                const transpiled = await Bun.build({
                    entrypoints: [filePath],
                    target: 'browser',
                    define: {
                        'process.env.NODE_ENV': '"development"',
                    },
                });

                if (transpiled.success && transpiled.outputs[0]) {
                    return new Response(transpiled.outputs[0], {
                        headers: { 'Content-Type': 'application/javascript' },
                    });
                }
            }
        }

        // Serve static files
        const filePath = '.' + pathname;
        const file = Bun.file(filePath);

        if (await file.exists()) {
            return new Response(file);
        }

        // Fallback to index.html for SPA routing
        const html = await Bun.file('./index.html').text();
        const htmlWithCss = html.replace(
            '</head>',
            '    <link rel="stylesheet" href="/src/output.css" />\n  </head>'
        );
        return new Response(htmlWithCss, {
            headers: { 'Content-Type': 'text/html' },
        });
    },
});

console.log(`✓ Dev server running at http://localhost:${server.port}`);
console.log('  Watching for file changes...');
console.log('  CSS will auto-reload on changes');

// Cleanup on exit
process.on('SIGINT', () => {
    tailwind.kill();
    process.exit(0);
});
