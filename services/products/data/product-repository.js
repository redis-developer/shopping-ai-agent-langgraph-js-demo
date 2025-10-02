import CONFIG from '../../../config.js';
import { getRedisClient } from '../../db/redis-client.js';

export default class ProductRepository {

    /**
     * Perform vector search using pre-generated embeddings
     * @param {Float32Array} searchVector - Pre-generated embedding vector
     * @param {number} limit - Number of results to return
     * @param {number} threshold - Similarity threshold (0-1, default: 0.7)
     */
    async vectorSearchProducts(searchVector, limit = 10, threshold = 0.5) {
        const client = await getRedisClient();
        // Convert embedding to bytes for Redis
        const vectorBytes = Buffer.from(new Float32Array(searchVector).buffer);

        // Use Redis Vector Search with FT.SEARCH
        const searchQuery = `*=>[KNN ${limit} @embedding $vector AS score]`;

        const results = await client.ft.search('idx:products', searchQuery, {
            PARAMS: {
                vector: vectorBytes
            },
            RETURN: ['id', 'name', 'brand', 'category', 'price', 'salePrice', 'marketPrice', 'rating', 'score', 'isOnSale'],
            DIALECT: 2,
            LIMIT: { from: 0, size: limit }
        });

        const products = [];
        for (const doc of results.documents) {
            const similarity = 1 - parseFloat(doc.value.score);
            const productId = doc.id.replace('products:', '');
            products.push({
                id: productId,
                name: doc.value.name,
                brand: doc.value.brand || 'Generic',
                category: doc.value.category,
                salePrice: parseFloat(doc.value.salePrice) || 0,
                marketPrice: parseFloat(doc.value.marketPrice) || 0,
                isOnSale: doc.value.isOnSale,
                rating: parseFloat(doc.value.rating) || 0,
                semanticScore: similarity
            });
        }
        console.log(`Found ${products.length} products`);
        return products;
    }

    /**
     * Traditional keyword-based product search using Redis FT.SEARCH
     */
    async keywordSearchProducts(criteria = {}) {
        const client = await getRedisClient();
        const { query, category, maxPrice, minRating, limit = 20 } = criteria;
        
        let searchQuery = '*';
        const filters = [];
        
        // Build search query
        if (query) {
            const searchTerms = query.toLowerCase().split(/\s+/).join(' | ');
            searchQuery = `@name:(${searchTerms}) | @description:(${searchTerms})`;
        }
        
        // Add filters
        if (category) {
            filters.push(`@category:{${category}}`);
        }
        
        if (maxPrice) {
            filters.push(`@price:[0 ${maxPrice}]`);
        }
        
        if (minRating) {
            filters.push(`@rating:[${minRating} +inf]`);
        }
        
        // Combine query and filters
        if (filters.length > 0) {
            searchQuery = filters.length > 0 ? `(${searchQuery}) ${filters.join(' ')}` : searchQuery;
        }
        
        const results = await client.ft.search('idx:products', searchQuery, {
            LIMIT: { from: 0, size: limit },
            SORTBY: 'rating',
            DIALECT: 2
        });
        
        // Fetch full product details
        const products = [];
        for (const doc of results.documents) {
            try {
                const product = await client.json.get(doc.id, { path: '$' });
                if (product && product[0]) {
                    products.push(product[0]);
                }
            } catch (err) {
                continue;
            }
        }
        
        return products;
    }

    /**
     * Get product by ID
     * @param {string} productId - The product ID
     * @returns {Promise<Object|null>} Product object or null if not found
     */
    async getProductById(productId) {
        const client = await getRedisClient();
        const product = await client.json.get(`products:${productId}`, { path: '$' });
        return product ? product[0] : null;
    }

    /**
     * Get multiple products by IDs
     * @param {string[]} productIds - Array of product IDs
     * @returns {Promise<Object[]>} Array of product objects
     */
    async getProductsByIds(productIds) {
        const client = await getRedisClient();
        const products = [];
        const pipeline = client.multi();
        
        // Queue all requests
        productIds.forEach(id => {
            pipeline.json.get(`products:${id}`, { path: '$' });
        });
        
        const results = await pipeline.exec();
        
        // Process results
        results.forEach((result, index) => {
            if (result.result && result.result[0]) {
                products.push(result.result[0]);
            } else {
                console.warn(`Product not found: ${productIds[index]}`);
            }
        });
        
        return products;
    }

    /**
     * Get products by category
     * @param {string} category - Category name
     * @param {number} limit - Number of products to return
     * @returns {Promise<Object[]>} Array of product objects
     */
    async getProductsByCategory(category, limit = 20) {
        const client = await getRedisClient();
        const results = await client.ft.search('idx:products', `@category:{${category}}`, {
            LIMIT: { from: 0, size: limit },
            DIALECT: 2
        });
        
        const products = [];
        for (const doc of results.documents) {
            try {
                const product = await client.json.get(doc.id, { path: '$' });
                if (product && product[0]) {
                    products.push(product[0]);
                }
            } catch (err) {
                continue;
            }
        }
        
        return products;
    }
}
