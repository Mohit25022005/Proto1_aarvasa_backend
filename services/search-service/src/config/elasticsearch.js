// services/searchEngine.js
const { Client } = require('@elastic/elasticsearch');
const redis = require('redis');

class SearchEngine {
  constructor() {
    this.elasticClient = new Client({ node: process.env.ELASTICSEARCH_URL || 'http://localhost:9200' });
    this.redisClient = redis.createClient({
      url: process.env.REDIS_URL || 'redis://localhost:6379'
    });
    this.cacheExpiry = 300; // 5 minutes
  }

  async initialize() {
    await this.redisClient.connect();
    await this.setupElasticsearchIndex();
  }

  async setupElasticsearchIndex() {
    const indexExists = await this.elasticClient.indices.exists({ index: 'listings' });
    
    if (!indexExists) {
      await this.elasticClient.indices.create({
        index: 'listings',
        body: {
          mappings: {
            properties: {
              title: { 
                type: 'text', 
                analyzer: 'standard',
                fields: {
                  keyword: { type: 'keyword' },
                  suggest: { 
                    type: 'completion',
                    analyzer: 'simple'
                  }
                }
              },
              description: { type: 'text', analyzer: 'standard' },
              category: { type: 'keyword' },
              price: { type: 'float' },
              location: {
                type: 'geo_point'
              },
              tags: { type: 'keyword' },
              status: { type: 'keyword' },
              created_at: { type: 'date' },
              updated_at: { type: 'date' },
              user_id: { type: 'keyword' },
              views: { type: 'integer' },
              rating: { type: 'float' }
            }
          },
          settings: {
            analysis: {
              analyzer: {
                custom_text_analyzer: {
                  tokenizer: 'standard',
                  filter: ['lowercase', 'stop', 'stemmer']
                }
              }
            }
          }
        }
      });
    }
  }

  // Advanced search with multiple filters and ranking
  async search(params) {
    const {
      query = '',
      category = '',
      priceMin = 0,
      priceMax = 999999,
      location = null,
      radius = 10,
      tags = [],
      sortBy = 'relevance',
      sortOrder = 'desc',
      page = 1,
      limit = 20,
      filters = {}
    } = params;

    const cacheKey = `search:${JSON.stringify(params)}`;
    
    // Check cache first
    try {
      const cached = await this.redisClient.get(cacheKey);
      if (cached) {
        return JSON.parse(cached);
      }
    } catch (error) {
      console.warn('Redis cache error:', error.message);
    }

    const searchBody = {
      query: this.buildQuery(query, category, priceMin, priceMax, location, radius, tags, filters),
      sort: this.buildSort(sortBy, sortOrder),
      from: (page - 1) * limit,
      size: limit,
      highlight: {
        fields: {
          title: {},
          description: {}
        }
      },
      aggs: {
        categories: {
          terms: { field: 'category', size: 20 }
        },
        price_ranges: {
          range: {
            field: 'price',
            ranges: [
              { to: 100 },
              { from: 100, to: 500 },
              { from: 500, to: 1000 },
              { from: 1000 }
            ]
          }
        },
        popular_tags: {
          terms: { field: 'tags', size: 10 }
        }
      }
    };

    try {
      const response = await this.elasticClient.search({
        index: 'listings',
        body: searchBody
      });

      const result = {
        listings: response.body.hits.hits.map(hit => ({
          id: hit._id,
          score: hit._score,
          ...hit._source,
          highlights: hit.highlight
        })),
        total: response.body.hits.total.value,
        aggregations: response.body.aggregations,
        page,
        limit,
        totalPages: Math.ceil(response.body.hits.total.value / limit)
      };

      // Cache the result
      try {
        await this.redisClient.setEx(cacheKey, this.cacheExpiry, JSON.stringify(result));
      } catch (error) {
        console.warn('Redis cache set error:', error.message);
      }

      return result;
    } catch (error) {
      console.error('Elasticsearch search error:', error);
      throw new Error('Search service unavailable');
    }
  }

  buildQuery(query, category, priceMin, priceMax, location, radius, tags, filters) {
    const must = [];
    const filter = [];
    const should = [];

    // Text search with boosting
    if (query) {
      must.push({
        multi_match: {
          query,
          fields: ['title^3', 'description^1', 'tags^2'],
          type: 'best_fields',
          fuzziness: 'AUTO'
        }
      });

      // Boost exact matches
      should.push({
        match_phrase: {
          title: {
            query,
            boost: 5
          }
        }
      });
    }

    // Category filter
    if (category) {
      filter.push({ term: { category } });
    }

    // Price range
    filter.push({
      range: {
        price: {
          gte: priceMin,
          lte: priceMax
        }
      }
    });

    // Location-based search
    if (location && location.lat && location.lon) {
      filter.push({
        geo_distance: {
          distance: `${radius}km`,
          location: {
            lat: location.lat,
            lon: location.lon
          }
        }
      });
    }

    // Tags filter
    if (tags && tags.length > 0) {
      filter.push({
        terms: { tags }
      });
    }

    // Additional filters
    Object.entries(filters).forEach(([key, value]) => {
      if (value !== undefined && value !== null && value !== '') {
        filter.push({ term: { [key]: value } });
      }
    });

    // Only active listings
    filter.push({ term: { status: 'active' } });

    return {
      bool: {
        must: must.length > 0 ? must : [{ match_all: {} }],
        filter,
        should: should.length > 0 ? should : undefined,
        minimum_should_match: should.length > 0 ? 1 : undefined
      }
    };
  }

