export const API_BASE_URL = __ENV.API_URL || 'http://localhost:5133';

export const TEST_CREDENTIALS = {
    email: __ENV.TEST_EMAIL || 'user@example.com',
    password: __ENV.TEST_PASSWORD || 'password123'
};

export const THRESHOLDS = {
    http_req_duration: ['p(95)<500'], // 95% of requests must complete under 500ms
    http_req_failed: ['rate<0.01'],   // Error rate must be less than 1%
};
