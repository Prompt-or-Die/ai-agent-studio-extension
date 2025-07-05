import * as vscode from 'vscode';

interface FrameworkSnippet {
    label: string;
    framework: string;
    language: string;
    description: string;
    insertText: string;
    documentation?: string;
    triggerWords: string[];
}

export class SnippetProvider implements vscode.CompletionItemProvider {
    private snippets: FrameworkSnippet[] = [];

    constructor(private context: vscode.ExtensionContext) {
        this.initializeSnippets();
    }

    provideCompletionItems(
        document: vscode.TextDocument,
        position: vscode.Position,
        token: vscode.CancellationToken,
        context: vscode.CompletionContext
    ): vscode.CompletionItem[] {
        const completions: vscode.CompletionItem[] = [];
        const languageId = document.languageId;
        
        // Get current line text to determine context
        const lineText = document.lineAt(position).text;
        const wordRange = document.getWordRangeAtPosition(position);
        const currentWord = wordRange ? document.getText(wordRange).toLowerCase() : '';

        // Filter snippets by language and context
        const relevantSnippets = this.snippets.filter(snippet => {
            // Match language
            if (snippet.language !== languageId && snippet.language !== 'any') {
                return false;
            }

            // Match trigger words or current context
            if (currentWord) {
                return snippet.triggerWords.some(trigger => 
                    trigger.includes(currentWord) || currentWord.includes(trigger)
                );
            }

            // If no specific context, show framework-related snippets
            return snippet.triggerWords.some(trigger => 
                lineText.toLowerCase().includes(trigger)
            ) || this.isFrameworkContext(document, position);
        });

        // Convert snippets to completion items
        for (const snippet of relevantSnippets) {
            const completion = new vscode.CompletionItem(snippet.label, vscode.CompletionItemKind.Snippet);
            completion.insertText = new vscode.SnippetString(snippet.insertText);
            completion.detail = `${snippet.framework} - ${snippet.description}`;
            completion.documentation = new vscode.MarkdownString(snippet.documentation || snippet.description);
            completion.sortText = `0${snippet.framework}${snippet.label}`; // Sort by framework then label
            
            // Add filter text for better matching
            completion.filterText = `${snippet.label} ${snippet.framework} ${snippet.triggerWords.join(' ')}`;
            
            completions.push(completion);
        }

        return completions;
    }

    private isFrameworkContext(document: vscode.TextDocument, position: vscode.Position): boolean {
        // Check if we're in a framework-related file
        const fileName = document.fileName.toLowerCase();
        const frameworkIndicators = [
            'agent', 'character', 'crew', 'workflow', 'langgraph', 'autogen', 
            'eliza', 'openai', 'smol', 'pydantic'
        ];
        
        return frameworkIndicators.some(indicator => fileName.includes(indicator));
    }

    private initializeSnippets() {
        // OpenAI Agents SDK Snippets
        this.addOpenAISnippets();
        
        // ElizaOS Snippets
        this.addElizaOSSnippets();
        
        // LangGraph Snippets
        this.addLangGraphSnippets();
        
        // CrewAI Snippets
        this.addCrewAISnippets();
        
        // AutoGen Snippets
        this.addAutoGenSnippets();
        
        // SmolAgents Snippets
        this.addSmolAgentsSnippets();
        
        // Other Framework Snippets
        this.addOtherFrameworkSnippets();
        
        // Common AI/ML Snippets
        this.addCommonSnippets();
    }

