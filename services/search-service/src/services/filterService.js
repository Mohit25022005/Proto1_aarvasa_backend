// services/filterService.js
class FilterService {
    constructor() {
      this.allowedFilters = {
        // String filters
        status: { type: 'string', values: ['active', 'inactive', 'pending', 'sold'] },
        condition: { type: 'string', values: ['new', 'like_new', 'good', 'fair', 'poor'] },
        user_id: { type: 'string' },
        
        // Numeric filters
        views: { type: 'number', min: 0 },
        rating: { type: 'number', min: 0, max: 5 },
        bedrooms: { type: 'number', min: 0, max: 20 },
        bathrooms: { type: 'number', min: 0, max: 20 },
        area: { type: 'number', min: 0 },
        
        // Boolean filters
        featured: { type: 'boolean' },
        negotiable: { type: 'boolean' },
        urgent: { type: 'boolean' },
        
        // Date filters
        created_after: { type: 'date' },
        created_before: { type: 'date' },
        updated_after: { type: 'date' },
        updated_before: { type: 'date' },
        
        // Array filters
        amenities: { type: 'array' },
        payment_methods: { type: 'array' }
      };
    }
  
    sanitizeFilters(filters) {
      const sanitized = {};
  
      Object.entries(filters).forEach(([key, value]) => {
        if (this.allowedFilters[key] && value !== undefined && value !== null && value !== '') {
          const filterConfig = this.allowedFilters[key];
          const sanitizedValue = this.sanitizeFilterValue(value, filterConfig);
          
          if (sanitizedValue !== null) {
            sanitized[key] = sanitizedValue;
          }
        }
      });
  
      return sanitized;
    }
  
    sanitizeFilterValue(value, config) {
      try {
        switch (config.type) {
          case 'string':
            const stringValue = String(value).trim();
            if (config.values && !config.values.includes(stringValue)) {
              return null;
            }
            return stringValue;
  
          case 'number':
            const numValue = Number(value);
            if (isNaN(numValue)) return null;
            if (config.min !== undefined && numValue < config.min) return null;
            if (config.max !== undefined && numValue > config.max) return null;
            return numValue;
  
          case 'boolean':
            if (typeof value === 'boolean') return value;
            const boolString = String(value).toLowerCase();
            return boolString === 'true' || boolString === '1';
  
          case 'date':
            const date = new Date(value);
            return isNaN(date.getTime()) ? null : date.toISOString();
  
          case 'array':
            if (Array.isArray(value)) {
              return value.filter(item => item !== null && item !== undefined && item !== '');
            }
            // Handle comma-separated string
            return String(value).split(',').map(item => item.trim()).filter(Boolean);
  
          default:
            return String(value).trim();
        }
      } catch (error) {
        console.warn(`Filter sanitization error for ${config.type}:`, error);
        return null;
      }
    }
  
    buildElasticsearchFilters(filters) {
      const esFilters = [];
  
      Object.entries(filters).forEach(([key, value]) => {
        const config = this.allowedFilters[key];
        if (!config) return;
  
        switch (config.type) {
          case 'string':
          case 'boolean':
            esFilters.push({ term: { [key]: value } });
            break;
  
          case 'number':
            esFilters.push({ term: { [key]: value } });
            break;
  
          case 'array':
            if (Array.isArray(value) && value.length > 0) {
              esFilters.push({ terms: { [key]: value } });
            }
            break;
  
          case 'date':
            // Handle date range filters
            if (key.endsWith('_after')) {
              const fieldName = key.replace('_after', '');
              esFilters.push({ range: { [fieldName]: { gte: value } } });
            } else if (key.endsWith('_before')) {
              const fieldName = key.replace('_before', '');
              esFilters.push({ range: { [fieldName]: { lte: value } } });
            }
            break;
  
          default:
            esFilters.push({ term: { [key]: value } });
        }
      });
  
      return esFilters;
    }
  
    // Build facet aggregations for filtering UI
    buildFacetAggregations() {
      return {
        categories: {
          terms: { field: 'category', size: 50 }
        },
        status: {
          terms: { field: 'status' }
        },
        condition: {
          terms: { field: 'condition' }
        },
        price_ranges: {
          range: {
            field: 'price',
            ranges: [
              { key: '0-100', to: 100 },
              { key: '100-500', from: 100, to: 500 },
              { key: '500-1000', from: 500, to: 1000 },
              { key: '1000-5000', from: 1000, to: 5000 },
              { key: '5000+', from: 5000 }
            ]
          }
        },
        rating_ranges: {
          range: {
            field: 'rating',
            ranges: [
              { key: '4-5', from: 4, to: 5 },
              { key: '3-4', from: 3, to: 4 },
              { key: '2-3', from: 2, to: 3 },
              { key: '1-2', from: 1, to: 2 }
            ]
          }
        },
        bedrooms: {
          terms: { field: 'bedrooms', size: 10 }
        },
        bathrooms: {
          terms: { field: 'bathrooms', size: 10 }
        },
        amenities: {
          terms: { field: 'amenities', size: 20 }
        },
        featured: {
          terms: { field: 'featured' }
        },
        creation_date: {
          date_histogram: {
            field: 'created_at',
            calendar_interval: 'month',
            format: 'yyyy-MM'
          }
        }
      };
    }
  
