// src/tools/definitions.ts
// Tools that return structured data with message types

import { z } from 'zod';
import { tool, StructuredTool } from '@langchain/core/tools';
import { getContentSearchService, getExpertSearchService } from '../services/azureAiSearch.js';
import type {
  Expert,
  TimeSlot,
  SessionType,
  ToolResult,
} from '../types/index.js';

// ============================================
// SEARCH CONTENT TOOL (with Azure AI Search)
// ============================================

export const searchContentTool = tool(
  async ({ topic, contentType, language }): Promise<string> => {
    console.log(`[Tool] searchContent: ${topic}, ${contentType}, ${language}`);

    const searchService = getContentSearchService();
    const searchResponse = await searchService.search({
      searchText: topic,
      languageCode: language || 'en-GB',
      types: contentType ? [contentType] : null,
      pageSize: 3,
    });

    const items = searchResponse.pagedResults;

    const result: ToolResult<'content_recommendations'> = {
      messageType: 'content_recommendations',
      payload: {
        items,
        topic,
        totalCount: searchResponse.totalCount,
      },
      textContent: items.length > 0
        ? `I found ${items.length} resources about ${topic} that might help you.`
        : `I couldn't find specific content about ${topic}. Would you like me to search for something related?`,
    };

    return JSON.stringify(result);
  },
  {
    name: 'search_content',
    description: `Search for mental health and wellbeing content (articles, videos).

Use this when:
- User asks for content, resources, or information on a mental health topic
- User wants to learn about stress, anxiety, sleep, relationships, etc.
- User asks "do you have articles/videos about X?"

Examples: "I want to learn about stress management", "show me videos about sleep", "articles on anxiety"`,
    schema: z.object({
      topic: z.string().describe('The wellbeing topic to search for (e.g., "stress", "anxiety", "sleep")'),
      contentType: z.enum(['articles', 'videos']).nullable().optional().describe('Filter by content type if user specified'),
      language: z.string().nullable().optional().describe('Content language (e.g., en-GB, nl-NL)'),
    }),
  }
);

// ============================================
// SEARCH EXPERTS TOOL
// ============================================

export const searchExpertsTool = tool(
  async ({ sessionType, topic, language }): Promise<string> => {
    console.log(`[Tool] searchExperts: ${sessionType}, ${topic}`);

    const searchService = getExpertSearchService();
    const searchResponse = await searchService.search({
      searchText: topic || sessionType,
      sessionType: sessionType as SessionType,
      languages: language ? [language] : undefined,
      pageSize: 3,
    });

    const experts = searchResponse.results;

    const result: ToolResult<'expert_profiles'> = {
      messageType: 'expert_profiles',
      payload: {
        experts,
        searchCriteria: {
          sessionType: sessionType as SessionType,
          topic: topic || undefined,
        },
      },
      textContent: experts.length > 0
        ? `I found ${experts.length} experts who can help you with ${topic || sessionType}. Take a look at their profiles.`
        : `I couldn't find experts matching your criteria. Would you like to broaden your search?`,
    };

    return JSON.stringify(result);
  },
  {
    name: 'search_experts',
    description: `Search for mental health experts and therapists.

Use this when:
- User wants to talk to someone or book a session
- User asks for a therapist, psychologist, or counselor
- User wants professional help with a specific issue

Examples: "I want to talk to someone", "book a session with a therapist", "find an expert for anxiety"`,
    schema: z.object({
      sessionType: z.enum(['general', 'physical-wellbeing']).describe(
        'general = mental/emotional health (stress, anxiety, relationships). physical-wellbeing = body/exercise/nutrition habits'
      ),
      topic: z.string().nullable().optional().describe('Specific topic user wants help with'),
      language: z.string().nullable().optional().describe('Preferred language (e.g., en-GB, nl-NL)'),
    }),
  }
);

// ============================================
// GET EXPERT AVAILABILITY TOOL
// ============================================