    private addOpenAISnippets() {
        this.snippets.push({
            label: 'openai-basic-agent',
            framework: 'OpenAI Agents SDK',
            language: 'typescript',
            description: 'Basic OpenAI agent class',
            triggerWords: ['openai', 'agent', 'class', 'basic'],
            insertText: `import { Agent } from '@openai/agents-sdk';

export class \${1:MyAgent} extends Agent {
    constructor() {
        super({
            name: '\${1:MyAgent}',
            instructions: '\${2:You are a helpful AI assistant.}',
            model: '\${3:gpt-4o}',
            temperature: \${4:0.7}
        });
    }

    async handleMessage(message: string): Promise<string> {
        try {
            const response = await this.complete(message);
            return response;
        } catch (error) {
            console.error('Error handling message:', error);
            return 'I apologize, but I encountered an error processing your message.';
        }
    }
}`,
            documentation: `Creates a basic OpenAI agent class with error handling and message processing capabilities.`
        });

        this.snippets.push({
            label: 'openai-multi-agent',
            framework: 'OpenAI Agents SDK',
            language: 'typescript',
            description: 'Multi-agent system with coordination',
            triggerWords: ['openai', 'multi', 'agents', 'coordinator'],
            insertText: `import { Agent } from '@openai/agents-sdk';

export class CoordinatorAgent extends Agent {
    private agents: Map<string, Agent> = new Map();

    constructor() {
        super({
            name: 'Coordinator',
            instructions: 'You coordinate tasks between multiple specialized agents.',
            model: 'gpt-4o'
        });
    }

    registerAgent(name: string, agent: Agent): void {
        this.agents.set(name, agent);
    }

    async delegateTask(task: string, agentName?: string): Promise<string> {
        if (agentName && this.agents.has(agentName)) {
            const agent = this.agents.get(agentName)!;
            return await agent.complete(task);
        }

        // Auto-select best agent based on task
        const bestAgent = await this.selectBestAgent(task);
        return await bestAgent.complete(task);
    }

    private async selectBestAgent(task: string): Promise<Agent> {
        // Implementation for agent selection logic
        \${1:// Add your agent selection logic here}
        return this.agents.values().next().value;
    }
}`,
            documentation: `Creates a coordinator agent that can manage and delegate tasks to multiple specialized agents.`
        });

        this.snippets.push({
            label: 'openai-function-calling',
            framework: 'OpenAI Agents SDK',
            language: 'typescript',
            description: 'Agent with function calling capabilities',
            triggerWords: ['openai', 'function', 'calling', 'tools'],
            insertText: `import { Agent } from '@openai/agents-sdk';

const functions = [
    {
        name: '\${1:get_weather}',
        description: '\${2:Get current weather for a location}',
        parameters: {
            type: 'object',
            properties: {
                location: {
                    type: 'string',
                    description: 'The city and state, e.g. San Francisco, CA'
                }
            },
            required: ['location']
        }
    }
];

export class \${3:FunctionAgent} extends Agent {
    constructor() {
        super({
            name: '\${3:FunctionAgent}',
            instructions: 'You can call functions to help users.',
            model: 'gpt-4o',
            tools: functions
        });
    }

    async \${1:get_weather}(location: string): Promise<string> {
        // Implement your function logic here
        \${4:// Add weather API call or logic}
        return \`Weather in \${location}: \${5:Sunny, 75°F}\`;
    }
}`,
            documentation: `Creates an agent with function calling capabilities for enhanced functionality.`
        });
    }

