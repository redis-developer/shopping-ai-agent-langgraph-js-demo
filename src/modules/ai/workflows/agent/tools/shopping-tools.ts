import { tool } from "@langchain/core/tools";
import { HumanMessage } from "@langchain/core/messages";

import { z } from "zod";

// Import service functions
import { searchProducts } from '../../../../products/domain/product-service.ts';
import { addItemsToCart, getCart, clearCart } from '../../../../cart/domain/cart-service.ts';
import { createChatModel } from '../../../providers/index.ts';

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
 * @param recipe - Recipe name
 * @returns Ingredients for the recipe
 */
async function getIngredientsFromLLM(recipe: string): Promise<z.infer<typeof recipeIngredientsSchema>> {

    const model = createChatModel({
        temperature: 0.1, // Lower temperature for more consistent parsing
        fast: true, // Faster, cheaper model for simple tasks
        maxTokens: 500, // Limit response size for faster processing
        timeout: 10000, // 10 second timeout built into the model
        disableStreaming: true // The shopper does not see this call's reply
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
 * Tool: Recipe Ingredients
 * Provides the essential ingredients for a recipe, with their quantities. The agent then finds a product for each one.
 */
export const recipeIngredientsTool = tool(
    async ({ recipe }) => {
        console.log(`🍳 Recipe ingredients for: "${recipe}"`);

        try {
            const ingredientsData = await getIngredientsFromLLM(recipe);

            // Essential ingredients only
            const essentialIngredients = ingredientsData.ingredients.filter(ing => ing.essential).slice(0, 6);

            console.log(`🍽️ Ingredients:`);
            essentialIngredients.forEach(item => {
                console.log(`- ${item.name} (Quantity: ${item.quantity})`);
            });

            return {
                success: true,
                recipe: ingredientsData.recipe || recipe,
                ingredients: essentialIngredients.map(({ name, quantity }) => ({ name, quantity }))
            };

        } catch (error) {
            console.error('Error in recipe ingredients:', error);
            return {
                success: false,
                error: `Sorry, I had trouble getting ingredients for "${recipe}". Please try rephrasing.`
            };
        }
    },
    {
        name: "get_recipe_ingredients",
        description: "Get the essential ingredients of a recipe or dish, with the quantity of each. Use this first for recipe/ingredient questions, such as \"ingredients for butter chicken\" or \"what do I need to make [dish]\". It returns ingredient names only, with no products, so then look up a product for each ingredient with the product tools if the user has asked for it.",
        schema: z.object({
            recipe: z.string().describe("The recipe or dish name to get ingredients for")
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
    recipeIngredientsTool,
    addToCartTool,
    clearCartTool,
];

// The hand-written tools to query the entities (search products, view the cart). The agent uses them only when
// Context Retriever is not set up, since the tools that it generates do the same.
export const entityQueryTools = [
    searchProductsTool,
    viewCartTool,
];