export const getExpertAvailabilityTool = tool(
  async ({ expertId }): Promise<string> => {
    console.log(`[Tool] getExpertAvailability: ${expertId}`);

    // TODO: Replace with actual calendar API
    const today = new Date();
    const slots: TimeSlot[] = [];

    // Generate some mock slots for next 3 days
    for (let day = 0; day < 3; day++) {
      const date = new Date(today);
      date.setDate(date.getDate() + day);

      for (const hour of [9, 10, 11, 14, 15, 16]) {
        const startTime = new Date(date);
        startTime.setHours(hour, 0, 0, 0);

        const endTime = new Date(startTime);
        endTime.setMinutes(endTime.getMinutes() + 45);

        slots.push({
          id: `slot_${day}_${hour}`,
          expertId,
          startTime: startTime.toISOString(),
          endTime: endTime.toISOString(),
          available: Math.random() > 0.3, // 70% available
        });
      }
    }

    // Mock expert data
    const expert: Expert = {
      id: expertId,
      name: expertId === 'expert_1' ? 'Dr. Sarah van Berg' : 'Jan de Vries',
      title: 'Psychologist',
      specializations: ['Stress', 'Anxiety'],
      languages: ['en-GB', 'nl-NL'],
    };

    const result: ToolResult<'expert_availability'> = {
      messageType: 'expert_availability',
      payload: {
        expert,
        slots: slots.filter(s => s.available),
        timezone: 'Europe/Amsterdam',
      },
      textContent: `Here are the available time slots for ${expert.name}. Pick a time that works for you.`,
    };

    return JSON.stringify(result);
  },
  {
    name: 'get_expert_availability',
    description: 'Get available time slots for a specific expert. Use after user selects an expert.',
    schema: z.object({
      expertId: z.string().describe('The ID of the expert to get availability for'),
    }),
  }
);

// ============================================
// BOOK SESSION TOOL
// ============================================

export const bookSessionTool = tool(
  async ({ expertId, slotId, sessionType, userSummary }): Promise<string> => {
    console.log(`[Tool] bookSession: ${expertId}, ${slotId}`);

    // TODO: Replace with actual booking API
    const session = {
      sessionId: `session_${Date.now()}`,
      expert: {
        id: expertId,
        name: 'Dr. Sarah van Berg',
        title: 'Psychologist',
        specializations: ['Stress', 'Anxiety'],
        languages: ['en-GB'],
      },
      slot: {
        id: slotId,
        expertId,
        startTime: new Date(Date.now() + 86400000).toISOString(), // Tomorrow
        endTime: new Date(Date.now() + 86400000 + 2700000).toISOString(),
        available: false,
      },
      sessionType: sessionType as SessionType,
      meetingUrl: 'https://meet.openup.com/session/abc123',
      calendarLink: 'https://calendar.openup.com/add/abc123',
    };

    const result: ToolResult<'session_booked'> = {
      messageType: 'session_booked',
      payload: {
        session,
        confirmationMessage: 'Your session has been booked! You will receive a confirmation email shortly.',
      },
      textContent: `Great! Your session with ${session.expert.name} is confirmed. You'll receive all the details by email.`,
    };

    return JSON.stringify(result);
  },
  {
    name: 'book_session',
    description: 'Book a session with an expert. Use after user selects a time slot.',
    schema: z.object({
      expertId: z.string(),
      slotId: z.string(),
      sessionType: z.enum(['general', 'physical-wellbeing']),
      userSummary: z.string().describe('Brief summary of what user wants to discuss'),
    }),
  }
);

// ============================================
// EXPORTS
// ============================================

// All actual tools that perform actions
export const allTools = [
  searchContentTool,
  searchExpertsTool,
  getExpertAvailabilityTool,
  bookSessionTool,
];

export const toolsByName: Record<string, StructuredTool> = Object.fromEntries(
  allTools.map((t) => [t.name, t])
);
