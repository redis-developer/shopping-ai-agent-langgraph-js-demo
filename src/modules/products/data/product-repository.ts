import { getRedisClient } from '../../db/redis-client.ts';

/** Products are stored as JSON under a key made of this prefix and the product ID */
export const PRODUCT_KEY_PREFIX = 'products:';
export const PRODUCT_KEY_TEMPLATE = `${PRODUCT_KEY_PREFIX}{id}`;

/** A product as stored in Redis. The vector search only returns some of the fields. */
export type Product = {
    id: string;
    name: string;
    category: string;
    subCategory?: string;
    brand?: string;
    salePrice: number;
    marketPrice: number;
    type?: string;
    rating: number;
    description?: string;
    discount?: number;
    isOnSale?: boolean | string;
    productInfoEmbeddings?: number[];
    semanticScore?: number;
};

export type ProductSearchCriteria = {
    query?: string;
    category?: string;
    maxPrice?: number;
    minRating?: number;
    limit?: number;
};

export default class ProductRepository {

    /**
     * Perform vector search using pre-generated embeddings
     * @param searchVector - Pre-generated embedding vector
     * @param limit - Number of results to return
     */
    async vectorSearchProducts(searchVector: number[], limit = 10): Promise<Product[]> {
        const client = await getRedisClient();
        // Convert embedding to bytes for Redis
        const vectorBytes = Buffer.from(new Float32Array(searchVector).buffer);

        // Use Redis Vector Search with FT.SEARCH
        const searchQuery = `*=>[KNN ${limit} @embedding $vector AS score]`;

        const results = await client.ft.search('idx:products', searchQuery, {
            PARAMS: {
                vector: vectorBytes
            },
            RETURN: ['id', 'name', 'brand', 'category', 'salePrice', 'marketPrice', 'rating', 'score', 'isOnSale'],
            DIALECT: 2,
            LIMIT: { from: 0, size: limit }
        });

        const products: Product[] = [];
        for (const doc of results.documents) {
            const similarity = 1 - parseFloat(doc.value.score as string);
            const productId = doc.id.replace(PRODUCT_KEY_PREFIX, '');
            products.push({
                id: productId,
                name: doc.value.name as string,
                brand: (doc.value.brand as string) || 'Generic',
                category: doc.value.category as string,
                salePrice: parseFloat(doc.value.salePrice as string) || 0,
                marketPrice: parseFloat(doc.value.marketPrice as string) || 0,
                isOnSale: doc.value.isOnSale as string,
                rating: parseFloat(doc.value.rating as string) || 0,
                semanticScore: similarity
            });
        }
        console.log(`Found ${products.length} products`);
        return products;
    }

    /**
     * Traditional keyword-based product search using Redis FT.SEARCH
     */
    async keywordSearchProducts(criteria: ProductSearchCriteria = {}): Promise<Product[]> {
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
            filters.push(`@salePrice:[0 ${maxPrice}]`);
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
        const products: Product[] = [];
        for (const doc of results.documents) {
            try {
                const product = await client.json.get(doc.id, { path: '$' }) as Product[] | null;
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
     * @param productId - The product ID
     */
    async getProductById(productId: string): Promise<Product | null> {
        const client = await getRedisClient();
        const product = await client.json.get(`${PRODUCT_KEY_PREFIX}${productId}`, { path: '$' }) as Product[] | null;
        return product ? product[0] : null;
    }

    /**
     * Get multiple products by IDs
     * @param productIds - Array of product IDs
     */
    async getProductsByIds(productIds: string[]): Promise<Product[]> {
        const client = await getRedisClient();
        const products: Product[] = [];
        const pipeline = client.multi();
        
        // Queue all requests
        productIds.forEach(id => {
            pipeline.json.get(`${PRODUCT_KEY_PREFIX}${id}`, { path: '$' });
        });
        
        const results = await pipeline.exec() as unknown as { result?: Product[] }[];
        
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
     * @param category - Category name
     * @param limit - Number of products to return
     */
    async getProductsByCategory(category: string, limit = 20): Promise<Product[]> {
        const client = await getRedisClient();
        const results = await client.ft.search('idx:products', `@category:{${category}}`, {
            LIMIT: { from: 0, size: limit },
            DIALECT: 2
        });
        
        const products: Product[] = [];
        for (const doc of results.documents) {
            try {
                const product = await client.json.get(doc.id, { path: '$' }) as Product[] | null;
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