    private addElizaOSSnippets() {
        this.snippets.push({
            label: 'eliza-character',
            framework: 'ElizaOS',
            language: 'json',
            description: 'Basic ElizaOS character definition',
            triggerWords: ['eliza', 'character', 'personality'],
            insertText: `{
    "name": "\${1:CharacterName}",
    "bio": "\${2:A helpful AI assistant}",
    "lore": [
        "\${3:I am an AI assistant created to help users}",
        "\${4:I enjoy learning and having conversations}"
    ],
    "style": {
        "all": [
            "\${5:Be helpful and informative}",
            "\${6:Always be polite and professional}",
            "\${7:Show enthusiasm for learning}"
        ],
        "chat": [
            "\${8:Engage in friendly conversation}",
            "\${9:Ask follow-up questions}"
        ]
    },
    "topics": [
        "\${10:general assistance}",
        "\${11:questions and answers}",
        "\${12:casual conversation}"
    ],
    "adjectives": [
        "\${13:helpful}",
        "\${14:knowledgeable}",
        "\${15:friendly}"
    ]
}`,
            documentation: `Creates a basic ElizaOS character with personality traits, conversation style, and topics.`
        });

        this.snippets.push({
            label: 'eliza-action',
            framework: 'ElizaOS',
            language: 'typescript',
            description: 'Custom ElizaOS action handler',
            triggerWords: ['eliza', 'action', 'handler', 'custom'],
            insertText: `import { Action, IAgentRuntime, Memory, State } from '@elizaos/core';

export const \${1:customAction}: Action = {
    name: '\${2:CUSTOM_ACTION}',
    similes: ['\${3:perform custom task}', '\${4:execute special function}'],
    description: '\${5:Performs a custom action based on user input}',
    
    validate: async (runtime: IAgentRuntime, message: Memory) => {
        const content = message.content?.text?.toLowerCase() || '';
        return content.includes('\${6:trigger_word}');
    },

    handler: async (runtime: IAgentRuntime, message: Memory, state: State) => {
        try {
            const userInput = message.content?.text || '';
            
            // \${7:Implement your custom logic here}
            const result = await \${8:processCustomTask}(userInput);
            
            return {
                text: \`\${9:I've completed your task: \${result}}\`,
                action: '\${2:CUSTOM_ACTION}'
            };
        } catch (error) {
            console.error('\${2:CUSTOM_ACTION} error:', error);
            return {
                text: '\${10:I encountered an error while performing the action.}',
                action: '\${2:CUSTOM_ACTION}'
            };
        }
    }
};

async function \${8:processCustomTask}(input: string): Promise<string> {
    // \${11:Implement your processing logic}
    return \`Processed: \${input}\`;
}`,
            documentation: `Creates a custom action handler for ElizaOS with validation and error handling.`
        });

        this.snippets.push({
            label: 'eliza-provider',
            framework: 'ElizaOS',
            language: 'typescript',
            description: 'Custom ElizaOS context provider',
            triggerWords: ['eliza', 'provider', 'context'],
            insertText: `import { Provider, IAgentRuntime, Memory, State } from '@elizaos/core';

export const \${1:customProvider}: Provider = {
    get: async (runtime: IAgentRuntime, message: Memory, state?: State) => {
        try {
            // \${2:Fetch or generate context data}
            const contextData = await \${3:fetchContextData}();
            
            return {
                \${4:customInfo}: contextData,
                timestamp: new Date().toISOString(),
                context: '\${5:Custom provider context}'
            };
        } catch (error) {
            console.error('\${1:customProvider} error:', error);
            return {
                error: 'Failed to get context data',
                timestamp: new Date().toISOString()
            };
        }
    }
};

async function \${3:fetchContextData}(): Promise<any> {
    // \${6:Implement your data fetching logic}
    return {
        status: 'active',
        data: '\${7:sample data}'
    };
}`,
            documentation: `Creates a custom context provider for ElizaOS to supply additional information to the character.`
        });
    }

