import http from 'k6/http';
import { check, sleep } from 'k6';
import { API_BASE_URL } from '../utils/config.js';
import { getAuthHeaders } from '../utils/auth.js';

export function browseRooms(token) {
    const reqOptions = getAuthHeaders(token);
    
    // Simulate a user hitting the API to load the calendar/room list
    let res = http.get(`${API_BASE_URL}/api/rooms`, reqOptions);
    
    check(res, {
        'GET /api/rooms status is 200': (r) => r.status === 200,
    });

    // Simulate think time before they navigate away or refresh
    sleep(1);
}