  buildSort(sortBy, sortOrder) {
    const order = sortOrder === 'asc' ? 'asc' : 'desc';
    
    switch (sortBy) {
      case 'price':
        return [{ price: { order } }];
      case 'date':
        return [{ created_at: { order } }];
      case 'popularity':
        return [{ views: { order } }, { rating: { order } }];
      case 'rating':
        return [{ rating: { order } }];
      case 'relevance':
      default:
        return ['_score'];
    }
  }

  // Autocomplete suggestions
  async getSuggestions(query, limit = 10) {
    const cacheKey = `suggestions:${query}:${limit}`;
    
    try {
      const cached = await this.redisClient.get(cacheKey);
      if (cached) {
        return JSON.parse(cached);
      }
    } catch (error) {
      console.warn('Redis cache error:', error.message);
    }

    try {
      const response = await this.elasticClient.search({
        index: 'listings',
        body: {
          suggest: {
            title_suggest: {
              prefix: query,
              completion: {
                field: 'title.suggest',
                size: limit
              }
            }
          }
        }
      });

      const suggestions = response.body.suggest.title_suggest[0].options.map(option => ({
        text: option.text,
        score: option._score
      }));

      try {
        await this.redisClient.setEx(cacheKey, 60, JSON.stringify(suggestions)); // 1 minute cache
      } catch (error) {
        console.warn('Redis cache set error:', error.message);
      }

      return suggestions;
    } catch (error) {
      console.error('Suggestions error:', error);
      return [];
    }
  }

  // Similar listings
  async getSimilarListings(listingId, limit = 5) {
    try {
      // Get the original listing
      const listing = await this.elasticClient.get({
        index: 'listings',
        id: listingId
      });

      const response = await this.elasticClient.search({
        index: 'listings',
        body: {
          query: {
            more_like_this: {
              fields: ['title', 'description', 'category', 'tags'],
              like: [
                {
                  _index: 'listings',
                  _id: listingId
                }
              ],
              min_term_freq: 1,
              max_query_terms: 12
            }
          },
          size: limit
        }
      });

      return response.body.hits.hits.map(hit => ({
        id: hit._id,
        score: hit._score,
        ...hit._source
      }));
    } catch (error) {
      console.error('Similar listings error:', error);
      return [];
    }
  }

  // Analytics and trending
  async getTrendingSearches(limit = 10) {
    const cacheKey = 'trending_searches';
    
    try {
      const cached = await this.redisClient.get(cacheKey);
      if (cached) {
        return JSON.parse(cached);
      }
    } catch (error) {
      console.warn('Redis cache error:', error.message);
    }

    // This would typically come from search analytics
    // For now, return popular categories
    try {
      const response = await this.elasticClient.search({
        index: 'listings',
        body: {
          size: 0,
          aggs: {
            trending_categories: {
              terms: {
                field: 'category',
                size: limit
              }
            }
          }
        }
      });

      const trending = response.body.aggregations.trending_categories.buckets.map(bucket => ({
        term: bucket.key,
        count: bucket.doc_count
      }));

      try {
        await this.redisClient.setEx(cacheKey, 3600, JSON.stringify(trending)); // 1 hour cache
      } catch (error) {
        console.warn('Redis cache set error:', error.message);
      }

      return trending;
    } catch (error) {
      console.error('Trending searches error:', error);
      return [];
    }
  }

  // Index a new listing
  async indexListing(listing) {
    try {
      await this.elasticClient.index({
        index: 'listings',
        id: listing.id,
        body: listing
      });
      
      // Clear related caches
      await this.clearSearchCache();
    } catch (error) {
      console.error('Index listing error:', error);
      throw error;
    }
  }

  // Update listing
  async updateListing(id, updates) {
    try {
      await this.elasticClient.update({
        index: 'listings',
        id,
        body: {
          doc: updates
        }
      });
      
      await this.clearSearchCache();
    } catch (error) {
      console.error('Update listing error:', error);
      throw error;
    }
  }

  // Delete listing
  async deleteListing(id) {
    try {
      await this.elasticClient.delete({
        index: 'listings',
        id
      });
      
      await this.clearSearchCache();
    } catch (error) {
      console.error('Delete listing error:', error);
      throw error;
    }
  }

  async clearSearchCache() {
    try {
      const keys = await this.redisClient.keys('search:*');
      if (keys.length > 0) {
        await this.redisClient.del(keys);
      }
    } catch (error) {
      console.warn('Cache clear error:', error.message);
    }
  }

  async close() {
    await this.redisClient.quit();
    await this.elasticClient.close();
  }
}

module.exports = SearchEngine;