// This script removes ALL token usage from TypeScript/TSX files
const fs = require('fs');
const path = require('path');

const srcDir = path.join(__dirname, 'src');
let totalModified = 0;

function processFile(filePath) {
    let content = fs.readFileSync(filePath, 'utf8');
    let modified = false;
    const originalContent = content;

    // 1. Replace const { tokens } = useAuth() with const { isAuthenticated } = useAuth()
    if (content.includes('const { tokens }')) {
        content = content.replace(/const\s*{\s*([^}]*,\s*)?tokens(\s*,\s*[^}]*)?\s*}\s*=\s*useAuth\(\)/g, (match, before, after) => {
            const parts = [];
            if (before) parts.push(before.trim().replace(/,$/, ''));
            parts.push('isAuthenticated');
            if (after) parts.push(after.trim().replace(/^,/, ''));
            return `const { ${parts.filter(p => p).join(', ')} } = useAuth()`;
        });
        modified = true;
    }

    // 2. Replace if (tokens) with if (isAuthenticated)
    content = content.replace(/if\s*\(\s*tokens\s*&&/g, 'if (isAuthenticated &&');
    content = content.replace(/if\s*\(\s*tokens\s*\)/g, 'if (isAuthenticated)');

    // 3. Replace if (!tokens) with if (!isAuthenticated)
    content = content.replace(/if\s*\(\s*!\s*tokens\s*\)/g, 'if (!isAuthenticated)');
    content = content.replace(/if\s*\(\s*!\s*tokens\s*\|\|/g, 'if (!isAuthenticated ||');
    content = content.replace(/\|\|\s*!\s*tokens\s*\)/g, '|| !isAuthenticated)');

    // 4. Replace tokens?.accessToken with just checking isAuthenticated
    content = content.replace(/tokens\?\.accessToken/g, 'isAuthenticated');
    content = content.replace(/tokens\.accessToken/g, 'isAuthenticated');

    // 5. Replace tokens?.accountId with user?.id (assuming user is available from useAuth)
    content = content.replace(/tokens\?\.accountId/g, 'user?.id');

    // 6. Fix dependency arrays
    content = content.replace(/,\s*tokens\s*,/g, ', isAuthenticated,');
    content = content.replace(/\[\s*tokens\s*,/g, '[isAuthenticated,');
    content = content.replace(/,\s*tokens\s*\]/g, ', isAuthenticated]');
    content = content.replace(/\[\s*tokens\s*\]/g, '[isAuthenticated]');
    content = content.replace(/,\s*tokens\?\.accessToken\s*\]/g, ', isAuthenticated]');

    // 7. Remove dispatchAuthRefreshed if it exists (no longer needed)
    if (content.includes('dispatchAuthRefreshed')) {
        content = content.replace(/const\s+dispatchAuthRefreshed[^}]+}\s*\n/g, '');
        content = content.replace(/export\s*{\s*dispatchAuthRefreshed[^}]*}\s*\n/g, '');
        modified = true;
    }

    if (content !== originalContent) {
        fs.writeFileSync(filePath, content, 'utf8');
        console.log(`Modified: ${filePath}`);
        totalModified++;
        return true;
    }
    return false;
}

function walkDir(dir) {
    const files = fs.readdirSync(dir);
    files.forEach(file => {
        const filePath = path.join(dir, file);
        const stat = fs.statSync(filePath);
        if (stat.isDirectory()) {
            walkDir(filePath);
        } else if (file.endsWith('.tsx') || file.endsWith('.ts')) {
            processFile(filePath);
        }
    });
}

console.log('Starting token removal...');
walkDir(srcDir);
console.log(`\nDone! Modified ${totalModified} files.`);
