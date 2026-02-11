// src/types/schemas.ts
// Zod validation schemas for message type payloads

import { z } from 'zod';
import type { MessageType } from './index.js';

// ============================================
// ENTITY SCHEMAS
// ============================================

export const CrisisResourceSchema = z.object({
  name: z.string(),
  number: z.string(),
  label: z.string(),
  country: z.string().optional(),
});

export const ExpertSchema = z.object({
  id: z.string(),
  name: z.string(),
  title: z.string(),
  specializations: z.array(z.string()),
  languages: z.array(z.string()),
  imageUrl: z.string().optional(),
  rating: z.number().optional(),
  bio: z.string().optional(),
});

export const TimeSlotSchema = z.object({
  id: z.string(),
  expertId: z.string(),
  startTime: z.string(), // ISO datetime
  endTime: z.string(),
  available: z.boolean(),
});

export const ContentItemSchema = z.object({
  id: z.string(),
  title: z.string(),
  description: z.string().optional(),
  type: z.enum(['articles', 'videos']),  // Matches Azure index values (plural)
  topic: z.string(),
  duration: z.string().optional(),
  thumbnailUrl: z.string().optional(),
  url: z.string(),
  language: z.string(),
});

export const SessionTypeSchema = z.enum(['general', 'physical-wellbeing']);

export const BookedSessionSchema = z.object({
  sessionId: z.string(),
  expert: ExpertSchema,
  slot: TimeSlotSchema,
  sessionType: SessionTypeSchema,
  meetingUrl: z.string().optional(),
  calendarLink: z.string().optional(),
});

// ============================================
// PAYLOAD SCHEMAS
// ============================================

export const EmergencyPayloadSchema = z.object({
  severity: z.enum(['high', 'medium']),
  resources: z.array(CrisisResourceSchema),
  safetyQuestion: z.string().optional(),
});

export const ExpertProfilesPayloadSchema = z.object({
  experts: z.array(ExpertSchema),
  searchCriteria: z
    .object({
      sessionType: SessionTypeSchema,
      topic: z.string().optional(),
    })
    .optional(),
});

export const ExpertAvailabilityPayloadSchema = z.object({
  expert: ExpertSchema,
  slots: z.array(TimeSlotSchema),
  timezone: z.string(),
});

export const SessionBookedPayloadSchema = z.object({
  session: BookedSessionSchema,
  confirmationMessage: z.string(),
});

export const ContentRecommendationsPayloadSchema = z.object({
  items: z.array(ContentItemSchema),
  topic: z.string(),
  totalCount: z.number().optional(),
});

// ============================================
// PAYLOAD SCHEMA MAP
// ============================================

export const PayloadSchemas: Record<MessageType, z.ZodSchema> = {
  text: z.null(),
  emergency: EmergencyPayloadSchema,
  expert_profiles: ExpertProfilesPayloadSchema,
  expert_availability: ExpertAvailabilityPayloadSchema,
  session_booked: SessionBookedPayloadSchema,
  content_recommendations: ContentRecommendationsPayloadSchema,
};

// ============================================
// TOOL RESULT SCHEMA
// ============================================

export const ToolResultSchema = z.object({
  messageType: z.enum([
    'text',
    'emergency',
    'expert_profiles',
    'expert_availability',
    'session_booked',
    'content_recommendations',
  ] as const),
  payload: z.any(), // Will be validated against specific schema based on messageType
  textContent: z.string(),
});
