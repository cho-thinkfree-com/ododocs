
const BASE_URL = 'http://localhost:4000';
const EMAIL = `test-${Date.now()}@example.com`;
const PASSWORD = 'password123';
const NAME = 'Test User';

async function run() {
    console.log('Starting Backend Verification...');

    // 1. Signup
    console.log(`\n1. Signing up as ${EMAIL}...`);
    const signupRes = await fetch(`${BASE_URL}/api/auth/signup`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: EMAIL, password: PASSWORD, legalName: NAME }),
    });

    if (!signupRes.ok) {
        console.error('Signup Failed:', await signupRes.text());
        return;
    }
    const account = await signupRes.json();
    console.log('Signup Success:', account.id);

    // 2. Login
    console.log('\n2. Logging in...');
    const loginRes = await fetch(`${BASE_URL}/api/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: EMAIL, password: PASSWORD }),
    });

    if (!loginRes.ok) {
        console.error('Login Failed:', await loginRes.text());
        return;
    }
    const tokens = await loginRes.json();
    const token = tokens.accessToken;
    console.log('Login Success. Token received.');

    // 3. Create Workspace
    console.log('\n3. Creating Workspace...');
    const workspaceRes = await fetch(`${BASE_URL}/api/workspaces`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ name: 'Test Workspace' }),
    });

    if (!workspaceRes.ok) {
        console.error('Create Workspace Failed:', await workspaceRes.text());
        return;
    }
    const workspace = await workspaceRes.json();
    console.log('Workspace Created:', workspace.id, workspace.name);

    // 4. Create Document
    console.log('\n4. Creating Document...');
    const docRes = await fetch(`${BASE_URL}/api/workspaces/${workspace.id}/documents`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ title: 'Test Document' }),
    });

    if (!docRes.ok) {
        console.error('Create Document Failed:', await docRes.text());
        return;
    }
    const doc = await docRes.json();
    console.log('Document Created:', doc.id, doc.title);

    console.log('\nBackend Verification Completed Successfully!');
}

run().catch(err => console.error('Script Error:', err));
