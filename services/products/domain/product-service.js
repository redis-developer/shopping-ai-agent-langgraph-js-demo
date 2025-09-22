import ProductRepository from '../data/product-repository.js';
import { AppError, HttpStatusCode } from '../../../lib/errors.js';
import { generateEmbeddings } from '../../ai/helpers/embeddings.js';

const productRepository = new ProductRepository();

/**
 * Find products using semantic search
 * @param {string} query - Search query
 * @param {number} limit - Maximum number of results
 * @param {number} threshold - Similarity threshold
 */
export async function findProductsBySemanticSearch(query, limit = 8, threshold = 0.6) {
    // Generate embedding for the search query
    const queryEmbeddings = await generateEmbeddings([query]);
    const searchVector = queryEmbeddings[0];

    // Use repository for pure data operations
    const products = await productRepository.vectorSearchProducts(searchVector, limit, threshold);
    return products;
}

/**
 * Search products with various filters
 * @param {Object} searchParams - Search parameters
 * @param {string} searchParams.query - Search query
 * @param {string} searchParams.category - Category filter
 * @param {number} searchParams.maxPrice - Maximum price filter
 * @param {number} searchParams.minRating - Minimum rating filter
 * @param {number} searchParams.limit - Maximum results
 * @param {boolean} searchParams.useSemanticSearch - Use semantic search
 */
export async function searchProducts({ query, category, maxPrice, minRating, limit = 8, useSemanticSearch = true }) {
    let products = [];

    // Search strategy decision
    if (query && useSemanticSearch) {
        console.log('🧠 Using semantic search...');
        products = await findProductsBySemanticSearch(query, limit * 2, 0.6); // Lower threshold, get more results
    }

    // Fallback to keyword search if semantic search returns few results
    if (products.length < 3 && query) {
        console.log('🔍 Supplementing with keyword search...');
        const keywordResults = await productRepository.keywordSearchProducts({ query, category, maxPrice, minRating, limit });

        // Merge results, avoiding duplicates
        keywordResults.forEach(product => {
            if (!products.find(p => p.id === product.id)) {
                products.push(product);
            }
        });
    }

    // Apply filters
    if (category) {
        products = products.filter(p =>
            p.category.toLowerCase().includes(category.toLowerCase())
        );
    }

    if (maxPrice) {
        products = products.filter(p => p.salePrice <= maxPrice);
    }

    if (minRating) {
        products = products.filter(p => (p.rating || 0) >= minRating);
    }

    // Sort by relevance (semantic score or rating)
    products.sort((a, b) => {
        if (a.semanticScore && b.semanticScore) {
            return b.semanticScore - a.semanticScore;
        }
        return (b.rating || 0) - (a.rating || 0);
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
        productUrl: `/product/${product.id}` // Add navigation URL
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
 * Find products for a list of ingredient names
 * @param {Array<string>} ingredientNames - Array of ingredient names
 * @returns {Promise<Object>} Ingredient products with suggestions
 */
export async function findProductsForIngredients(ingredientNames) {
    console.log(`🚀 Searching for ${ingredientNames.length} ingredients in parallel...`);

    // Parallel product searches for all ingredients
    const searchPromises = ingredientNames.map(async (ingredientName) => {
        const products = await findProductsBySemanticSearch(ingredientName, 1, 0.6);

        if (products.length > 0) {
            const product = products[0];

            return {
                ingredient: ingredientName,
                suggestedProduct: {
                    id: product.id,
                    name: product.name,
                    brand: product.brand || 'Generic',
                    price: product.salePrice,
                    category: product.category,
                    rating: product.rating,
                }
            };
        } else {
            console.log(`❌ No product found for: ${ingredientName}`);
            return {
                ingredient: ingredientName,
                suggestedProduct: null
            };
        }
    });

    // Wait for all searches to complete in parallel
    const ingredientProducts = await Promise.all(searchPromises);
    console.log(`🎯 Completed ${ingredientProducts.length} ingredient searches in parallel`);

    return {
        totalIngredients: ingredientNames.length,
        ingredientProducts: ingredientProducts,
        message: "Here are the ingredients with quick product suggestions!"
    };
}

/**
 * Get product by ID
 * @param {string} productId - Product ID
 * @returns {Promise<Object|null>} Product or null if not found
 */
export async function getProductById(productId) {
    return await productRepository.getProductById(productId);
}
