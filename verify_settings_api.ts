
import { login, signup, createWorkspace, getWorkspaceMemberProfile, updateWorkspaceMemberProfile } from './src/lib/api';
// import fetch from 'node-fetch'; // Native fetch in Node 18+

// Mock fetch for node environment if needed, or just use the api functions if they use fetch
// The api.ts uses native fetch or a polyfill. In Node 18+ fetch is native.
// But api.ts might rely on browser specific things?
// Let's check api.ts imports.
// It imports from './config' which uses import.meta.env.
// This won't work in Node directly without setup.

// Instead of using src/lib/api.ts which has frontend dependencies, 
// I'll write a raw fetch script.

const PORT = process.env.API_PORT || '4000';
const API_URL = `http://localhost:${PORT}`;

async function run() {
    try {
        console.log('1. Creating account...');
        const email = `test_${Date.now()}@example.com`;
        const password = 'password123';

        // Signup
        const signupRes = await fetch(`${API_URL}/api/auth/signup`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email, password, legalName: 'Test User' })
        });

        if (!signupRes.ok) {
            console.error('Signup failed', await signupRes.text());
            return;
        }

        // Login
        console.log('2. Logging in...');
        const loginRes = await fetch(`${API_URL}/api/auth/login`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email, password })
        });

        if (!loginRes.ok) {
            console.error('Login failed', await loginRes.text());
            return;
        }

        const tokens = await loginRes.json();
        const token = tokens.accessToken;
        console.log('Logged in, token:', token.substring(0, 10) + '...');

        // Create Workspace
        console.log('3. Creating workspace...');
        const wsRes = await fetch(`${API_URL}/api/workspaces`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify({ name: 'Test Workspace' })
        });

        if (!wsRes.ok) {
            console.error('Create workspace failed', await wsRes.text());
            return;
        }

        const workspace = await wsRes.json();
        console.log('Workspace created:', workspace.id);

        // Get Member Profile
        console.log('4. Getting member profile...');
        const profileRes = await fetch(`${API_URL}/api/workspaces/${workspace.id}/members/me`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });

        if (!profileRes.ok) {
            console.error('Get profile failed', await profileRes.text());
            return;
        }

        const profile = await profileRes.json();
        console.log('Initial profile:', profile);

        // Update Member Profile
        console.log('5. Updating member profile...');
        const updateRes = await fetch(`${API_URL}/api/workspaces/${workspace.id}/members/me`, {
            method: 'PATCH',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify({
                displayName: 'Updated Name',
                timezone: 'Asia/Seoul'
            })
        });

        if (!updateRes.ok) {
            console.error('Update profile failed', await updateRes.text());
            return;
        }

        const updatedProfile = await updateRes.json();
        console.log('Updated profile:', updatedProfile);

        if (updatedProfile.displayName === 'Updated Name' && updatedProfile.timezone === 'Asia/Seoul') {
            console.log('SUCCESS: Profile updated correctly.');
        } else {
            console.error('FAILURE: Profile mismatch.');
        }

    } catch (err) {
        console.error('Error:', err);
    }
}

run();
