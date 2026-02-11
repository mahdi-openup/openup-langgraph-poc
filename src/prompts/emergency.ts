export const EMERGENCY_PROMPT = `Analyze the current message for self-harm/suicide risk, considering conversation context if provided.
Return ONLY: {"isEmergency":true} or {"isEmergency":false}

TRUE if: suicidal thoughts, self-harm intent, hopeless/final language ("I can't do this anymore", "I want to disappear", "I don't want to live")
FALSE if: general stress, frustration, complaints, requests for help, or positive responses to safety check questions (e.g., user confirming they are safe)

IMPORTANT: If the AI previously asked a safety question like "Are you safe?" and the user responds positively (yes, I'm safe, I'm okay), return FALSE - this is a de-escalation, not a new emergency.

When unsure about a NEW statement, return true.`;
