import type { EntityDescription } from "@redis-iris/context-retriever/models";

import { toFieldDescriptions } from "./entity-fields.ts";
import type { EntityFields } from "./entity-fields.ts";
import { PRODUCT_KEY_TEMPLATE } from "../../../products/data/product-repository.ts";
import type { Product } from "../../../products/data/product-repository.ts";

// semanticScore is worked out for each search and is not stored. isOnSale is loosely typed, and
// the discount and prices already say whether a product is on sale.
const productFields: EntityFields<Product, "semanticScore" | "isOnSale"> = {
    id: { type: "str", description: "Product ID", isKeyComponent: true, redisIndices: [] },
    name: { type: "str", description: "Product name", redisIndices: [{ type: "text", weight: 2 }] },
    category: { type: "str", description: "Top-level category, such as Fruits & Vegetables", redisIndices: [{ type: "tag" }] },
    subCategory: { type: "str", description: "Sub-category within the category", redisIndices: [{ type: "tag" }] },
    brand: { type: "str", description: "Brand of the product", redisIndices: [{ type: "tag" }] },
    salePrice: { type: "float", description: "Price to pay now, in rupees", redisIndices: [{ type: "numeric", sortable: true }] },
    marketPrice: { type: "float", description: "Original price before any discount, in rupees", redisIndices: [{ type: "numeric" }] },
    type: { type: "str", description: "Kind of product within its sub-category", redisIndices: [{ type: "tag" }] },
    rating: { type: "float", description: "Average customer rating, out of 5", redisIndices: [{ type: "numeric", sortable: true }] },
    description: { type: "str", description: "What the product is and how it is used", redisIndices: [{ type: "text" }] },
    discount: { type: "int", description: "Discount in percent, from the market price to the sale price", redisIndices: [{ type: "numeric" }] },
    // 1536 is the size of the vectors of OpenAI's text-embedding-3-small, so this works with AI_PROVIDER="openai" only.
    // The service embeds a search text with its own model, which has to match the one that made these vectors.
    // The service rejects "euclidean" when it builds the index. OpenAI's vectors have a length of 1, so cosine ranks them like our L2 index.
    productInfoEmbeddings: {
        type: "list[float]",
        description: "Embedding of the product's name, brand, type and description, for searching by meaning",
        redisIndices: [{ type: "vector", vectorDim: 1536, distanceMetric: "cosine", sourceField: "description" }]
    },
};

export const productEntity: EntityDescription = {
    name: "Product",
    description: "A grocery product that the shopper can buy",
    documentType: "json",
    redisKeyTemplate: PRODUCT_KEY_TEMPLATE,
    fields: toFieldDescriptions(productFields),
};

// The tools of the product entity are named after it, like filter_product or get_product_by_id
const PRODUCT_TOOL_PATTERN = /product/i;

const withoutRetrieval = (record: object) => Object.fromEntries(Object.entries(record).filter(([key]) => key !== "_retrieval"));

/**
 * Put the result of a product tool in the shape of the agent's own tools, { success, products }, so that the rest of the app
 * does not need to know how Context Retriever returns records. The records of a list are under "results", and a get by ID is one record.
 * @param toolName - Name of the tool that was called
 * @param content - The content blocks of the tool's result, where the text of the first block is JSON
 * @returns The result in the app's shape, or undefined when the tool is not a product tool or has no records
 */
export function toProductsResult(toolName: string, content: { type: string; [key: string]: unknown }[]) {
    if (!PRODUCT_TOOL_PATTERN.test(toolName)) {
        return undefined;
    }

    try {
        const body = JSON.parse(content[0]?.text as string);

        if (Array.isArray(body.results)) {
            const { results, ...summary } = body;
            return { success: true, ...summary, products: results.map(withoutRetrieval) };
        }
        if (typeof body.id === "string") {
            return { success: true, products: [withoutRetrieval(body)] };
        }
    } catch {
        // Not JSON, so it is returned as it came
    }
    return undefined;
}
