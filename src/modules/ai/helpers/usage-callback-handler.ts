import { BaseCallbackHandler } from "@langchain/core/callbacks/base";
import type { AIMessage } from "@langchain/core/messages";
import type { LLMResult } from "@langchain/core/outputs";

/**
 * Adds up token usage across every model call in a run, including calls made inside
 * tools and other nodes. Create one per request and pass it in the run config:
 *   graph.invoke(input, { callbacks: [usageHandler] })
 * then read the totals from `usageHandler.usage`.
 */
export class UsageCallbackHandler extends BaseCallbackHandler {
    name = "usage_callback_handler";

    usage = {
        inputTokens: 0,
        outputTokens: 0,
        totalTokens: 0,
        inputTokenDetails: {} as Record<string, number>,
        outputTokenDetails: {} as Record<string, number>
    };

    handleLLMEnd(output: LLMResult) {
        for (const generation of output.generations.flat()) {
            const usageMetadata = (generation as { message?: AIMessage }).message?.usage_metadata;
            if (!usageMetadata) continue;

            this.usage.inputTokens += usageMetadata.input_tokens ?? 0;
            this.usage.outputTokens += usageMetadata.output_tokens ?? 0;
            this.usage.totalTokens += usageMetadata.total_tokens ?? 0;
            addCounts(this.usage.inputTokenDetails, usageMetadata.input_token_details);
            addCounts(this.usage.outputTokenDetails, usageMetadata.output_token_details);
        }
    }
}

// Adds each count in `counts` (for example cache_read or reasoning tokens) onto `totals`
function addCounts(totals: Record<string, number>, counts: Record<string, number> = {}) {
    for (const [name, value] of Object.entries(counts)) {
        totals[name] = (totals[name] ?? 0) + value;
    }
}
