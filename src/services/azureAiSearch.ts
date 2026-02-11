// src/services/azureAiSearch.ts
// Azure AI Search service - Generic and reusable for different indexes
// Following Microsoft best practices: https://learn.microsoft.com/en-us/azure/developer/javascript/ai/langchain-agent-on-azure

import type { ContentItem, Expert } from '../types/index.js';

// ============================================
// GENERIC TYPES
// ============================================

export interface AzureSearchConfig {
  endpoint?: string;
  apiKey?: string;
  apiVersion?: string;
}

export interface SearchIndexConfig {
  indexName: string;
  useSemanticSearch?: boolean;
  semanticConfigurationName?: string;
  defaultSelect?: string[];
  vectorFields?: { field: string; weight: number; kNearestNeighborsCount: number }[];
}

export interface SearchRequest {
  searchText: string;
  filter?: string;
  select?: string[];
  top?: number;
  skip?: number;
  orderBy?: string;
  searchMode?: 'any' | 'all';
  queryType?: 'simple' | 'full' | 'semantic';
  semanticConfiguration?: string;
}

export interface SearchResponse<T> {
  results: T[];
  totalCount: number;
}

// ============================================
// AZURE AI SEARCH CLIENT (Generic)
// ============================================

export class AzureAiSearchClient {
  private readonly endpoint: string;
  private readonly apiKey: string;
  private readonly apiVersion: string;

  constructor(config?: AzureSearchConfig) {
    this.endpoint = config?.endpoint ?? process.env.AZURE_SEARCH_ENDPOINT ?? "https://openup-search-standard-test.search.windows.net";
    this.apiKey = config?.apiKey ?? process.env.AZURE_SEARCH_API_KEY ?? '';
    // Use 2024-07-01 for vector search support
    this.apiVersion = config?.apiVersion ?? '2024-07-01';
  }

  get isConfigured(): boolean {
    return Boolean(this.endpoint && this.apiKey);
  }

  /**
   * Generic search method - works with any index
   */
  async search<T>(
    indexConfig: SearchIndexConfig,
    request: SearchRequest,
    mapResult: (doc: Record<string, unknown>) => T
  ): Promise<SearchResponse<T>> {
    console.log(`[AzureAiSearch] Searching index '${indexConfig.indexName}':`, request.searchText);

    if (!this.isConfigured) {
      console.log('[AzureAiSearch] No endpoint configured');
      return { results: [], totalCount: 0 };
    }

    try {
      const searchUrl = `${this.endpoint}/indexes/${indexConfig.indexName}/docs/search?api-version=${this.apiVersion}`;

      // Build search body
      const body: Record<string, unknown> = {
        search: request.searchText,
        filter: request.filter,
        top: request.top ?? 10,
        skip: request.skip ?? 0,
        searchMode: request.searchMode ?? 'all',
        select: (request.select ?? indexConfig.defaultSelect)?.join(','),
        orderby: request.orderBy,
        count: true,
      };

      // Add semantic search if enabled (matching C# implementation)
      if (indexConfig.useSemanticSearch || request.queryType === 'semantic') {
        body.queryType = 'semantic';
        body.semanticConfiguration = request.semanticConfiguration ?? indexConfig.semanticConfigurationName ?? 'default';
        // Add semantic query for better results
        body.semanticQuery = request.searchText;
      }

      // Add vector search if vector fields are configured (matching C# implementation)
      if (indexConfig.vectorFields && indexConfig.vectorFields.length > 0) {
        body.vectorQueries = indexConfig.vectorFields.map(vf => ({
          kind: 'text',
          text: request.searchText,
          fields: vf.field,
          k: vf.kNearestNeighborsCount,
          weight: vf.weight,
        }));
      }

      const response = await fetch(searchUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'api-key': this.apiKey,
        },
        body: JSON.stringify(body),
      });

      if (!response.ok) {
        const errorBody = await response.text();
        console.error(`[AzureAiSearch] Search failed on '${indexConfig.indexName}':`, response.status, response.statusText);
        console.error(`[AzureAiSearch] Error details:`, errorBody);
        console.error(`[AzureAiSearch] Request body:`, JSON.stringify(body, null, 2));
        return { results: [], totalCount: 0 };
      }

      const data = await response.json() as {
        value?: Record<string, unknown>[];
        '@odata.count'?: number;
      };

      const results = (data.value ?? []).map(mapResult);

      return {
        results,
        totalCount: data['@odata.count'] ?? results.length,
      };
    } catch (error) {
      console.error(`[AzureAiSearch] Error searching '${indexConfig.indexName}':`, error);
      return { results: [], totalCount: 0 };
    }
  }
}

// ============================================
// INDEX CONFIGURATIONS
// ============================================

