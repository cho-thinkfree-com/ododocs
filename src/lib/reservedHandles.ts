// List of reserved blog handles that cannot be used by users
// This list should be synchronized with the backend
export const RESERVED_HANDLES = [
    // System & Admin
    'admin', 'administrator', 'root', 'sys', 'system', 'superuser',
    'api', 'app', 'apps', 'dashboard', 'settings', 'config', 'setup',
    'login', 'logout', 'signin', 'signout', 'signup', 'register', 'auth',
    'password', 'reset', 'recover', 'verify', 'confirm',
    'profile', 'account', 'user', 'users', 'member', 'members',
    'group', 'groups', 'team', 'teams', 'org', 'organization',
    'workspace', 'workspaces', 'project', 'projects',
    'billing', 'payment', 'plan', 'subscription', 'invoice', 'pricing',
    'help', 'support', 'status', 'docs', 'documentation', 'guide', 'faq',
    'legal', 'terms', 'privacy', 'policy', 'security', 'about', 'contact',
    'search', 'explore', 'discover', 'feed', 'home', 'welcome', 'index',
    'public', 'share', 'shared', 'view', 'preview', 'edit', 'editor',
    'static', 'assets', 'media', 'images', 'img', 'css', 'js', 'script',
    'download', 'upload', 'file', 'files', 'folder', 'folders',
    'mail', 'email', 'inbox', 'message', 'messages', 'chat', 'notification',
    'blog', 'post', 'posts', 'article', 'articles', 'story', 'stories',
    'news', 'press', 'release', 'update', 'updates',
    'dev', 'test', 'staging', 'prod', 'production', 'demo', 'beta',

    // Brands & Tech
    'thinkfree', 'hancom', 'odocs', 'tiptap', 'prosemirror',
    'google', 'gmail', 'youtube', 'android', 'chrome',
    'apple', 'icloud', 'iphone', 'ipad', 'mac', 'ios',
    'microsoft', 'windows', 'office', 'outlook', 'azure', 'github',
    'facebook', 'instagram', 'whatsapp', 'messenger', 'meta',
    'twitter', 'x', 'linkedin', 'tiktok', 'snapchat', 'pinterest',
    'amazon', 'aws', 'netflix', 'spotify', 'twitch', 'discord', 'slack',
    'samsung', 'lg', 'sony', 'intel', 'amd', 'nvidia',
    'oracle', 'ibm', 'salesforce', 'adobe', 'figma', 'notion',
    'openai', 'chatgpt', 'gemini', 'claude', 'copilot',

    // Common Names & Roles
    'bot', 'robot', 'crawler', 'spider',
    'guest', 'visitor', 'anonymous', 'nobody',
    'staff', 'employee', 'manager', 'owner', 'founder', 'ceo', 'cto',
    'official', 'verified', 'premium', 'pro', 'vip', 'enterprise',

    // Malicious or Confusing
    'security', 'secure', 'ssl', 'tls', 'cert',
    'virus', 'malware', 'phishing', 'scam', 'spam',
    'undefined', 'null', 'nan', 'void', 'true', 'false',
    'error', 'warning', 'info', 'success', 'fail',
    'http', 'https', 'www', 'ftp', 'ssh', 'smtp', 'pop3', 'imap',
    'localhost', 'local', 'domain', 'host', 'server', 'client'
];

export const isReservedHandle = (handle: string): boolean => {
    if (!handle) return false;
    return RESERVED_HANDLES.includes(handle.toLowerCase());
};
