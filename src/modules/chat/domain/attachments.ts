import type { ProductSummary } from '#modules/products/domain/product-service';

/** Structured content shown with a reply, such as product cards. The type says what is in data. */
export type Attachment = { type: 'productSummary'; data: ProductSummary };
