import type { ProductSummary } from '../../products/domain/product-service.ts';

/** Structured content shown with a reply, such as product cards. The type says what is in data. */
export type Attachment = { type: 'productSummary'; data: ProductSummary };
