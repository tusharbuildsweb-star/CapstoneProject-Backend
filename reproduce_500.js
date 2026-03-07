const axios = require('axios');

async function test() {
    const baseURL = 'http://localhost:5000/api/v1';

    // Attempt to login first to get a token
    try {
        console.log('Checking health...');
        const healthRes = await axios.get(`${baseURL}/system/health`);
        console.log('Health:', healthRes.data);

        console.log('Attempting login...');
        const loginRes = await axios.post(`${baseURL}/auth/login`, {
            email: 'tushar.buildsweb@gmail.com',
            password: 'Password@123' // Common test password in this project
        });

        const token = loginRes.data.token;
        const role = loginRes.data.user.role;
        console.log(`Login success. Role: ${role}`);

        console.log('Testing /restaurants/owner/me...');
        const res = await axios.get(`${baseURL}/restaurants/owner/me`, {
            headers: { Authorization: `Bearer ${token}` }
        });
        console.log('Success:', res.data);
    } catch (error) {
        if (error.response) {
            console.error('Error Status:', error.response.status);
            console.error('Error Data:', JSON.stringify(error.response.data, null, 2));
        } else {
            console.error('Error Message:', error.message);
        }
    }
}

test();
