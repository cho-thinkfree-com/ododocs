// This script removes token parameters from API calls in all TypeScript/TSX files
// Run with: node remove-token-params.js

const fs = require('fs');
const path = require('path');

const srcDir = path.join(__dirname, 'src');

// List of API functions that previously took a token parameter
const apiFunctions = [
    'getWorkspaces', 'getWorkspace', 'getWorkspaceMembers', 'getWorkspaceMemberProfile',
    'updateWorkspaceMemberProfile', 'inviteWorkspaceMember', 'changeWorkspaceMemberRole',
    'removeWorkspaceMember', 'getWorkspaceDocuments', 'getRecentDocuments', 'getDocument',
    'getLatestRevision', 'appendRevision', 'createDocument', 'deleteDocument', 'renameDocument',
    'createFolder', 'deleteFolder', 'renameFolder', 'getFolder', 'addDocumentTag',
    'removeDocumentTag', 'createShareLink', 'getShareLinks', 'revokeShareLink', 'updateShareLink',
    'updateWorkspace', 'closeWorkspace', 'createWorkspace', 'checkDocumentTitle',
    'updateDocument', 'downloadDocument', 'listTrash', 'restoreDocument',
    'permanentlyDeleteDocument', 'restoreFolder', 'permanentlyDeleteFolder', 'updateAccount'
];

function processFile(filePath) {
    let content = fs.readFileSync(filePath, 'utf8');
    let modified = false;

    // Remove tokens.accessToken from API calls
    apiFunctions.forEach(funcName => {
        // Pattern: functionName(arg1, tokens.accessToken, arg2)
        const pattern1 = new RegExp(`(${funcName}\\([^)]*),\\s*tokens\\.accessToken\\s*,`, 'g');
        if (pattern1.test(content)) {
            content = content.replace(pattern1, '$1,');
            modified = true;
        }

        // Pattern: functionName(tokens.accessToken, arg1)
        const pattern2 = new RegExp(`(${funcName}\\()tokens\\.accessToken\\s*,\\s*`, 'g');
        if (pattern2.test(content)) {
            content = content.replace(pattern2, '$1');
            modified = true;
        }

        // Pattern: functionName(arg1, tokens.accessToken)
        const pattern3 = new RegExp(`(${funcName}\\([^)]*),\\s*tokens\\.accessToken\\s*\\)`, 'g');
        if (pattern3.test(content)) {
            content = content.replace(pattern3, '$1)');
            modified = true;
        }
    });

    // Replace const { tokens } = useAuth() with const { isAuthenticated } = useAuth()
    if (content.includes('const { tokens } = useAuth()')) {
        content = content.replace(/const\s*{\s*tokens\s*}\s*=\s*useAuth\(\)/g, 'const { isAuthenticated } = useAuth()');
        modified = true;
    }

    // Replace if (tokens) with if (isAuthenticated)
    if (content.includes('if (tokens)') || content.includes('if (!tokens)')) {
        content = content.replace(/if\s*\(\s*tokens\s*\)/g, 'if (isAuthenticated)');
        content = content.replace(/if\s*\(\s*!\s*tokens\s*\)/g, 'if (!isAuthenticated)');
        modified = true;
    }

    if (modified) {
        fs.writeFileSync(filePath, content, 'utf8');
        console.log(`Modified: ${filePath}`);
    }
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

walkDir(srcDir);
console.log('Done!');
