// src/constants/emergency.ts - Single source of truth for emergency resources
import type { EmergencyPayload } from '../types/index.js';

export const CRISIS_RESOURCES: EmergencyPayload = {
  severity: 'high',
  resources: [
    { name: 'Netherlands', number: '113', label: 'Zelfmoordpreventie', country: 'NL' },
    { name: 'Belgium', number: '1813', label: 'Zelfmoordlijn', country: 'BE' },
    { name: 'UK', number: '116 123', label: 'Samaritans', country: 'GB' },
    { name: 'International', number: '112', label: 'Emergency Services' },
  ],
  safetyQuestion: 'Are you safe right now?',
};

export const EMERGENCY_MESSAGE = `I'm concerned about what you're sharing. Your safety matters most right now.

If you're in immediate danger, please reach out to one of these crisis lines. They're available 24/7 and can provide immediate support.

Are you safe right now?`;
