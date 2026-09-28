import { THRESHOLDS } from './utils/config.js';
import { authenticate } from './utils/auth.js';
import { browseRooms } from './scenarios/browse-rooms.js';

// 1. Load Strategy Definition
export const options = {
  stages: [
    { duration: '5s', target: 20 }, // Ramp-up to 50 users
    { duration: '10s', target: 20 },  // Steady state at 50 users
    { duration: '5s', target: 0 },  // Ramp-down
  ],
  thresholds: THRESHOLDS
};

// 2. Global Setup (Runs once per test run)
export function setup() {
  const token = authenticate();
  return { token: token };
}

// 3. Execution (Runs iteratively per Virtual User)
export default function (data) {
  // If setup failed to get a token, abort early
  if (!data.token) {
    return;
  }

  // Execute our specific scenario
  browseRooms(data.token);
}