export const CONTENT_INDEX_CONFIG: SearchIndexConfig = {
  indexName: process.env.AZURE_SEARCH_CONTENT_INDEX ?? 'contents-index',
  useSemanticSearch: process.env.AZURE_SEARCH_USE_SEMANTIC !== 'false',
  semanticConfigurationName: process.env.AZURE_SEARCH_SEMANTIC_CONFIG ?? 'contents-semantic-ranker',
  // Match C# ContentSearchResultItem fields (PascalCase in Azure)
  defaultSelect: ['Id', 'Title', 'BodyMetadata', 'Themes', 'Audience', 'Type', 'DurationInSeconds', 'Language'],
  // Match C# vector search configuration
  vectorFields: [
    { field: 'TitleVector', weight: 2.0, kNearestNeighborsCount: 50 },
    { field: 'BodyVector', weight: 1.0, kNearestNeighborsCount: 50 },
  ],
};

export const EXPERT_INDEX_CONFIG: SearchIndexConfig = {
  indexName: process.env.AZURE_SEARCH_EXPERT_INDEX ?? 'expert-index',
  useSemanticSearch: process.env.AZURE_SEARCH_USE_SEMANTIC !== 'false',
  semanticConfigurationName: process.env.AZURE_SEARCH_SEMANTIC_CONFIG ?? 'contents-semantic-ranker',
  defaultSelect: ['id', 'name', 'title', 'specializations', 'languages', 'imageUrl', 'rating', 'bio'],
};

// ============================================
// SPECIALIZED SEARCH SERVICES
// ============================================

export interface ContentSearchRequest {
  searchText: string;
  languageCode?: string;
  types?: ('articles' | 'videos')[] | null;
  pageSize?: number;
  pageIndex?: number;
}

export interface ContentSearchResponse {
  pagedResults: ContentItem[];
  totalCount: number;
}

export interface ExpertSearchRequest {
  searchText: string;
  sessionType?: 'general' | 'physical-wellbeing';
  languages?: string[];
  pageSize?: number;
  pageIndex?: number;
}

export interface ExpertSearchResponse {
  results: Expert[];
  totalCount: number;
}

/**
 * Content Search Service - searches the content index
 */
export class ContentSearchService {
  private readonly client: AzureAiSearchClient;
  private readonly indexConfig: SearchIndexConfig;

  constructor(client?: AzureAiSearchClient, indexConfig?: SearchIndexConfig) {
    this.client = client ?? getAzureSearchClient();
    this.indexConfig = indexConfig ?? CONTENT_INDEX_CONFIG;
  }

  async search(request: ContentSearchRequest): Promise<ContentSearchResponse> {
    // Build filter (matching C# implementation with PascalCase field names)
    const filters: string[] = [];
    if (request.languageCode) {
      filters.push(`Language eq '${request.languageCode}'`);
    }
    if (request.types && request.types.length > 0) {
      const typeFilter = request.types.map(t => `Type eq '${t}'`).join(' or ');
      filters.push(`(${typeFilter})`);
    }

    const response = await this.client.search<ContentItem>(
      this.indexConfig,
      {
        searchText: request.searchText,
        filter: filters.length > 0 ? filters.join(' and ') : undefined,
        top: request.pageSize ?? 3,
        skip: (request.pageIndex ?? 0) * (request.pageSize ?? 3),
        queryType: 'semantic',
      },
      (doc) => {
        // Parse BodyMetadata to extract URL and thumbnail (matching C# MapToContent)
        let url: string | undefined;
        let thumbnailUrl: string | undefined;
        const type = (doc.Type as string)?.toLowerCase() as 'articles' | 'videos';

        if (doc.BodyMetadata) {
          try {
            const metadata = typeof doc.BodyMetadata === 'string'
              ? JSON.parse(doc.BodyMetadata)
              : doc.BodyMetadata;

            if (type === 'videos') {
              url = metadata.Url || metadata.url;
              thumbnailUrl = metadata.CoverImage?.Thumbnail || metadata.coverImage?.thumbnail;
            } else if (type === 'articles') {
              url = metadata.Link || metadata.link;
              thumbnailUrl = metadata.CoverImageUrl || metadata.coverImageUrl;
            }
          } catch {
            // If parsing fails, leave URL/thumbnail undefined
          }
        }

        // Convert DurationInSeconds to readable format
        const durationInSeconds = doc.DurationInSeconds as number | undefined;
        let duration: string | undefined;
        if (durationInSeconds) {
          const minutes = Math.floor(durationInSeconds / 60);
          duration = type === 'videos' ? `${minutes} min` : `${minutes} min read`;
        }

        return {
          id: doc.Id as string,
          title: doc.Title as string,
          description: undefined, // Not in index, could extract from BodyMetadata if needed
          type,
          topic: (doc.Themes as string[])?.[0] || request.searchText,
          duration,
          thumbnailUrl,
          url: url || '',
          language: doc.Language as string,
        };
      }
    );

    return {
      pagedResults: response.results,
      totalCount: response.totalCount,
    };
  }


}

