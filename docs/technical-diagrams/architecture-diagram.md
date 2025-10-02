flowchart TD
    %% User Layer
    User>"User Query"]
    
    %% LangGraph Agent Layer
    subgraph LangGraph["LangGraph Agent Orchestration"]
        CacheCheck(("Cache Check?"))
        ShoppingAgent(("Shopping Agent"))
        SaveCache(("Cache response"))

        %% Tools Layer
        subgraph AITools["🔧 AI Tools"]
            RecipeTool["Recipe Ingredients"]
            SearchTool["Product Search"]
            CartTool["Cart Management"]
            AnswerTool["Direct Answer"]
        end
    end
    
    %% Cache Layer
    subgraph RedisCache["Redis"]
        SemanticCache["Semantic Cache<br/>(LangCache)"]
        VectorStore["Vector Store<br/>(Product Embeddings)"]
        UserSession(User Session)
    end
    
    %% Services Layer
    subgraph ServicesLayer["Services"]
        CartService["Cart Service"]
        ProductService["Products Service"]
        ChatService["Chat / User / Profile Service"]
    end
    
    %% Flow connections with step numbers
    User e1@--> |Step 1| CacheCheck
    e1@{ animate: true }

    SemanticCache --> |user query| CacheCheck
    CacheCheck -.->|Hit| End((("Return response")))
    CacheCheck -.->|Miss| ShoppingAgent

    ChatService e2@--> |Step 2: retrieve context| ShoppingAgent
    e2@{ animate: true }

    ShoppingAgent e3@-.-> |Step 3: Process request| AITools
    e3@{ animate: true }

    ShoppingAgent e4@--> |Step 4: save context| ChatService
    e4@{ animate: true }

    ShoppingAgent e5@--> |Step 5| SaveCache
    e5@{ animate: true }
    SaveCache --> |user query + response| SemanticCache

    ShoppingAgent e6@--> |Step 6: Send response| End
    e6@{ animate: true }
    
    %% Internal connections
    RecipeTool <-.-> ProductService
    SearchTool <-.-> ProductService
    CartTool <-.-> CartService

    ProductService <-.-> VectorStore
    CartService <-.-> UserSession
    ChatService <-.-> UserSession
    
    classDef stepStyle fill:#eeeeee,color:#000000,stroke:#000000,stroke-width:2px,font-weight:bold
    classDef nodeStyle fill:transparent,color:#000000,stroke:#8a99a0,stroke-width:2px
    classDef subgraphStyle fill:transparent,color:#000000,stroke:#8a99a0,stroke-width:1px
    
    classDef purple fill:transparent,color:#c795e3,stroke:#c795e3,stroke-width:2px, font-weight: bold, stroke-dasharray: 5 5
    classDef red fill:transparent,color:#ff4438,stroke:#ff4438,stroke-width:2px, stroke-dasharray: 5 5
    classDef blue fill:transparent,color:#80dbff,stroke:#80dbff,stroke-width:2px, font-weight: bold, stroke-dasharray: 5 5

    class User,CacheCheck,ShoppingAgent,SaveCache,SemanticCache,VectorStore,UserSession,RecipeTool,SearchTool,CartTool,AnswerTool,CartService,ProductService,ChatService, nodeStyle
    class End,LangGraph,RedisCache,AITools subgraphStyle
    class LangGraph purple
    class RedisCache red
    class ServicesLayer blue
