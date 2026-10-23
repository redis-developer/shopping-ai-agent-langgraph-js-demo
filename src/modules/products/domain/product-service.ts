import ProductRepository from '../data/product-repository.ts';
import type { Product } from '../data/product-repository.ts';
import { AppError, ErrorType } from '#lib/errors';
import { embed } from '#modules/ai/providers/index';

const productRepository = new ProductRepository();

/** The few product fields shown on a product card in the chat */
export type ProductSummary = {
    id: string;
    name: string;
    price: number;
    image: string;
    rating: number;
};

// Stands in for a product image until the catalog has real ones
const CATEGORY_EMOJIS: Record<string, string> = {
    'Fruits & Vegetables': '🥗',
    'Bakery, Cakes & Dairy': '🥛🍞',
    'Eggs, Meat & Fish': '🥩🐟',
    'Foodgrains, Oil & Masala': '🌾',
    'Snacks & Branded Foods': '🥘',
    'Beverages': '🥤',
    'Gourmet & World Food': '🍝',
    'Kitchen, Garden & Pets': '🏡'
};

/**
 * Get the image to show for a product
 * @param category - The product's category
 * @returns An emoji for the category, or a shopping cart for categories without one
 */
export function getProductImage(category: string) {
    return CATEGORY_EMOJIS[category] || '🛒';
}

/**
 * Find products using semantic search
 * @param query - Search query
 * @param limit - Maximum number of results
 */
export async function findProductsBySemanticSearch(query: string, limit = 8) {
    // Generate embedding for the search query
    const queryEmbeddings = await embed([query]);
    const searchVector = queryEmbeddings[0];

    // Use repository for pure data operations
    const products = await productRepository.vectorSearchProducts(searchVector, limit);
    return products;
}

/**
 * Search products with various filters
 * @param searchParams - Search parameters
 * @param searchParams.query - Search query
 * @param searchParams.category - Category filter
 * @param searchParams.maxPrice - Maximum price filter
 * @param searchParams.minRating - Minimum rating filter
 * @param searchParams.limit - Maximum results
 * @param searchParams.useSemanticSearch - Use semantic search
 */
export async function searchProducts({ query, category, maxPrice, minRating, limit = 8, useSemanticSearch = true }: {
    query?: string;
    category?: string;
    maxPrice?: number;
    minRating?: number;
    limit?: number;
    useSemanticSearch?: boolean;
}) {
    let products: Product[] = [];

    // Search strategy decision
    if (query && useSemanticSearch) {
        console.log('✨🔎 Using semantic search...');
        products = await findProductsBySemanticSearch(query, limit * 2); // Ask for more than needed, so the filters below still leave enough
    }

    // Fallback to keyword search if semantic search returns few results
    if (products.length < 3 && query) {
        console.log('🔍 Supplementing with keyword search...');
        const keywordResults = await productRepository.keywordSearchProducts({ query, category, maxPrice, minRating, limit });

        // Merge results, avoiding duplicates
        keywordResults.forEach(product => {
            if (!products.find(existingProduct => existingProduct.id === product.id)) {
                products.push(product);
            }
        });
    }

    // Apply filters
    if (category) {
        products = products.filter(product =>
            product.category.toLowerCase().includes(category.toLowerCase())
        );
    }

    if (maxPrice) {
        products = products.filter(product => product.salePrice <= maxPrice);
    }

    if (minRating) {
        products = products.filter(product => (product.rating || 0) >= minRating);
    }

    // Sort by relevance (semantic score or rating)
    products.sort((firstProduct, secondProduct) => {
        if (firstProduct.semanticScore && secondProduct.semanticScore) {
            return secondProduct.semanticScore - firstProduct.semanticScore;
        }
        return (secondProduct.rating || 0) - (firstProduct.rating || 0);
    });

    // Apply limit
    products = products.slice(0, limit);

    // Structure the product data with navigation links
    const structuredProducts = products.map(product => ({
        id: product.id,
        name: product.name,
        brand: product.brand || 'Generic',
        category: product.category,
        salePrice: product.salePrice,
        marketPrice: product.marketPrice,
        discount: product.discount || 0,
        rating: product.rating || 0,
        description: product.description ? product.description.substring(0, 100) : '',
        semanticScore: product.semanticScore || null,
        isOnSale: product.isOnSale || false,
        productUrl: `/products/${product.id}` // Add navigation URL
    }));

    // Calculate summary metrics
    const totalCost = structuredProducts.reduce((sum, product) => sum + product.salePrice, 0);

    return {
        products: structuredProducts,
        totalFound: structuredProducts.length,
        totalCost,
        searchType: useSemanticSearch ? "semantic" : "keyword"
    };
}

/**
 * Get product by ID
 * @param productId - Product ID
 */
export async function getProductById(productId: string) {
    return await productRepository.getProductById(productId);
}
