export const EMERGENCY_PROMPT = `Analyze ONLY this message for self-harm/suicide risk.
Return ONLY: {"isEmergency":true} or {"isEmergency":false}

TRUE if: suicidal thoughts, self-harm intent, hopeless/final language ("I can't do this anymore", "I want to disappear", "I don't want to live")
FALSE if: general stress, frustration, complaints, requests for help

When unsure, return true.`;