    private addLangGraphSnippets() {
        this.snippets.push({
            label: 'langgraph-workflow',
            framework: 'LangGraph',
            language: 'python',
            description: 'Basic LangGraph state workflow',
            triggerWords: ['langgraph', 'workflow', 'state', 'graph'],
            insertText: `from langgraph.graph import StateGraph, END
from typing import TypedDict, Annotated, List
import operator

class \${1:WorkflowState}(TypedDict):
    messages: Annotated[List[str], operator.add]
    current_step: str
    result: str

class \${2:MyWorkflow}:
    def __init__(self):
        self.workflow = self._create_workflow()
        self.app = self.workflow.compile()

    def _create_workflow(self) -> StateGraph:
        workflow = StateGraph(\${1:WorkflowState})
        
        # Add nodes
        workflow.add_node('\${3:process_input}', self.\${3:process_input})
        workflow.add_node('\${4:execute_task}', self.\${4:execute_task})
        workflow.add_node('\${5:format_result}', self.\${5:format_result})
        
        # Add edges
        workflow.set_entry_point('\${3:process_input}')
        workflow.add_edge('\${3:process_input}', '\${4:execute_task}')
        workflow.add_edge('\${4:execute_task}', '\${5:format_result}')
        workflow.add_edge('\${5:format_result}', END)
        
        return workflow

    def \${3:process_input}(self, state: \${1:WorkflowState}) -> \${1:WorkflowState}:
        # \${6:Process input logic}
        return {
            'current_step': '\${3:process_input}',
            'result': ''
        }

    def \${4:execute_task}(self, state: \${1:WorkflowState}) -> \${1:WorkflowState}:
        # \${7:Task execution logic}
        return {
            'current_step': '\${4:execute_task}',
            'result': '\${8:Task completed}'
        }

    def \${5:format_result}(self, state: \${1:WorkflowState}) -> \${1:WorkflowState}:
        # \${9:Result formatting logic}
        return {
            'current_step': '\${5:format_result}',
            'result': f"Final: {state.get('result', '')}"
        }

    def run(self, initial_messages: List[str]) -> \${1:WorkflowState}:
        initial_state = {
            'messages': initial_messages,
            'current_step': '',
            'result': ''
        }
        return self.app.invoke(initial_state)`,
            documentation: `Creates a basic LangGraph workflow with state management and node transitions.`
        });

        this.snippets.push({
            label: 'langgraph-conditional',
            framework: 'LangGraph',
            language: 'python',
            description: 'LangGraph workflow with conditional edges',
            triggerWords: ['langgraph', 'conditional', 'edges', 'decision'],
            insertText: `from langgraph.graph import StateGraph, END
from typing import TypedDict

class \${1:ConditionalState}(TypedDict):
    input: str
    condition: bool
    result: str

def \${2:evaluate_condition}(state: \${1:ConditionalState}) -> \${1:ConditionalState}:
    # \${3:Evaluate condition logic}
    condition = \${4:len(state['input']) > 10}  # Example condition
    return {
        'condition': condition
    }

def \${5:handle_true}(state: \${1:ConditionalState}) -> \${1:ConditionalState}:
    return {
        'result': '\${6:Condition was true}'
    }

def \${7:handle_false}(state: \${1:ConditionalState}) -> \${1:ConditionalState}:
    return {
        'result': '\${8:Condition was false}'
    }

def \${9:decide_path}(state: \${1:ConditionalState}) -> str:
    return '\${5:handle_true}' if state['condition'] else '\${7:handle_false}'

# Create workflow
workflow = StateGraph(\${1:ConditionalState})

# Add nodes
workflow.add_node('\${2:evaluate_condition}', \${2:evaluate_condition})
workflow.add_node('\${5:handle_true}', \${5:handle_true})
workflow.add_node('\${7:handle_false}', \${7:handle_false})

# Add edges
workflow.set_entry_point('\${2:evaluate_condition}')
workflow.add_conditional_edges(
    '\${2:evaluate_condition}',
    \${9:decide_path},
    {
        '\${5:handle_true}': '\${5:handle_true}',
        '\${7:handle_false}': '\${7:handle_false}'
    }
)
workflow.add_edge('\${5:handle_true}', END)
workflow.add_edge('\${7:handle_false}', END)

app = workflow.compile()`,
            documentation: `Creates a LangGraph workflow with conditional edges for branching logic.`
        });
    }

    private addCrewAISnippets() {
        this.snippets.push({
            label: 'crewai-agent',
            framework: 'CrewAI',
            language: 'python',
            description: 'CrewAI agent definition',
            triggerWords: ['crew', 'agent', 'role'],
            insertText: `from crewai import Agent

\${1:agent_name} = Agent(
    role='\${2:Specialist Role}',
    goal='\${3:Achieve specific objectives}',
    backstory='\${4:You are an expert with years of experience in your field}',
    verbose=True,
    allow_delegation=\${5:False},
    tools=[\${6:# Add tools here}],
    max_iter=\${7:3},
    memory=True
)`,
            documentation: `Creates a CrewAI agent with role, goal, and backstory configuration.`
        });

        this.snippets.push({
            label: 'crewai-task',
            framework: 'CrewAI',
            language: 'python',
            description: 'CrewAI task definition',
            triggerWords: ['crew', 'task', 'description'],
            insertText: `from crewai import Task

\${1:task_name} = Task(
    description='\${2:Detailed description of what needs to be accomplished}',
    agent=\${3:assigned_agent},
    expected_output='\${4:Description of expected output format and content}',
    tools=[\${5:# Optional: specific tools for this task}],
    context=[\${6:# Optional: context from other tasks}]
)`,
            documentation: `Creates a CrewAI task with description, assigned agent, and expected output.`
        });

        this.snippets.push({
            label: 'crewai-crew',
            framework: 'CrewAI',
            language: 'python',
            description: 'CrewAI crew setup',
            triggerWords: ['crew', 'team', 'process'],
            insertText: `from crewai import Crew, Process

\${1:crew_name} = Crew(
    agents=[\${2:agent1, agent2, agent3}],
    tasks=[\${3:task1, task2, task3}],
    process=Process.\${4|sequential,hierarchical|},
    verbose=\${5:2},
    memory=\${6:True}
)

# Execute the crew
result = \${1:crew_name}.kickoff()`,
            documentation: `Creates a CrewAI crew with agents, tasks, and process configuration.`
        });
    }

