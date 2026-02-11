# Azure AI Search Integration

This document describes how the OpenUp LangGraph system integrates with Azure AI Search for content and expert search.

## Overview

The system uses a **generic Azure AI Search client** that can work with multiple indexes for different use cases:

- **Content Index**: Articles, videos, wellbeing resources
- **Expert Index**: Therapists, coaches, counselors

## Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                    AzureAiSearchClient                      │
│                     (Generic Client)                        │
│                                                             │
│  • Handles authentication                                   │
│  • Executes search queries                                  │
│  • Supports semantic search                                 │
└─────────────────┬───────────────────────┬───────────────────┘
                  │                       │
                  ▼                       ▼
┌─────────────────────────┐   ┌─────────────────────────┐
│  ContentSearchService   │   │  ExpertSearchService    │
│                         │   │                         │
│  Index: content-index   │   │  Index: expert-index    │
│  Fields: title, type,   │   │  Fields: name, title,   │
│          topic, url...  │   │          specializations│
└─────────────────────────┘   └─────────────────────────┘
```

## Configuration

### Environment Variables

```bash
# Azure AI Search Connection
AZURE_SEARCH_ENDPOINT=https://your-search-service.search.windows.net
AZURE_SEARCH_API_KEY=your-admin-or-query-key

# Index Names
AZURE_SEARCH_CONTENT_INDEX=contents-index
AZURE_SEARCH_EXPERT_INDEX=expert-index

# Semantic Search (optional)
AZURE_SEARCH_USE_SEMANTIC=true
AZURE_SEARCH_SEMANTIC_CONFIG=default
```

### Index Configuration

Each index has its own configuration in `src/services/azureAiSearch.ts`:

```typescript
export const CONTENT_INDEX_CONFIG: SearchIndexConfig = {
  indexName: process.env.AZURE_SEARCH_CONTENT_INDEX ?? 'contents-index',
  useSemanticSearch: process.env.AZURE_SEARCH_USE_SEMANTIC === 'true',
  semanticConfigurationName: 'default',
  // Note: Azure index uses PascalCase field names
  defaultSelect: ['Id', 'Title', 'BodyMetadata', 'Themes', 'Audience', 'Type', 'DurationInSeconds', 'Language'],
  vectorFields: [
    { field: 'TitleVector', weight: 2.0, kNearestNeighborsCount: 50 },
    { field: 'BodyVector', weight: 1.0, kNearestNeighborsCount: 50 },
  ],
};

export const EXPERT_INDEX_CONFIG: SearchIndexConfig = {
  indexName: process.env.AZURE_SEARCH_EXPERT_INDEX ?? 'expert-index',
  useSemanticSearch: process.env.AZURE_SEARCH_USE_SEMANTIC === 'true',
  semanticConfigurationName: 'default',
  defaultSelect: ['id', 'name', 'title', 'specializations', 'languages', 'imageUrl', 'rating', 'bio'],
};
```

## Usage

### Content Search

```typescript
import { getContentSearchService } from './services/azureAiSearch.js';

const contentService = getContentSearchService();

const results = await contentService.search({
  searchText: 'managing stress',
  languageCode: 'en-GB',           // Filter by language
  types: ['article', 'video'],     // Filter by content type
  pageSize: 3,
  pageIndex: 0,
});

// results.pagedResults: ContentItem[]
// results.totalCount: number
```

### Expert Search

```typescript
import { getExpertSearchService } from './services/azureAiSearch.js';

const expertService = getExpertSearchService();

const results = await expertService.search({
  searchText: 'anxiety counseling',
  sessionType: 'general',          // 'general' or 'physical-wellbeing'
  languages: ['en-GB', 'nl-NL'],   // Filter by expert languages
  pageSize: 3,
});

// results.results: Expert[]
// results.totalCount: number
```

### Custom Index Search

For new indexes, use the generic client directly:

```typescript
import { getAzureSearchClient } from './services/azureAiSearch.js';

const client = getAzureSearchClient();

const results = await client.search<MyCustomType>(
  {
    indexName: 'my-custom-index',
    defaultSelect: ['id', 'field1', 'field2'],
    useSemanticSearch: true,
    semanticConfigurationName: 'my-semantic-config',
  },
  {
    searchText: 'my query',
    filter: "field1 eq 'value'",
    top: 10,
  },
  // Map function to transform raw documents
  (doc) => ({
    id: doc.id as string,
    field1: doc.field1 as string,
    field2: doc.field2 as number,
  })
);
```

## Search Request Options

```typescript
interface SearchRequest {
  searchText: string;           // The search query
  filter?: string;              // OData filter expression
  select?: string[];            // Fields to return
  top?: number;                 // Number of results (default: 10)
  skip?: number;                // Skip N results (for pagination)
  orderBy?: string;             // Sort order
  searchMode?: 'any' | 'all';   // Match any or all terms
  queryType?: 'simple' | 'full' | 'semantic';
  semanticConfiguration?: string;
}
```

## Filter Examples

### Language Filter
```typescript
filter: "Language eq 'en-GB'"
```

### Multiple Content Types
```typescript
filter: "(Type eq 'articles' or Type eq 'videos')"
```

### Expert Session Type
```typescript
filter: "sessionType eq 'general'"
```

### Expert Languages (Collection)
```typescript
filter: "languages/any(lang: lang eq 'en-GB')"
```

### Combined Filters
```typescript
filter: "Language eq 'en-GB' and (Type eq 'articles' or Type eq 'videos')"
```

## Semantic Search

When enabled, semantic search provides more relevant results by understanding the meaning of queries rather than just matching keywords.

### Enable Semantic Search

1. Set environment variable:
   ```bash
   AZURE_SEARCH_USE_SEMANTIC=true
   ```

2. Configure semantic configuration in your Azure AI Search index

3. The search body will automatically include:
   ```json
   {
     "queryType": "semantic",
     "semanticConfiguration": "default"
   }
   ```

### Reference
- [Microsoft Azure AI Search Semantic Search](https://learn.microsoft.com/en-us/azure/search/semantic-search-overview)

## Mock Data (Development)

When Azure AI Search is not configured (no `AZURE_SEARCH_ENDPOINT` or `AZURE_SEARCH_API_KEY`), the services automatically return mock data:

```typescript
// ContentSearchService returns mock articles/videos
// ExpertSearchService returns mock expert profiles

