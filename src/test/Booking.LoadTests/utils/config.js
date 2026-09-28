export const API_BASE_URL = __ENV.API_URL ?? 'http://localhost:8080';

export const TEST_CREDENTIALS = {
    username: __ENV.TEST_USERNAME ?? 'boss',
    password: __ENV.TEST_PASSWORD ?? 'password123'
};

export const THRESHOLDS = {
    http_req_duration: ['p(95)<500'], // 95% of requests must complete under 500ms
    http_req_failed: ['rate<0.01'],   // Error rate must be less than 1%
};