/**
 * Expert Search Service - searches the expert index
 */
export class ExpertSearchService {
  private readonly client: AzureAiSearchClient;
  private readonly indexConfig: SearchIndexConfig;

  constructor(client?: AzureAiSearchClient, indexConfig?: SearchIndexConfig) {
    this.client = client ?? getAzureSearchClient();
    this.indexConfig = indexConfig ?? EXPERT_INDEX_CONFIG;
  }

  async search(request: ExpertSearchRequest): Promise<ExpertSearchResponse> {
    // Build filter
    const filters: string[] = [];
    if (request.sessionType) {
      filters.push(`sessionType eq '${request.sessionType}'`);
    }
    if (request.languages && request.languages.length > 0) {
      const langFilter = request.languages.map(l => `languages/any(lang: lang eq '${l}')`).join(' or ');
      filters.push(`(${langFilter})`);
    }

    // If client not configured, return mock data
    if (!this.client.isConfigured) {
      return this.getMockResults(request);
    }

    const response = await this.client.search<Expert>(
      this.indexConfig,
      {
        searchText: request.searchText,
        filter: filters.length > 0 ? filters.join(' and ') : undefined,
        top: request.pageSize ?? 3,
        skip: (request.pageIndex ?? 0) * (request.pageSize ?? 3),
      },
      (doc) => ({
        id: doc.id as string,
        name: doc.name as string,
        title: doc.title as string,
        specializations: doc.specializations as string[],
        languages: doc.languages as string[],
        imageUrl: doc.imageUrl as string | undefined,
        rating: doc.rating as number | undefined,
        bio: doc.bio as string | undefined,
      })
    );

    return response;
  }

  private getMockResults(request: ExpertSearchRequest): ExpertSearchResponse {
    const sessionType = request.sessionType ?? 'general';

    const experts: Expert[] = [
      {
        id: 'expert_1',
        name: 'Dr. Sarah van Berg',
        title: sessionType === 'general' ? 'Psychologist' : 'Lifestyle Coach',
        specializations: sessionType === 'general'
          ? ['Stress', 'Anxiety', 'Burnout']
          : ['Nutrition', 'Sleep', 'Exercise'],
        languages: ['en-GB', 'nl-NL'],
        rating: 4.9,
        bio: 'Specializing in helping professionals manage stress and find balance.',
      },
      {
        id: 'expert_2',
        name: 'Jan de Vries',
        title: sessionType === 'general' ? 'Counselor' : 'Wellness Coach',
        specializations: sessionType === 'general'
          ? ['Work-life Balance', 'Relationships', 'Self-esteem']
          : ['Energy Management', 'Habits', 'Movement'],
        languages: ['nl-NL', 'en-GB'],
        rating: 4.8,
        bio: 'Passionate about helping people thrive in their personal and professional lives.',
      },
      {
        id: 'expert_3',
        name: 'Emma Thompson',
        title: sessionType === 'general' ? 'Therapist' : 'Health Coach',
        specializations: sessionType === 'general'
          ? ['Depression', 'Grief', 'Life Transitions']
          : ['Weight Management', 'Mindful Eating', 'Recovery'],
        languages: ['en-GB'],
        rating: 4.7,
        bio: 'Supporting individuals through challenging times with compassion and expertise.',
      },
    ];

    // Filter by language if specified
    const filteredExperts = request.languages
      ? experts.filter(e => e.languages.some(l => request.languages!.includes(l)))
      : experts;

    return {
      results: filteredExperts.slice(0, request.pageSize ?? 3),
      totalCount: filteredExperts.length,
    };
  }
}

// ============================================
// SINGLETON INSTANCES
// ============================================

let searchClientInstance: AzureAiSearchClient | null = null;
let contentSearchInstance: ContentSearchService | null = null;
let expertSearchInstance: ExpertSearchService | null = null;

export function getAzureSearchClient(): AzureAiSearchClient {
  searchClientInstance ??= new AzureAiSearchClient();
  return searchClientInstance;
}

export function getContentSearchService(): ContentSearchService {
  contentSearchInstance ??= new ContentSearchService();
  return contentSearchInstance;
}

export function getExpertSearchService(): ExpertSearchService {
  expertSearchInstance ??= new ExpertSearchService();
  return expertSearchInstance;
}

// Legacy export for backward compatibility
export function getAzureAiSearchService(): ContentSearchService {
  return getContentSearchService();
}

// Export type alias for backward compatibility
export type AzureAiSearchService = ContentSearchService;
