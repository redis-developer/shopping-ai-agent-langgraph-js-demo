import { tool } from "@langchain/core/tools";
import { z } from "zod";
import CONFIG from '../../../config.js';

// Import service functions
import { getRecipeIngredientsWithProducts, searchProducts } from '../../products/domain/product-service.js';
import { addItemsToCart, getCart, clearCart } from '../../cart/domain/cart-service.js';

// Import helper functions
import { getIngredientsFromLLM, getDirectAnswerFromLLM } from './helpers/llm-helper.js';

/**
 * Tool: Fast Recipe Ingredients
 * Quickly provides ingredient list with ONE suggested product per ingredient
 */
export const fastRecipeIngredientsTool = tool(
    async ({ recipe }) => {
        console.log(`🍳 Fast recipe ingredients for: "${recipe}"`);

        try {
            const result = await getRecipeIngredientsWithProducts(recipe, getIngredientsFromLLM);

            console.log(`🍽️ Found products for products":`);
            result.ingredientProducts.forEach(item => {
                console.log(`- ${item.ingredient} (Quantity: ${item.quantity})`);
            });

            return JSON.stringify({
                type: "recipe_ingredients",
                success: true,
                ...result
            });

        } catch (error) {
            console.error('Error in fast recipe ingredients:', error);
            return JSON.stringify({
                type: "recipe_ingredients",
                success: false,
                error: `Sorry, I had trouble getting ingredients for "${recipe}". Please try rephrasing.`
            });
        }
    },
    {
        name: "fast_recipe_ingredients",
        description: "Quickly get recipe ingredients with ONE suggested product per ingredient. Use for recipe/ingredient questions to provide fast responses.",
        schema: z.object({
            recipe: z.string().describe("The recipe or dish name to get ingredients for")
        })
    }
);

/**
 * Tool: Direct Answer
 * Returns structured data with the answer content
 */
export const directAnswerTool = tool(
    async ({ question }) => {
        console.log(`Direct LLM answer for: "${question}"`);

        try {
            const content = await getDirectAnswerFromLLM(question);

            return JSON.stringify({
                type: "direct_answer",
                success: true,
                content: content,
                question: question
            });

        } catch (error) {
            console.error('Error in direct answer:', error);
            return JSON.stringify({
                type: "direct_answer",
                success: false,
                error: `Sorry, I had trouble answering your question about "${question}". Please try rephrasing.`,
                question: question
            });
        }
    },
    {
        name: "direct_answer",
        description: "Answer general grocery, cooking, and food-related questions using knowledge. Use for cooking tips, food storage, nutrition info, etc.",
        schema: z.object({
            question: z.string().describe("The grocery/cooking question to answer")
        })
    }
);

/**
 * Tool: Search Products
 * Returns structured product data with clickable links
 */
export const searchProductsTool = tool(
    async ({ query, category, maxPrice, minRating, limit = 8, useSemanticSearch = true }) => {
        console.log(`🔍 Searching products: "${query}"`);

        try {
            const result = await searchProducts({
                query,
                category,
                maxPrice,
                minRating,
                limit,
                useSemanticSearch
            });

            if (result.products.length === 0) {
                return JSON.stringify({
                    type: "product_search",
                    success: false,
                    message: `No products found for "${query}". Try different keywords or check the spelling.`,
                    query: query,
                    products: []
                });
            }

            return JSON.stringify({
                type: "product_search",
                success: true,
                query: query,
                ...result
            });

        } catch (error) {
            console.error('Error searching products:', error);
            return JSON.stringify({
                type: "product_search",
                success: false,
                error: `Sorry, I had trouble searching for "${query}". Please try again.`,
                query: query,
                products: []
            });
        }
    },
    {
        name: "search_products",
        description: "Search for specific products in the database. Use when user wants to find actual products to buy or explore more options.",
        schema: z.object({
            query: z.string().describe("Product search query"),
            category: z.string().optional().describe("Product category filter"),
            maxPrice: z.number().optional().describe("Maximum price filter"),
            minRating: z.number().optional().describe("Minimum rating filter"),
            limit: z.number().optional().describe("Maximum number of results (default: 8)"),
            useSemanticSearch: z.boolean().optional().describe("Use AI-powered semantic search (default: true)")
        })
    }
);

/**
 * Tool: Add to Cart
 * Adds products to user's cart
 */
export const addToCartTool = tool(
    async ({ sessionId, productIds, quantities }) => {
        console.log(`🛒 Adding to cart: ${productIds.join(", ")}`);

        try {
            const result = await addItemsToCart(sessionId, productIds, quantities);

            return JSON.stringify({
                type: "cart_operation",
                operation: "add",
                ...result
            });

        } catch (error) {
            console.error('Error adding to cart:', error);
            return JSON.stringify({
                type: "cart_operation",
                operation: "add",
                success: false,
                error: "Failed to add items to cart. Please try again."
            });
        }
    },
    {
        name: "add_to_cart",
        description: "Add products to user's shopping cart by product IDs.",
        schema: z.object({
            sessionId: z.string().describe("User session ID"),
            productIds: z.array(z.string()).describe("Array of product IDs to add"),
            quantities: z.array(z.number()).optional().describe("Array of quantities for each product (default: 1 each)")
        })
    }
);

/**
 * Tool: View Cart
 * Shows current cart contents
 */
export const viewCartTool = tool(
    async ({ sessionId }) => {
        console.log(`Viewing cart for session: ${sessionId}`);

        try {
            const cart = await getCart(sessionId);

            return JSON.stringify({
                type: "cart_operation",
                operation: "view",
                success: cart.success,
                items: cart.items || [],
                summary: cart.summary || { totalItems: 0, totalPrice: 0 },
                message: cart.items && cart.items.length > 0
                    ? `You have ${cart.summary.totalItems} item(s) in your cart`
                    : "Your cart is empty"
            });

        } catch (error) {
            console.error('Error viewing cart:', error);
            return JSON.stringify({
                type: "cart_operation",
                operation: "view",
                success: false,
                error: "Failed to get cart contents"
            });
        }
    },
    {
        name: "view_cart",
        description: "View current contents of user's shopping cart.",
        schema: z.object({
            sessionId: z.string().describe("User session ID")
        })
    }
);

/**
 * Tool: Clear Cart
 * Empties the user's cart
 */
export const clearCartTool = tool(
    async ({ sessionId }) => {
        console.log(`🗑️ Clearing cart for session: ${sessionId}`);

        try {
            const result = await clearCart(sessionId);

            return JSON.stringify({
                type: "cart_operation",
                operation: "clear",
                success: result.success,
                itemsCleared: result.itemsCleared || 0,
                message: result.message || "Cart cleared successfully"
            });

        } catch (error) {
            console.error('Error clearing cart:', error);
            return JSON.stringify({
                type: "cart_operation",
                operation: "clear",
                success: false,
                error: "Failed to clear cart"
            });
        }
    },
    {
        name: "clear_cart",
        description: "Clear all items from user's shopping cart.",
        schema: z.object({
            sessionId: z.string().describe("User session ID")
        })
    }
);

export const groceryTools = [
    fastRecipeIngredientsTool,
    searchProductsTool,
    addToCartTool,
    viewCartTool,
    clearCartTool,
    directAnswerTool
];