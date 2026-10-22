sequenceDiagram
    autonumber
    actor Shopper

    participant Server as Shopping agent
    participant AI as AI provider
    participant Cache as LangCache
    participant Memory as Agent Memory
    participant Redis

    Shopper->>Server: POST /api/ai/chat
    Server->>Memory: Load the session history and summary

    rect rgba(255, 68, 56, 0.08)
        Note over Shopper,Redis: query_cache_check
        Server->>Cache: Look up a similar earlier question
        Cache-->>Server: Cached reply and product cards, or no match
    end

    alt Cache hit
        Server-->>Shopper: Cached reply text

        rect rgba(255, 68, 56, 0.08)
            Note over Shopper,Redis: retrieve_long_term_memories
            Server->>Memory: Recall the shopper's preferences
        end
    else Cache miss
        rect rgba(255, 68, 56, 0.08)
            Note over Shopper,Redis: retrieve_long_term_memories
            Server->>Memory: Recall the shopper's preferences
        end

        rect rgba(199, 149, 227, 0.12)
            Note over Shopper,Redis: personal_shopper_agent and tools
            loop Until the agent has what it needs
                Server->>AI: Messages and tool definitions
                AI-->>Server: Tool calls
                Server->>Redis: Search products or use the cart
                Redis-->>Server: Tool results
            end
            AI-->>Server: Final reply, as it is written
            Server-->>Shopper: Reply text
        end
    end

    par
        rect rgba(199, 149, 227, 0.12)
            Note over Shopper,Redis: generate_suggested_follow_ups
            Server->>AI: Write suggested follow-ups
        end
    and
        opt Cache miss only
            rect rgba(255, 68, 56, 0.08)
                Note over Shopper,Redis: process_work_output_with_caching
                Server->>AI: Remove personal information
                Server->>Cache: Save the question and reply
            end
        end
    end

    Server->>Memory: Save the conversation turn
    Server-->>Shopper: Reply, cards, follow-ups, usage