    private addAutoGenSnippets() {
        this.snippets.push({
            label: 'autogen-agent',
            framework: 'AutoGen',
            language: 'python',
            description: 'AutoGen conversable agent',
            triggerWords: ['autogen', 'agent', 'conversable'],
            insertText: `import autogen

\${1:agent_name} = autogen.ConversableAgent(
    name="\${2:AgentName}",
    system_message="\${3:You are a helpful AI assistant with specific expertise.}",
    llm_config={\${4:"config_list": config_list, "temperature": 0.7}},
    human_input_mode="\${5|NEVER,TERMINATE,ALWAYS|}",
    max_consecutive_auto_reply=\${6:10},
    is_termination_msg=lambda x: x.get("content", "").rstrip().endswith("TERMINATE"),
)`,
            documentation: `Creates an AutoGen conversable agent with configuration options.`
        });

        this.snippets.push({
            label: 'autogen-group-chat',
            framework: 'AutoGen',
            language: 'python',
            description: 'AutoGen group chat setup',
            triggerWords: ['autogen', 'group', 'chat', 'manager'],
            insertText: `import autogen

# Create group chat
groupchat = autogen.GroupChat(
    agents=[\${1:agent1, agent2, agent3}],
    messages=[],
    max_round=\${2:12},
    speaker_selection_method="\${3|round_robin,auto,manual|}",
)

# Create manager
manager = autogen.GroupChatManager(
    groupchat=groupchat,
    llm_config={\${4:"config_list": config_list, "temperature": 0.5}},
)

# Start conversation
\${5:user_proxy}.initiate_chat(
    manager,
    message="\${6:Initial message to start the conversation}"
)`,
            documentation: `Sets up an AutoGen group chat with multiple agents and a manager.`
        });
    }

    private addSmolAgentsSnippets() {
        this.snippets.push({
            label: 'smolagents-basic',
            framework: 'SmolAgents',
            language: 'python',
            description: 'Basic SmolAgents setup',
            triggerWords: ['smol', 'agent', 'code'],
            insertText: `from smolagents import CodeAgent, LiteLLMModel
from smolagents.tools import DuckDuckGoSearchTool, PythonInterpreterTool

# Initialize model
model = LiteLLMModel(model_id="\${1:gpt-4o}")

# Initialize tools
tools = [
    \${2:DuckDuckGoSearchTool()},
    \${3:PythonInterpreterTool()}
]

# Create agent
agent = CodeAgent(
    tools=tools,
    model=model,
    max_steps=\${4:10},
    verbose=\${5:True}
)

# Run task
result = agent.run("\${6:Your task description here}")`,
            documentation: `Creates a basic SmolAgents setup with tools and model configuration.`
        });
    }

    private addOtherFrameworkSnippets() {
        // Pydantic AI
        this.snippets.push({
            label: 'pydantic-ai-agent',
            framework: 'Pydantic AI',
            language: 'python',
            description: 'Pydantic AI agent with type safety',
            triggerWords: ['pydantic', 'ai', 'agent', 'type', 'safe'],
            insertText: `from pydantic_ai import Agent
from pydantic import BaseModel

class \${1:ResponseModel}(BaseModel):
    result: str
    confidence: float
    category: str

agent = Agent(
    '\${2:openai:gpt-4o}',
    result_type=\${1:ResponseModel},
    system_prompt='\${3:You are a helpful AI assistant that provides structured responses.}'
)

async def \${4:process_request}(message: str) -> \${1:ResponseModel}:
    result = await agent.run(message)
    return result`,
            documentation: `Creates a type-safe Pydantic AI agent with structured response models.`
        });

        // Semantic Kernel
        this.snippets.push({
            label: 'semantic-kernel-setup',
            framework: 'Semantic Kernel',
            language: 'python',
            description: 'Semantic Kernel basic setup',
            triggerWords: ['semantic', 'kernel', 'sk'],
            insertText: `import semantic_kernel as sk
from semantic_kernel.connectors.ai.open_ai import OpenAIChatCompletion

# Initialize kernel
kernel = sk.Kernel()

# Add AI service
kernel.add_service(OpenAIChatCompletion(
    service_id="\${1:chat}",
    ai_model_id="\${2:gpt-4o}",
    api_key="\${3:your_api_key}"
))

# Define function
@kernel.function(name="\${4:custom_function}", description="\${5:Function description}")
def \${4:custom_function}(\${6:input_param}: str) -> str:
    # \${7:Implement your function logic}
    return f"Processed: {\${6:input_param}}"

# Execute
result = await kernel.invoke_prompt("\${8:Your prompt here}")`,
            documentation: `Sets up Semantic Kernel with AI service and custom functions.`
        });
    }