    // Validate filter combinations
    validateFilterCombinations(filters) {
      const errors = [];
  
      // Check price range logic
      if (filters.priceMin && filters.priceMax && filters.priceMin > filters.priceMax) {
        errors.push('Minimum price cannot be greater than maximum price');
      }
  
      // Check date range logic
      if (filters.created_after && filters.created_before) {
        const after = new Date(filters.created_after);
        const before = new Date(filters.created_before);
        if (after > before) {
          errors.push('Start date cannot be after end date');
        }
      }
  
      // Check numeric ranges
      if (filters.bedrooms && (filters.bedrooms < 0 || filters.bedrooms > 20)) {
        errors.push('Bedrooms must be between 0 and 20');
      }
  
      if (filters.bathrooms && (filters.bathrooms < 0 || filters.bathrooms > 20)) {
        errors.push('Bathrooms must be between 0 and 20');
      }
  
      if (filters.rating && (filters.rating < 0 || filters.rating > 5)) {
        errors.push('Rating must be between 0 and 5');
      }
  
      return errors;
    }
  
    // Get filter suggestions based on current filters
    getFilterSuggestions(currentFilters, searchResults) {
      const suggestions = {
        categories: [],
        priceRanges: [],
        locations: [],
        tags: []
      };
  
      if (searchResults && searchResults.aggregations) {
        const aggs = searchResults.aggregations;
  
        // Category suggestions
        if (aggs.categories && aggs.categories.buckets) {
          suggestions.categories = aggs.categories.buckets
            .filter(bucket => bucket.key !== currentFilters.category)
            .slice(0, 5)
            .map(bucket => ({
              value: bucket.key,
              count: bucket.doc_count,
              label: this.formatCategoryLabel(bucket.key)
            }));
        }
  
        // Price range suggestions
        if (aggs.price_ranges && aggs.price_ranges.buckets) {
          suggestions.priceRanges = aggs.price_ranges.buckets
            .filter(bucket => bucket.doc_count > 0)
            .map(bucket => ({
              key: bucket.key,
              count: bucket.doc_count,
              from: bucket.from,
              to: bucket.to
            }));
        }
      }
  
      return suggestions;
    }
  
    formatCategoryLabel(category) {
      return category.split('_')
        .map(word => word.charAt(0).toUpperCase() + word.slice(1))
        .join(' ');
    }
  
    // Smart filter recommendations based on user behavior
    getSmartFilterRecommendations(userHistory, currentSearch) {
      const recommendations = [];
  
      // Analyze user's search history patterns
      if (userHistory && userHistory.length > 0) {
        const commonCategories = this.getCommonValues(userHistory, 'category');
        const commonPriceRanges = this.getCommonPriceRanges(userHistory);
        const commonLocations = this.getCommonValues(userHistory, 'location');
  
        // Recommend frequently used categories
        commonCategories.forEach(category => {
          if (category !== currentSearch.category) {
            recommendations.push({
              type: 'category',
              value: category.value,
              reason: `You often search in ${category.value}`,
              confidence: category.frequency
            });
          }
        });
  
        // Recommend similar price ranges
        commonPriceRanges.forEach(range => {
          recommendations.push({
            type: 'price_range',
            value: range,
            reason: 'Based on your usual price range',
            confidence: 0.7
          });
        });
      }
  
      return recommendations.sort((a, b) => b.confidence - a.confidence).slice(0, 3);
    }
  
    getCommonValues(history, field) {
      const counts = {};
      history.forEach(search => {
        if (search[field]) {
          counts[search[field]] = (counts[search[field]] || 0) + 1;
        }
      });
  
      return Object.entries(counts)
        .map(([value, count]) => ({
          value,
          frequency: count / history.length
        }))
        .filter(item => item.frequency > 0.2)
        .sort((a, b) => b.frequency - a.frequency);
    }
  
    getCommonPriceRanges(history) {
      const ranges = history
        .filter(search => search.priceMin && search.priceMax)
        .map(search => ({ min: search.priceMin, max: search.priceMax }));
  
      if (ranges.length === 0) return [];
  
      // Calculate average price range
      const avgMin = ranges.reduce((sum, range) => sum + range.min, 0) / ranges.length;
      const avgMax = ranges.reduce((sum, range) => sum + range.max, 0) / ranges.length;
  
      return [{
        min: Math.floor(avgMin * 0.8),
        max: Math.ceil(avgMax * 1.2)
      }];
    }
  }
  
  module.exports = FilterService;