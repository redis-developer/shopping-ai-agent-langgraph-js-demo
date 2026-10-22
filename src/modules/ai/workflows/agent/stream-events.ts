// What the shopper sees while a step runs, by the name of the graph node or the tool
const STEP_LABELS: Record<string, string> = {
    query_cache_check: "Checking for a similar answer…",
    front_desk_agent: "Checking your request…",
    retrieve_long_term_memories: "Recalling your preferences…",
    personal_shopper_agent: "Thinking…",
    process_work_output_with_caching: "Saving this answer for next time…",
    generate_suggested_follow_ups: "Lining up next steps…",

    search_products: "Searching products…",
    find_recipe_ingredient_products: "Finding ingredients for your recipe…",
    add_to_cart: "Adding to your cart…",
    view_cart: "Checking your cart…",
    clear_cart: "Emptying your cart…",
    direct_answer: "Looking that up…",
    save_memory: "Noting that for next time…",
    search_my_memories: "Looking through what I remember…",
    view_recent_conversation: "Reading back our chat…",
};

// Shown for a node or tool that has no label above
const UNKNOWN_STEP_LABEL = "Working on it…";

export type Step = { label: string; status: "started" | "finished"; durationMs?: number };

// The part of an event from the graph's stream that is used here
type StreamEvent = { method: string; params: { node?: string; data?: any } };

/**
 * Reads the events of a graph run and passes on two things as they happen: the reply, piece by
 * piece, and when each step starts and finishes. The reply is either the shopper agent's, or a
 * cached one, which comes in one piece. The other model calls in the graph (recipe ingredients,
 * cleaning text for the cache, follow-ups) are not part of the reply.
 * @param run - The stream returned by the graph's streamEvents
 * @param onToken - Called with each piece of the reply
 * @param onStep - Called when a step starts, and when it finishes with how long it took
 */
export async function readRun(
    run: AsyncIterable<StreamEvent>,
    onToken: (text: string) => void,
    onStep: (step: Step) => void
) {
    const startTimes = new Map<string, number>();
    const toolNames = new Map<string, string>();

    // Reports a step starting, or finishing with how long it took since it started
    const reportStep = (key: string, name: string, status: Step["status"]) => {
        const label = STEP_LABELS[name] ?? UNKNOWN_STEP_LABEL;
        if (status === "started") {
            startTimes.set(key, performance.now());
            onStep({ label, status });
        } else {
            onStep({ label, status, durationMs: Math.round(performance.now() - (startTimes.get(key) ?? performance.now())) });
        }
    };

    for await (const { method, params } of run) {
        const data = params.data;

        if (method === "messages") {
            if (params.node === "personal_shopper_agent" && data.event === "content-block-delta" && data.delta?.type === "text-delta") {
                onToken(data.delta.text);
            }
        } else if (method === "updates") {
            // A cached reply is known as soon as the cache check is done, so it can be shown before the rest of the graph is
            if (params.node === "query_cache_check" && data.values.cacheStatus === "hit") {
                onToken(data.values.messages.at(-1).text);
            }
        } else if (method === "lifecycle") {
            // "root" is the whole run, and the "tools" node is reported through its tool calls instead
            if (data.graph_name === "root" || data.graph_name === "tools") continue;
            if (data.event === "started") {
                reportStep(data.graph_name, data.graph_name, "started");
            } else if (data.event === "completed") {
                reportStep(data.graph_name, data.graph_name, "finished");
            }
        } else if (method === "tools") {
            if (data.event === "tool-started") {
                toolNames.set(data.tool_call_id, data.tool_name);
                reportStep(data.tool_call_id, data.tool_name, "started");
            } else if (data.event === "tool-finished" || data.event === "tool-error") {
                reportStep(data.tool_call_id, toolNames.get(data.tool_call_id) ?? "", "finished");
            }
        }
    }
}
