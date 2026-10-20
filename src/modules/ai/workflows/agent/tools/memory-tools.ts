import { tool } from "@langchain/core/tools";
import { z } from "zod";
import { getWorkingMemory, searchShopperPreferences, saveShopperPreference, CUSTOM_TOPICS } from "../../../../chat/domain/agent-memory-service.ts";

/**
 * Tool: Search My Memories
 *
 * Allows the agent to search the user's saved shopper preferences:
 * - Dietary restrictions (diets, allergies, intolerances)
 * - Food preferences (cuisines, brands, likes and dislikes)
 * - Standing instructions (rules to apply every time)
 */
export const searchMemoriesTool = tool(
    async ({ query }, config) => {
        const userId = config?.configurable?.userId;
        
        console.log(`\n🔍 [TOOL] search_my_memories called`);
        console.log(`   Query: "${query}"`);
        
        try {
            const memories = await searchShopperPreferences(userId, query);
            
            if (memories.length === 0) {
                return {
                    found: false,
                    message: "No relevant memories found for this query."
                };
            }
            
            const formattedMemories = memories.map((mem, idx) => ({
                index: idx + 1,
                fact: mem.text,
                topics: mem.topics || []
            }));
            
            return {
                found: true,
                count: memories.length,
                memories: formattedMemories
            };
            
        } catch (error) {
            console.error(`❌ [TOOL] search_my_memories failed:`, error);
            return {
                found: false,
                error: "Failed to search memories"
            };
        }
    },
    {
        name: "search_my_memories",
        description: `Search the user's saved shopping preferences.
Use this when you need to know:
- Dietary restrictions (vegetarian, vegan, allergies, intolerances, etc.)
- Food preferences (cuisines, brands, organic, likes and dislikes)
- Standing instructions (rules the user wants applied every time)

Returns the most relevant memories.`,
        schema: z.object({
            query: z.string().describe("What to search for (e.g., 'dietary restrictions', 'favorite cuisines', 'brand preferences')")
        })
    }
);

/**
 * Tool: Save Memory
 * 
 * Allows the agent to save important information to long-term memory
 */
export const saveMemoryTool = tool(
    async ({ fact, topics }, config) => {
        const userId = config?.configurable?.userId;
        
        console.log(`\n💾 [TOOL] save_memory called`);
        console.log(`   Fact: "${fact}"`);
        console.log(`   Topics: ${topics.join(', ')}`);
        
        try {
            await saveShopperPreference(userId, fact, topics);
            
            return {
                success: true,
                message: "Memory saved successfully. This information will be remembered for future conversations."
            };
            
        } catch (error) {
            console.error(`❌ [TOOL] save_memory failed:`, error);
            return {
                success: false,
                error: "Failed to save memory"
            };
        }
    },
    {
        name: "save_memory",
        description: `Save a lasting shopping preference about the user to remember for future conversations.
Use this when the user:
- Mentions a dietary restriction or allergy ("I'm vegetarian")
- States a food preference or dislike ("I prefer organic products", "I hate cilantro")
- Gives a rule to apply every time ("always suggest the cheaper option")

Only save lasting, explicit preferences, not one-off requests.`,
        schema: z.object({
            fact: z.string().describe("The preference to remember (be specific and clear)"),
            topics: z.array(z.enum(CUSTOM_TOPICS)).min(1).describe("What kind of preference this is: dietary_restrictions (diets, allergies, intolerances), food_preferences (cuisines, brands, likes and dislikes), standing_instructions (rules to apply every time)")
        })
    }
);

/**
 * Tool: View Recent Conversation
 * 
 * Allows the agent to see the summary of the current working memory
 */
export const viewRecentConversationTool = tool(
    async ({}, config) => {
        const sessionId = config?.configurable?.sessionId;
        
        console.log(`\n📝 [TOOL] view_recent_conversation called`);
        
        try {
            const workingMemory = await getWorkingMemory(sessionId);
            
            if (!workingMemory.summary && (!workingMemory.messages || workingMemory.messages.length === 0)) {
                return {
                    available: false,
                    message: "No conversation history available yet."
                };
            }
            
            const recentMessages = (workingMemory.messages || []).slice(-6); // Last 6 messages
            
            return {
                available: true,
                summary: workingMemory.summary || "No summary generated yet",
                messageCount: workingMemory.messages?.length || 0,
                recentMessages: recentMessages.map(msg => ({
                    role: msg.role,
                    content: msg.content.substring(0, 100) + (msg.content.length > 100 ? '...' : '')
                }))
            };
            
        } catch (error) {
            console.error(`❌ [TOOL] view_recent_conversation failed:`, error);
            return {
                available: false,
                error: "Failed to retrieve conversation history"
            };
        }
    },
    {
        name: "view_recent_conversation",
        description: `View a summary of the recent conversation in this session.
Use this to:
- Recall what was discussed earlier in the conversation
- Check if user already mentioned something
- Get context about the current shopping session`,
        schema: z.object({})
    }
);

// Export all memory tools as an array
export const memoryTools = [
    searchMemoriesTool,
    saveMemoryTool,
    viewRecentConversationTool
];
