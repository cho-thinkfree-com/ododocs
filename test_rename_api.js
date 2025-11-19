// Test rename API endpoint
const testRename = async () => {
    try {
        // First, check if server is running
        console.log('1. Testing server connection...');
        const healthCheck = await fetch('http://localhost:4000/api/auth/me', {
            headers: {
                'Authorization': 'Bearer invalid-token-test'
            }
        });
        console.log('Server responded with status:', healthCheck.status);

        // Try to get a real token
        console.log('\n2. Attempting login...');
        const loginRes = await fetch('http://localhost:4000/api/auth/login', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                email: 'testuser@example.com',
                password: 'password123'
            })
        });

        if (!loginRes.ok) {
            console.error('Login failed:', await loginRes.text());
            return;
        }

        const { accessToken } = await loginRes.json();
        console.log('Login successful, got token');

        // Try to rename a document
        console.log('\n3. Attempting to rename document...');
        const renameRes = await fetch('http://localhost:4000/api/documents/test-doc-id', {
            method: 'PATCH',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${accessToken}`
            },
            body: JSON.stringify({ title: 'New Name' })
        });

        console.log('Rename response status:', renameRes.status);
        const renameData = await renameRes.text();
        console.log('Rename response:', renameData);

    } catch (error) {
        console.error('Error:', error.message);
        console.error('Full error:', error);
    }
};

testRename();
