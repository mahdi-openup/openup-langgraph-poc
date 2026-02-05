import { z } from 'zod';
import { tool } from '@langchain/core/tools';
import type { ContentItem, Expert } from '../types/index.js';

// Tool: Search for content
export const searchContentTool = tool(
  async ({ topic, contentType, language }) => {
    // TODO: Replace with actual Azure AI Search
    console.log(`[Tool] Searching content: ${topic}, type: ${contentType}, lang: ${language}`);

    // Mock results
    const results: ContentItem[] = [
      {
        id: '1',
        title: `Understanding ${topic}`,
        type: contentType || 'article',
        topic,
        url: 'https://openup.com/content/1',
      },
      {
        id: '2',
        title: `Practical tips for ${topic}`,
        type: contentType || 'video',
        topic,
        url: 'https://openup.com/content/2',
      },
    ];

    return JSON.stringify(results);
  },
  {
    name: 'search_content',
    description: 'Search for wellbeing content (articles, videos) on a specific topic. Use when user wants content recommendations.',
    schema: z.object({
      topic: z.string().describe('The wellbeing topic to search for'),
      contentType: z.enum(['article', 'video']).optional().describe('Preferred content type if user specified'),
      language: z.string().optional().describe('Preferred language (e.g., en-GB, nl-NL) if user specified'),
    }),
  }
);

// Tool: Search for experts
export const searchExpertsTool = tool(
  async ({ sessionType, summary, language }) => {
    // TODO: Replace with actual Azure AI Search
    console.log(`[Tool] Searching experts: ${sessionType}, summary: ${summary}`);

    // Mock results
    const experts: Expert[] = [
      {
        id: '1',
        name: 'Dr. Sarah van Berg',
        specialization: sessionType === 'general' ? 'Stress & Anxiety' : 'Nutrition & Lifestyle',
        languages: ['en-GB', 'nl-NL'],
        availableSlots: ['Tomorrow 10:00', 'Tomorrow 14:00', 'Friday 09:00'],
      },
      {
        id: '2',
        name: 'Jan de Vries',
        specialization: sessionType === 'general' ? 'Work-life Balance' : 'Exercise & Energy',
        languages: ['nl-NL', 'en-GB'],
        availableSlots: ['Today 16:00', 'Thursday 11:00'],
      },
    ];

    return JSON.stringify(experts);
  },
  {
    name: 'search_experts',
    description: 'Search for available experts/therapists to book a session with. Use when user wants to talk to someone.',
    schema: z.object({
      sessionType: z.enum(['general', 'physical-wellbeing']).describe(
        'general = mental/emotional wellbeing (stress, anxiety, burnout, relationships). physical-wellbeing = body-focused (nutrition, exercise, sleep habits, energy)'
      ),
      summary: z.string().describe('Brief summary of what user wants to discuss, for matching'),
      language: z.string().optional().describe('Preferred session language if user specified'),
    }),
  }
);

// Tool: Request clarification
export const needsClarificationTool = tool(
  async ({ question, whatWeKnow }) => {
    return JSON.stringify({ needsInfo: true, question, context: whatWeKnow });
  },
  {
    name: 'needs_clarification',
    description: 'Use when you need more information from the user to help them properly. Only ask ONE specific question.',
    schema: z.object({
      question: z.string().describe('The single clarifying question to ask the user'),
      whatWeKnow: z.string().describe('Summary of what you already understand from the conversation'),
    }),
  }
);

export const allTools = [
  searchContentTool,
  searchExpertsTool,
  needsClarificationTool,
];

export const toolsByName = Object.fromEntries(
  allTools.map((t) => [t.name, t])
);
