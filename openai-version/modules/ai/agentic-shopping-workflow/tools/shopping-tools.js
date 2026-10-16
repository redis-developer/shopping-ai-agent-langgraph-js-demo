import { tool } from "@langchain/core/tools";
import { HumanMessage } from "@langchain/core/messages";
import { ChatOpenAI } from "@langchain/openai";

import { z } from "zod";

// Import service functions
import { findProductsForIngredients, searchProducts } from '#modules/products/domain/product-service.js';
import { addItemsToCart, getCart, clearCart } from '#modules/cart/domain/cart-service.js';
import CONFIG from '#config';

const recipeIngredientsSchema = z.object({
    recipe: z.string().describe("recipe name"),
    ingredients: z.array(z.object({
        name: z.string().describe("simple ingredient name"),
        quantity: z.string().describe("amount"),
        essential: z.boolean()
    }))
});

/**
 * Extract ingredients from LLM for a recipe
 * @param {string} recipe - Recipe name
 * @returns {Promise<z.infer<typeof recipeIngredientsSchema>>} Ingredients for the recipe
 */
async function getIngredientsFromLLM(recipe) {

    const model = new ChatOpenAI({
        temperature: 0.1, // Lower temperature for more consistent parsing
        model: "gpt-4o-mini", // Faster, cheaper model for simple tasks
        apiKey: CONFIG.openAiApiKey,
        maxTokens: 500, // Limit response size for faster processing
        timeout: 10000 // 10 second timeout built into the model
    });

    const systemPrompt = `Extract essential ingredients for this recipe.

Rules:
- Max 6 ingredients marked essential: true
- Use simple names: "chicken", "onions", "tomatoes"
- Skip salt, water, oil unless special
- Be concise and fast`;

    // Structured output: the model returns an object matching the schema, so no JSON parsing is needed
    return model.withStructuredOutput(recipeIngredientsSchema).invoke([
        { role: "system", content: systemPrompt },
        new HumanMessage(`Ingredients for ${recipe}`)
    ]);
}

/**
 * Tool: Recipe Ingredient Products
 * Provides the ingredient list for a recipe with ONE suggested product per ingredient
 */