// Check if configured:
const client = getAzureSearchClient();
if (!client.isConfigured) {
  console.log('Using mock data - Azure AI Search not configured');
}
```

This allows local development without Azure credentials.

## Index Schema Examples

### Content Index Schema

> **Note**: The actual Azure index uses PascalCase field names. The service maps these to the application's ContentItem type.

```json
{
  "name": "contents-index",
  "fields": [
    { "name": "Id", "type": "Edm.String", "key": true },
    { "name": "Title", "type": "Edm.String", "searchable": true },
    { "name": "BodyMetadata", "type": "Edm.String", "searchable": true },
    { "name": "Themes", "type": "Collection(Edm.String)", "searchable": true, "filterable": true },
    { "name": "Audience", "type": "Edm.String", "filterable": true },
    { "name": "Type", "type": "Edm.String", "filterable": true },
    { "name": "DurationInSeconds", "type": "Edm.Int32" },
    { "name": "Language", "type": "Edm.String", "filterable": true },
    { "name": "TitleVector", "type": "Collection(Edm.Single)", "searchable": true },
    { "name": "BodyVector", "type": "Collection(Edm.Single)", "searchable": true }
  ]
}
```

### Expert Index Schema

```json
{
  "name": "expert-index",
  "fields": [
    { "name": "id", "type": "Edm.String", "key": true },
    { "name": "name", "type": "Edm.String", "searchable": true },
    { "name": "title", "type": "Edm.String", "searchable": true },
    { "name": "specializations", "type": "Collection(Edm.String)", "searchable": true, "filterable": true },
    { "name": "languages", "type": "Collection(Edm.String)", "filterable": true },
    { "name": "sessionType", "type": "Edm.String", "filterable": true },
    { "name": "imageUrl", "type": "Edm.String" },
    { "name": "rating", "type": "Edm.Double", "sortable": true },
    { "name": "bio", "type": "Edm.String", "searchable": true }
  ]
}
```

## Adding a New Search Service

To add support for a new index:

### 1. Define Index Configuration

```typescript
// src/services/azureAiSearch.ts

export const MY_NEW_INDEX_CONFIG: SearchIndexConfig = {
  indexName: process.env.AZURE_SEARCH_MY_INDEX ?? 'my-index',
  useSemanticSearch: true,
  semanticConfigurationName: 'default',
  defaultSelect: ['id', 'field1', 'field2'],
};
```

### 2. Create Search Service Class

```typescript
export interface MySearchRequest {
  searchText: string;
  myFilter?: string;
  pageSize?: number;
}

export interface MySearchResponse {
  results: MyType[];
  totalCount: number;
}

export class MySearchService {
  private readonly client: AzureAiSearchClient;
  private readonly indexConfig: SearchIndexConfig;

  constructor(client?: AzureAiSearchClient, indexConfig?: SearchIndexConfig) {
    this.client = client ?? getAzureSearchClient();
    this.indexConfig = indexConfig ?? MY_NEW_INDEX_CONFIG;
  }

  async search(request: MySearchRequest): Promise<MySearchResponse> {
    if (!this.client.isConfigured) {
      return this.getMockResults(request);
    }

    const response = await this.client.search<MyType>(
      this.indexConfig,
      {
        searchText: request.searchText,
        filter: request.myFilter,
        top: request.pageSize ?? 10,
      },
      (doc) => ({
        id: doc.id as string,
        field1: doc.field1 as string,
        // ... map other fields
      })
    );

    return response;
  }

  private getMockResults(request: MySearchRequest): MySearchResponse {
    // Return mock data for development
    return { results: [], totalCount: 0 };
  }
}
```

### 3. Add Singleton Getter

```typescript
let mySearchInstance: MySearchService | null = null;

export function getMySearchService(): MySearchService {
  mySearchInstance ??= new MySearchService();
  return mySearchInstance;
}
```

## Troubleshooting

### "Search failed: 401 Unauthorized"
- Check `AZURE_SEARCH_API_KEY` is correct
- Ensure the key has query permissions

### "Search failed: 404 Not Found"
- Check `AZURE_SEARCH_ENDPOINT` format (no trailing slash)
- Verify index name exists

### "No results returned"
- Check filter syntax
- Verify searchable fields in index schema
- Try without filters first

### Semantic search not working
- Ensure semantic configuration is created in the index
- Check `AZURE_SEARCH_USE_SEMANTIC=true`
- Verify `semanticConfigurationName` matches your config

## Related Documentation

- [Microsoft Azure AI Search Documentation](https://learn.microsoft.com/en-us/azure/search/)
- [LangChain on Azure](https://learn.microsoft.com/en-us/azure/developer/javascript/ai/langchain-agent-on-azure)
- [Content Agent](./content-agent.md)
