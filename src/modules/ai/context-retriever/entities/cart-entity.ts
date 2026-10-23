import type { EntityDescription } from "@redis-iris/context-retriever/models";

import { toFieldDescriptions } from "./entity-fields.ts";
import type { EntityFields } from "./entity-fields.ts";
import { USER_KEY_TEMPLATE } from "#modules/cart/data/cart-repository";
import type { UserDocument } from "#modules/cart/data/cart-repository";

// The cart is a list of items inside the document. Context Retriever cannot index the inside of a
// list of objects, so the cart is one field that can be read, and not searched.
const cartFields: EntityFields<UserDocument> = {
    userId: { type: "str", description: "ID of the shopper whose cart this is", isKeyComponent: true, redisIndices: [] },
    cart: {
        type: "object",
        description: "The shopper's cart: an items list, where each item has productId, name, brand, salePrice, marketPrice, quantity and addedAt",
        redisIndices: []
    },
    createdAt: { type: "str", description: "ISO time when the shopper's document was created", redisIndices: [] },
    updatedAt: { type: "str", description: "ISO time when the shopper's document was last changed", redisIndices: [] },
};

export const cartEntity: EntityDescription = {
    name: "Cart",
    description: "A shopper's cart, with the products they added",
    documentType: "json",
    redisKeyTemplate: USER_KEY_TEMPLATE,
    fields: toFieldDescriptions(cartFields),
};
