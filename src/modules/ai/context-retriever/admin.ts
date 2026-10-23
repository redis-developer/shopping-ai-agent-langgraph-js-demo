import { createContextRetriever, SDKHooks } from "@redis-iris/context-retriever";
import { ContextSurfaceStatus } from "@redis-iris/context-retriever/models";
import type { DataModel } from "@redis-iris/context-retriever/models";

import CONFIG from "#config";
import { productEntity } from "./entities/product-entity.ts";
import { cartEntity } from "./entities/cart-entity.ts";

const AGENT_KEY_NAME = "redish-agent";
const POLL_INTERVAL_MS = 5_000;
const POLL_TIMEOUT_MS = 10 * 60_000;

// Statuses from which the surface never becomes active
const FAILED_STATUSES: string[] = [ContextSurfaceStatus.Failed, ContextSurfaceStatus.IndicesFailed, ContextSurfaceStatus.Deleting];

// The service can return null for an empty list or object, which the SDK rejects as an invalid response (MOD-18640)
const LIST_KEYS = new Set(["tools", "entities", "fields", "relationships", "redis_indices"]);
const OBJECT_KEYS = new Set(["metadata"]);

/**
 * Replace the null values of the lists and objects in a response, at any depth
 * @param value - The parsed response
 * @param replaced - Collects the names of the keys that were replaced
 */
function replaceNullCollections(value: unknown, replaced: string[]): unknown {
    if (Array.isArray(value)) {
        return value.map((item) => replaceNullCollections(item, replaced));
    }
    if (value !== null && typeof value === "object") {
        return Object.fromEntries(Object.entries(value).map(([key, item]) => {
            if (item === null && LIST_KEYS.has(key)) {
                replaced.push(key);
                return [key, []];
            }
            if (item === null && OBJECT_KEYS.has(key)) {
                replaced.push(key);
                return [key, {}];
            }
            return [key, replaceNullCollections(item, replaced)];
        }));
    }
    return value;
}

// Hooks that fix a response before the SDK checks it
function createNullFixingHooks() {
    const hooks = new SDKHooks();

    hooks.registerAfterSuccessHook({
        afterSuccess: async (context, response) => {
            if (!response.headers.get("content-type")?.includes("application/json")) {
                return response;
            }

            const replaced: string[] = [];
            const fixedBody = replaceNullCollections(await response.clone().json(), replaced);
            if (replaced.length === 0) {
                return response;
            }

            console.log(`ℹ️  Replaced null values in the ${context.operationID} response: ${[...new Set(replaced)].join(", ")}`);

            // The body has been decoded and changed, so its length and encoding no longer apply
            const headers = new Headers(response.headers);
            headers.delete("content-length");
            headers.delete("content-encoding");
            return new Response(JSON.stringify(fixedBody), { status: response.status, statusText: response.statusText, headers });
        }
    });

    return hooks;
}

/**
 * The admin side of Context Retriever: creating the service from the entities, and its agent keys.
 * It uses the admin key, which must never reach the agent. The agent connects with an agent key (see index.ts).
 */
export class ContextRetrieverAdmin {
    #client: ReturnType<typeof createContextRetriever>;

    constructor() {
        const { contextRetrieverServerUrl, contextRetrieverAdminKey } = CONFIG;
        if (!contextRetrieverServerUrl || !contextRetrieverAdminKey) {
            throw new Error("Set CONTEXT_RETRIEVER_SERVER_URL and CONTEXT_RETRIEVER_ADMIN_KEY in .env first");
        }

        this.#client = createContextRetriever({
            serverURL: contextRetrieverServerUrl,
            auth: { type: "apiKey", apiKey: contextRetrieverAdminKey },
            hooks: createNullFixingHooks()
        });
    }

    /**
     * Create the service from the entities, reading the same Redis database that the app stores its data in
     * @returns The ID of the new service
     */
    async createSurface() {
        const dataModel: DataModel = {
            title: "Redish grocery store",
            description: "The products of the store and the carts of its shoppers",
            entities: [productEntity, cartEntity]
        };

        const redisUrl = new URL(CONFIG.redisUrl);

        console.log(`🚀 Creating the "${CONFIG.contextRetrieverServiceName}" context surface...`);
        const { result: created } = await this.#client.contextSurfaces.createContextSurface({
            name: CONFIG.contextRetrieverServiceName,
            description: "Products and carts of the Redish grocery store",
            dataModel,
            dataSource: {
                type: "redis",
                connectionConfig: {
                    addr: `${redisUrl.hostname}:${redisUrl.port || 6379}`,
                    username: decodeURIComponent(redisUrl.username) || "default",
                    password: decodeURIComponent(redisUrl.password),
                    tlsEnabled: redisUrl.protocol === "rediss:"
                }
            }
        });

        return created.id;
    }

    /**
     * Find the existing service by the name in CONTEXT_RETRIEVER_SERVICE_NAME
     * @returns The ID of the service
     */
    async findSurface() {
        for (let page = 1; ; page += 1) {
            const { result } = await this.#client.contextSurfaces.listContextSurfaces(page, 100);
            const match = (result.contextSurfaces ?? []).find((surface) => surface.name === CONFIG.contextRetrieverServiceName);

            if (match?.id) {
                return match.id;
            }
            if (result.pagination?.hasNext !== true) {
                throw new Error(`No context surface named "${CONFIG.contextRetrieverServiceName}" was found`);
            }
        }
    }

    /**
     * Wait until the service has built its indexes and its tools exist
     * @param surfaceId - ID of the service
     * @returns The names of the tools the service generated
     */
    async waitUntilActive(surfaceId: string) {
        const deadline = Date.now() + POLL_TIMEOUT_MS;

        for (;;) {
            const { result: surface } = await this.#client.contextSurfaces.getContextSurface(surfaceId);

            // Only "active" is ready. Any other status, including one that is added later, means keep waiting.
            if (surface.status === ContextSurfaceStatus.Active) {
                return surface.tools ?? [];
            }
            if (FAILED_STATUSES.includes(surface.status)) {
                throw new Error(`The surface will not become active (status ${surface.status}): ${surface.statusReason ?? "no reason given"}`);
            }
            if (Date.now() > deadline) {
                throw new Error(`The surface is still ${surface.status} after ${POLL_TIMEOUT_MS / 1000} seconds`);
            }

            console.log(`⏳ Status: ${surface.status}, checking again in ${POLL_INTERVAL_MS / 1000} seconds...`);
            await new Promise((resolve) => setTimeout(resolve, POLL_INTERVAL_MS));
        }
    }

    /**
     * Create an agent key for the service. The key is only returned this once.
     * @param surfaceId - ID of the service
     * @param options.uniqueName - Name the key differently from the earlier ones, in case key names must be unique
     * @returns The MCP URL of the service and the key
     */
    async createAgentKey(surfaceId: string, { uniqueName = false } = {}) {
        const name = uniqueName ? `${AGENT_KEY_NAME}-${Date.now()}` : AGENT_KEY_NAME;
        const { result: agentKey } = await this.#client.agentKeys.createAgentKey(surfaceId, { name });

        return { mcpUrl: agentKey.mcpUrl, key: agentKey.key };
    }
}