    private addCommonSnippets() {
        // Error handling
        this.snippets.push({
            label: 'agent-error-handling',
            framework: 'Common',
            language: 'any',
            description: 'Common error handling pattern for agents',
            triggerWords: ['error', 'handling', 'try', 'catch'],
            insertText: `try {
    \${1:// Agent operation}
    const result = await \${2:agent.process}(\${3:input});
    return result;
} catch (error) {
    console.error('\${4:Agent error}:', error);
    
    // \${5:Handle specific error types}
    if (error instanceof \${6:SpecificError}) {
        return '\${7:Specific error response}';
    }
    
    return '\${8:I apologize, but I encountered an error. Please try again.}';
}`,
            documentation: `Common error handling pattern for AI agent operations.`
        });

        // Logging pattern
        this.snippets.push({
            label: 'agent-logging',
            framework: 'Common',
            language: 'any',
            description: 'Structured logging for agents',
            triggerWords: ['log', 'logging', 'debug'],
            insertText: `// Structured logging for agent operations
const logger = {
    info: (message: string, data?: any) => console.log(\`[INFO] \${new Date().toISOString()}: \${message}\`, data || ''),
    warn: (message: string, data?: any) => console.warn(\`[WARN] \${new Date().toISOString()}: \${message}\`, data || ''),
    error: (message: string, error?: any) => console.error(\`[ERROR] \${new Date().toISOString()}: \${message}\`, error || '')
};

// Usage
logger.info('\${1:Agent initialized}', { agentName: '\${2:MyAgent}' });
logger.warn('\${3:Warning message}', { context: '\${4:additional info}' });
logger.error('\${5:Error occurred}', error);`,
            documentation: `Structured logging pattern for agent operations and debugging.`
        });

        // Configuration pattern
        this.snippets.push({
            label: 'agent-config',
            framework: 'Common',
            language: 'any',
            description: 'Agent configuration pattern',
            triggerWords: ['config', 'configuration', 'settings'],
            insertText: `interface AgentConfig {
    name: string;
    model: string;
    temperature: number;
    maxTokens: number;
    systemPrompt: string;
    tools?: string[];
    memory?: boolean;
}

const defaultConfig: AgentConfig = {
    name: '\${1:MyAgent}',
    model: '\${2:gpt-4o}',
    temperature: \${3:0.7},
    maxTokens: \${4:1000},
    systemPrompt: '\${5:You are a helpful AI assistant.}',
    tools: [\${6:'search', 'calculator'}],
    memory: \${7:true}
};

// Load config from environment or use defaults
const config: AgentConfig = {
    ...defaultConfig,
    ...(\${8:process.env.AGENT_CONFIG} ? JSON.parse(\${8:process.env.AGENT_CONFIG}) : {})
};`,
            documentation: `Configuration pattern for AI agents with defaults and environment overrides.`
        });
    }

    // Additional helper methods
    getSnippetsByFramework(framework: string): FrameworkSnippet[] {
        return this.snippets.filter(snippet => snippet.framework === framework);
    }

    getSnippetsByLanguage(language: string): FrameworkSnippet[] {
        return this.snippets.filter(snippet => snippet.language === language || snippet.language === 'any');
    }

    searchSnippets(query: string): FrameworkSnippet[] {
        const lowerQuery = query.toLowerCase();
        return this.snippets.filter(snippet =>
            snippet.label.toLowerCase().includes(lowerQuery) ||
            snippet.description.toLowerCase().includes(lowerQuery) ||
            snippet.framework.toLowerCase().includes(lowerQuery) ||
            snippet.triggerWords.some(word => word.includes(lowerQuery))
        );
    }
}