export const recipeIngredientProductsTool = tool(
    async ({ recipe }) => {
        console.log(`🍳 Recipe ingredient products for: "${recipe}"`);

        try {
            // First extract ingredients from LLM
            const ingredientsData = await getIngredientsFromLLM(recipe);

            // Get essential ingredient names only
            const essentialIngredients = ingredientsData.ingredients.filter(ing => ing.essential).slice(0, 6);
            const ingredientNames = essentialIngredients.map(ing => ing.name);

            // Find products for those ingredients
            const result = await findProductsForIngredients(ingredientNames);

            // Add back the quantities from the LLM response
            const enrichedProducts = result.ingredientProducts.map(item => {
                const originalIngredient = essentialIngredients.find(ing => ing.name === item.ingredient);
                return {
                    ...item,
                    quantity: originalIngredient?.quantity || 'as needed'
                };
            });

            console.log(`🍽️ Found products for ingredients:`);
            enrichedProducts.forEach(item => {
                console.log(`- ${item.ingredient} (Quantity: ${item.quantity})`);
            });

            return {
                success: true,
                recipe: ingredientsData.recipe || recipe,
                totalIngredients: result.totalIngredients,
                ingredientProducts: enrichedProducts,
                message: result.message
            };

        } catch (error) {
            console.error('Error in fast recipe ingredients:', error);
            return {
                success: false,
                error: `Sorry, I had trouble getting ingredients for "${recipe}". Please try rephrasing.`
            };
        }
    },
    {
        name: "find_recipe_ingredient_products",
        description: "Get the ingredients for a recipe, with ONE suggested catalog product per ingredient. Use this first for recipe/ingredient questions, such as \"ingredients for butter chicken\" or \"what do I need to make [dish]\". Much faster than searching for each ingredient separately.",
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
            // Direct LLM call for general questions
            const model = new ChatOpenAI({
                temperature: 0.2,
                model: CONFIG.modelName,
                apiKey: CONFIG.openAiApiKey
            });

            const systemPrompt = `You are a knowledgeable grocery shopping and cooking assistant. Answer questions about:
- Cooking methods and techniques
- Food storage and preparation tips
- Nutritional information and health benefits
- Spices, seasonings, and flavor combinations
- Grocery shopping advice and tips
- Indian cuisine and cooking techniques

Provide helpful, accurate information based on your knowledge. Keep responses concise and practical.
Do not mention specific product prices or brands - focus on general knowledge and advice.`;

            const response = await model.invoke([
                { role: "system", content: systemPrompt },
                new HumanMessage(question)
            ]);

            return {
                success: true,
                content: response.content,
                question: question
            };

        } catch (error) {
            console.error('Error in direct answer:', error);
            return {
                success: false,
                error: `Sorry, I had trouble answering your question about "${question}". Please try rephrasing.`,
                question: question
            };
        }
    },
    {
        name: "direct_answer",
        description: "Answer general grocery, cooking, and food-related questions using knowledge. Use for cooking tips, techniques, food storage, preparation methods, and nutrition info. Not for recipe ingredient lists.",
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
            let result = await searchProducts({
                query,
                category,
                maxPrice,
                minRating,
                limit,
                useSemanticSearch
            });

            // If no results and we have a category filter, try again without category
            if (result.products.length === 0 && category) {
                console.log(`🔄 No results with category "${category}", retrying without category filter...`);
                result = await searchProducts({
                    query,
                    maxPrice,
                    minRating,
                    limit,
                    useSemanticSearch
                });

            }

            if (result.products.length === 0) {
                return {
                    success: false,
                    message: `No products found for "${query}". Try different keywords or check the spelling.`,
                    query: query,
                    products: []
                };
            }

            const response = {
                success: true,
                query: query,
                ...result
            };

            return response;

        } catch (error) {
            console.error('Error searching products:', error);
            return {
                success: false,
                error: `Sorry, I had trouble searching for "${query}". Please try again.`,
                query: query,
                products: []
            };
        }
    },
    {
        name: "search_products",
        description: "Search for specific products in the database. Use when the user wants to find or browse actual products to buy, or asks for more options or more brands, including after recipe ingredients.",
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
    async ({ productIds, quantities }, config) => {
        const userId = config?.configurable?.userId;
        console.log(`🛒 Adding to cart: ${productIds.join(", ")}`);

        try {
            const result = await addItemsToCart(userId, productIds, quantities);

            return {
                operation: "add",
                ...result
            };

        } catch (error) {
            console.error('Error adding to cart:', error);
            return {
                operation: "add",
                success: false,
                error: "Failed to add items to cart. Please try again."
            };
        }
    },
    {
        name: "add_to_cart",
        description: "Add products to user's shopping cart by product IDs.",
        schema: z.object({
            productIds: z.array(z.string()).describe("Array of product IDs to add"),
            quantities: z.array(z.number()).describe("Array of quantities for each product (default: 1 each)")
        })
    }
);

/**
 * Tool: View Cart
 * Shows current cart contents
 */
export const viewCartTool = tool(
    async (_args, config) => {
        const userId = config?.configurable?.userId;
        console.log(`Viewing cart for user: ${userId}`);

        try {
            const cart = await getCart(userId);

            return {
                operation: "view",
                success: cart.success,
                items: cart.items || [],
                summary: cart.summary || { totalItems: 0, totalPrice: 0 },
                message: cart.items && cart.items.length > 0
                    ? `You have ${cart.summary.totalItems} item(s) in your cart`
                    : "Your cart is empty"
            };

        } catch (error) {
            console.error('Error viewing cart:', error);
            return {
                operation: "view",
                success: false,
                error: "Failed to get cart contents"
            };
        }
    },
    {
        name: "view_cart",
        description: "View current contents of user's shopping cart.",
        schema: z.object({})
    }
);

/**
 * Tool: Clear Cart
 * Empties the user's cart
 */
export const clearCartTool = tool(
    async (_args, config) => {
        const userId = config?.configurable?.userId;
        console.log(`🗑️ Clearing cart for user: ${userId}`);

        try {
            const result = await clearCart(userId);

            return {
                operation: "clear",
                success: result.success,
                itemsCleared: result.itemsCleared || 0,
                message: result.message || "Cart cleared successfully"
            };

        } catch (error) {
            console.error('Error clearing cart:', error);
            return {
                operation: "clear",
                success: false,
                error: "Failed to clear cart"
            };
        }
    },
    {
        name: "clear_cart",
        description: "Clear all items from user's shopping cart.",
        schema: z.object({})
    }
);

export const shoppingTools = [
    recipeIngredientProductsTool,
    searchProductsTool,
    addToCartTool,
    viewCartTool,
    clearCartTool,
    directAnswerTool,
];
