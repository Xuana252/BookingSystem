import http from 'k6/http';
import { API_BASE_URL, TEST_CREDENTIALS } from './config.js';

export function authenticate() {
    const loginRes = http.post(`${API_BASE_URL}/api/auth/login`, JSON.stringify({
        email: TEST_CREDENTIALS.email,
        password: TEST_CREDENTIALS.password
    }), {
        headers: { 'Content-Type': 'application/json' }
    });

    if (loginRes.status !== 200) {
        console.error('Authentication failed in setup phase!', loginRes.body);
        return null;
    }

    return loginRes.json('token');
}

export function getAuthHeaders(token) {
    return {
        headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
        }
    };
}
