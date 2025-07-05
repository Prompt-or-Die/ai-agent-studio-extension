import * as vscode from 'vscode';
import * as path from 'path';
import * as fs from 'fs';

export interface AgentTemplate {
    id: string;
    name: string;
    framework: string;
    description: string;
    language: string;
    files: TemplateFile[];
    dependencies?: string[];
    commands?: string[];
    category: 'basic' | 'advanced' | 'example' | 'production';
    tags: string[];
    author?: string;
    version?: string;
    documentation?: string;
}

export interface TemplateFile {
    path: string;
    content: string;
    isExecutable?: boolean;
    encoding?: string;
}

export interface TemplateContext {
    projectName: string;
    description: string;
    framework: string;
    language: string;
    author?: string;
    version?: string;
    [key: string]: any;
}

export class TemplateManager {
    private templates: AgentTemplate[] = [];
    private outputChannel: vscode.OutputChannel;
    
    constructor(private context: vscode.ExtensionContext) {
        this.outputChannel = vscode.window.createOutputChannel('AI Agent Studio - Templates');
        this.initializeTemplates();
    }
    
    private initializeTemplates() {
        // OpenAI Agents SDK Templates
        this.addOpenAITemplates();
        
        // ElizaOS Templates  
        this.addElizaOSTemplates();
        
        // LangGraph Templates
        this.addLangGraphTemplates();
        
        // CrewAI Templates
        this.addCrewAITemplates();
        
        // AutoGen Templates
        this.addAutoGenTemplates();
        
        // SmolAgents Templates
        this.addSmolAgentsTemplates();
        
        // Additional Framework Templates
        this.addOtherFrameworkTemplates();
        
        this.outputChannel.appendLine(`✅ Loaded ${this.templates.length} agent templates`);
    }

    private addOpenAITemplates() {
        // Basic OpenAI Agent
        this.templates.push({
            id: 'openai-basic-agent',
            name: 'Basic OpenAI Agent',
            framework: 'openai-agents-sdk',
            description: 'A simple agent using OpenAI Agents SDK with basic functionality',
            language: 'typescript',
            category: 'basic',
            tags: ['openai', 'basic', 'typescript'],
            files: [
                {
                    path: 'src/agent.ts',
                    content: `import { Agent } from '@openai/agents-sdk';

export class \${projectName}Agent extends Agent {
    constructor() {
        super({
            name: '\${projectName}Agent',
            instructions: 'You are a helpful AI assistant called \${projectName}. \${description}',
            model: 'gpt-4o',
            temperature: 0.7
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

    async processCommand(command: string, args: string[]): Promise<string> {
        switch (command) {
            case 'help':
                return this.getHelpMessage();
            case 'status':
                return this.getStatus();
            default:
                return await this.handleMessage(\`Execute command: \${command} with args: \${args.join(', ')}\`);
        }
    }

    private getHelpMessage(): string {
        return \`
Available commands:
- help: Show this help message
- status: Get agent status
- Any other message will be processed as a general query
        \`.trim();
    }

    private getStatus(): string {
        return \`Agent \${this.name} is running with model \${this.model}\`;
    }
}`
                },
                {
                    path: 'src/index.ts',
                    content: `import { \${projectName}Agent } from './agent';
import * as readline from 'readline';

async function main() {
    const agent = new \${projectName}Agent();
    console.log('🤖 \${projectName} Agent initialized successfully');
    console.log('Type "help" for available commands, or "quit" to exit\\n');
    
    const rl = readline.createInterface({
        input: process.stdin,
        output: process.stdout
    });

    const askQuestion = () => {
        rl.question('You: ', async (input) => {
            if (input.toLowerCase() === 'quit') {
                console.log('Goodbye!');
                rl.close();
                return;
            }

            try {
                const response = await agent.handleMessage(input);
                console.log(\`Agent: \${response}\\n\`);
            } catch (error) {
                console.error('Error:', error);
            }

            askQuestion();
        });
    };

    askQuestion();
}

main().catch(console.error);`
                },
                {
                    path: 'package.json',
                    content: `{
  "name": "\${projectName.toLowerCase().replace(/\\s+/g, '-')}",
  "version": "\${version || '1.0.0'}",
  "description": "\${description}",
  "main": "dist/index.js",
  "scripts": {
    "build": "tsc",
    "start": "node dist/index.js",
    "dev": "ts-node src/index.ts",
    "clean": "rm -rf dist",
    "test": "jest"
  },
  "dependencies": {
    "@openai/agents-sdk": "^1.0.0",
    "dotenv": "^16.0.0"
  },
  "devDependencies": {
    "@types/node": "^18.0.0",
    "@types/jest": "^29.0.0",
    "typescript": "^5.0.0",
    "ts-node": "^10.0.0",
    "jest": "^29.0.0"
  }
}`
                },
                {
                    path: 'tsconfig.json',
                    content: `{
  "compilerOptions": {
    "target": "ES2020",
    "module": "commonjs",
    "lib": ["ES2020"],
    "outDir": "./dist",
    "rootDir": "./src",
    "strict": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "forceConsistentCasingInFileNames": true,
    "declaration": true,
    "declarationMap": true,
    "sourceMap": true
  },
  "include": ["src/**/*"],
  "exclude": ["node_modules", "dist"]
}`
                },
                {
                    path: '.env.example',
                    content: `# OpenAI Configuration
OPENAI_API_KEY=your_openai_api_key_here
OPENAI_MODEL=gpt-4o
OPENAI_TEMPERATURE=0.7

# Agent Configuration
AGENT_NAME=\${projectName}Agent
AGENT_DEBUG=false
`
                },
                {
                    path: 'README.md',
                    content: `# \${projectName}

\${description}

## Setup

1. Install dependencies:
\`\`\`bash
npm install
\`\`\`

2. Copy environment file and configure:
\`\`\`bash
cp .env.example .env
# Edit .env with your OpenAI API key
\`\`\`

3. Build the project:
\`\`\`bash
npm run build
\`\`\`

4. Run the agent:
\`\`\`bash
npm start
\`\`\`

## Development

Run in development mode:
\`\`\`bash
npm run dev
\`\`\`

## Usage

The agent supports interactive chat. Type messages and get responses from the AI agent.

Available commands:
- \`help\` - Show available commands
- \`status\` - Get agent status
- \`quit\` - Exit the application

## Framework

This project uses the OpenAI Agents SDK for building production-ready AI agents.
`
                }
            ],
            dependencies: ['@openai/agents-sdk', 'dotenv'],
            commands: ['npm install', 'npm run build']
        });

        // Advanced Multi-Agent System
        this.templates.push({
            id: 'openai-multi-agent-system',
            name: 'Multi-Agent System',
            framework: 'openai-agents-sdk', 
            description: 'Advanced multi-agent system with coordination and specialized roles',
            language: 'typescript',
            category: 'advanced',
            tags: ['openai', 'multi-agent', 'advanced', 'coordination'],
            files: [
                {
                    path: 'src/agents/base-agent.ts',
                    content: `import { Agent } from '@openai/agents-sdk';

export abstract class BaseAgent extends Agent {
    protected role: string;
    protected capabilities: string[];

    constructor(name: string, role: string, instructions: string, capabilities: string[] = []) {
        super({
            name,
            instructions,
            model: 'gpt-4o',
            temperature: 0.7
        });
        this.role = role;
        this.capabilities = capabilities;
    }

    abstract async executeTask(task: any): Promise<any>;

    async getCapabilities(): Promise<string[]> {
        return this.capabilities;
    }

    async getRole(): Promise<string> {
        return this.role;
    }
}`
                },
                {
                    path: 'src/agents/coordinator.ts',
                    content: `import { BaseAgent } from './base-agent';

export class CoordinatorAgent extends BaseAgent {
    private agents: Map<string, BaseAgent> = new Map();

    constructor() {
        super(
            'Coordinator',
            'Task Coordinator',
            'You are a coordinator agent responsible for managing and delegating tasks to specialized agents.',
            ['task-delegation', 'workflow-management', 'agent-coordination']
        );
    }

    registerAgent(agent: BaseAgent): void {
        this.agents.set(agent.name, agent);
    }

    async executeTask(task: any): Promise<any> {
        const { type, description, requirements } = task;
        
        // Analyze task and determine best agent
        const bestAgent = await this.selectBestAgent(requirements);
        
        if (!bestAgent) {
            throw new Error('No suitable agent found for this task');
        }

        // Delegate task to selected agent
        return await bestAgent.executeTask(task);
    }

    private async selectBestAgent(requirements: string[]): Promise<BaseAgent | null> {
        let bestMatch: BaseAgent | null = null;
        let maxScore = 0;

        for (const agent of this.agents.values()) {
            const capabilities = await agent.getCapabilities();
            const score = this.calculateMatchScore(requirements, capabilities);
            
            if (score > maxScore) {
                maxScore = score;
                bestMatch = agent;
            }
        }

        return bestMatch;
    }

    private calculateMatchScore(requirements: string[], capabilities: string[]): number {
        const matches = requirements.filter(req => 
            capabilities.some(cap => cap.includes(req) || req.includes(cap))
        );
        return matches.length / requirements.length;
    }
}`
                }
            ],
            dependencies: ['@openai/agents-sdk', 'dotenv'],
            commands: ['npm install', 'npm run build']
        });
    }
    private addElizaOSTemplates() {
        // Basic ElizaOS Character
        this.templates.push({
            id: 'elizaos-basic-character',
            name: 'Basic ElizaOS Character',
            framework: 'elizaos',
            description: 'A basic character agent for ElizaOS with customizable personality',
            language: 'typescript',
            category: 'basic',
            tags: ['elizaos', 'character', 'basic'],
            files: [
                {
                    path: 'characters/\${projectName.toLowerCase()}.character.json',
                    content: `{
  "name": "\${projectName}",
  "bio": "\${description}",
  "lore": [
    "I am \${projectName}, an AI character created with ElizaOS",
    "I enjoy helping users with various tasks and having meaningful conversations"
  ],
  "style": {
    "all": [
      "Be helpful and informative",
      "Always be polite and professional",
      "Show enthusiasm for learning and helping",
      "Use clear and concise language"
    ],
    "chat": [
      "Engage in friendly conversation",
      "Ask follow-up questions to better understand user needs"
    ],
    "post": [
      "Share interesting insights",
      "Encourage positive interactions"
    ]
  },
  "topics": [
    "general assistance",
    "questions and answers", 
    "casual conversation",
    "problem solving",
    "learning and education"
  ],
  "adjectives": [
    "helpful",
    "knowledgeable", 
    "friendly",
    "curious",
    "supportive",
    "reliable"
  ],
  "settings": {
    "voice": {
      "model": "en_US-ryan-high"
    },
    "secrets": [],
    "model": "gpt-4o",
    "embeddingModel": "text-embedding-ada-002"
  }
}`
                },
                {
                    path: 'src/index.ts',
                    content: `import { startAgent } from '@elizaos/core';
import character from '../characters/\${projectName.toLowerCase()}.character.json';

async function main() {
    console.log('🎭 Starting \${projectName} character...');
    
    try {
        await startAgent({
            character,
            // Configuration options
            modelProvider: 'openai',
            imageModelProvider: 'openai',
            secrets: {
                OPENAI_API_KEY: process.env.OPENAI_API_KEY
            }
        });
        
        console.log('✅ \${projectName} character started successfully!');
    } catch (error) {
        console.error('❌ Failed to start character:', error);
        process.exit(1);
    }
}

main().catch(console.error);`
                },
                {
                    path: 'package.json',
                    content: `{
  "name": "\${projectName.toLowerCase().replace(/\\s+/g, '-')}-character",
  "version": "\${version || '1.0.0'}",
  "description": "\${description}",
  "main": "dist/index.js",
  "scripts": {
    "build": "tsc",
    "start": "node dist/index.js",
    "dev": "ts-node src/index.ts",
    "character": "eliza --character=characters/\${projectName.toLowerCase()}.character.json"
  },
  "dependencies": {
    "@elizaos/core": "latest",
    "@elizaos/plugin-node": "latest",
    "dotenv": "^16.0.0"
  },
  "devDependencies": {
    "@types/node": "^18.0.0",
    "typescript": "^5.0.0",
    "ts-node": "^10.0.0"
  }
}`
                }
            ],
            dependencies: ['@elizaos/core', '@elizaos/plugin-node'],
            commands: ['npm install', 'npm run build']
        });

        // Advanced ElizaOS with Custom Actions
        this.templates.push({
            id: 'elizaos-custom-actions',
            name: 'ElizaOS with Custom Actions',
            framework: 'elizaos',
            description: 'ElizaOS character with custom action handlers and providers',
            language: 'typescript',
            category: 'advanced',
            tags: ['elizaos', 'actions', 'providers', 'advanced'],
            files: [
                {
                    path: 'src/actions/custom-action.ts',
                    content: `import { Action, IAgentRuntime, Memory, State } from '@elizaos/core';

export const customAction: Action = {
    name: 'CUSTOM_ACTION',
    similes: ['perform custom task', 'execute special function', 'run custom action'],
    description: 'Performs a custom action based on user input',
    
    validate: async (runtime: IAgentRuntime, message: Memory) => {
        // Validate if this action should be triggered
        const content = message.content?.text?.toLowerCase() || '';
        return content.includes('custom') || content.includes('special');
    },

    handler: async (runtime: IAgentRuntime, message: Memory, state: State) => {
        try {
            // Implement your custom logic here
            const userInput = message.content?.text || '';
            
            // Process the input
            const result = await processCustomTask(userInput);
            
            // Return response
            return {
                text: \`I've completed your custom task: \${result}\`,
                action: 'CUSTOM_ACTION'
            };
        } catch (error) {
            console.error('Custom action error:', error);
            return {
                text: 'I encountered an error while performing the custom action.',
                action: 'CUSTOM_ACTION'
            };
        }
    }
};

async function processCustomTask(input: string): Promise<string> {
    // Implement your custom processing logic
    return \`Processed: \${input}\`;
}`
                },
                {
                    path: 'src/providers/custom-provider.ts',
                    content: `import { Provider, IAgentRuntime, Memory, State } from '@elizaos/core';

export const customProvider: Provider = {
    get: async (runtime: IAgentRuntime, message: Memory, state?: State) => {
        // Provide additional context or data for the character
        const customData = await fetchCustomData();
        
        return {
            customInfo: customData,
            timestamp: new Date().toISOString(),
            context: 'Custom provider context'
        };
    }
};

async function fetchCustomData(): Promise<any> {
    // Implement your data fetching logic
    return {
        status: 'active',
        capabilities: ['custom-task-1', 'custom-task-2'],
        version: '1.0.0'
    };
}`
                }
            ],
            dependencies: ['@elizaos/core', '@elizaos/plugin-node'],
            commands: ['npm install', 'npm run build']
        });
    }

    private addLangGraphTemplates() {
        // Basic LangGraph Workflow
        this.templates.push({
            id: 'langgraph-basic-workflow',
            name: 'Basic LangGraph Workflow',
            framework: 'langgraph',
            description: 'State machine agent workflow using LangGraph',
            language: 'python',
            category: 'basic',
            tags: ['langgraph', 'workflow', 'state-machine'],
            files: [
                {
                    path: 'src/workflow.py',
                    content: `from langgraph.graph import StateGraph, END
from typing import TypedDict, Annotated, List
import operator

class AgentState(TypedDict):
    messages: Annotated[List[str], operator.add]
    current_step: str
    result: str
    error: str

class \${projectName}Workflow:
    def __init__(self):
        self.workflow = self._create_workflow()
        self.app = self.workflow.compile()

    def _create_workflow(self) -> StateGraph:
        workflow = StateGraph(AgentState)
        
        # Add nodes
        workflow.add_node('input_processor', self.process_input)
        workflow.add_node('task_executor', self.execute_task) 
        workflow.add_node('result_formatter', self.format_result)
        
        # Add edges
        workflow.set_entry_point('input_processor')
        workflow.add_edge('input_processor', 'task_executor')
        workflow.add_edge('task_executor', 'result_formatter') 
        workflow.add_edge('result_formatter', END)
        
        return workflow

    def process_input(self, state: AgentState) -> AgentState:
        """Process and validate input"""
        messages = state.get('messages', [])
        
        if not messages:
            return {
                'error': 'No input messages provided',
                'current_step': 'input_processor'
            }
        
        last_message = messages[-1] if messages else ''
        processed_message = f"Processed: {last_message}"
        
        return {
            'messages': [processed_message],
            'current_step': 'input_processor',
            'result': '',
            'error': ''
        }

    def execute_task(self, state: AgentState) -> AgentState:
        """Execute the main task logic"""
        try:
            messages = state.get('messages', [])
            
            # Implement your task logic here
            task_result = self._perform_task(messages)
            
            return {
                'messages': [f"Task executed: {task_result}"],
                'current_step': 'task_executor',
                'result': task_result,
                'error': ''
            }
        except Exception as e:
            return {
                'error': f"Task execution failed: {str(e)}",
                'current_step': 'task_executor'
            }

    def format_result(self, state: AgentState) -> AgentState:
        """Format the final result"""
        result = state.get('result', '')
        formatted_result = f"Final result: {result}"
        
        return {
            'messages': [formatted_result],
            'current_step': 'result_formatter',
            'result': formatted_result,
            'error': ''
        }

    def _perform_task(self, messages: List[str]) -> str:
        """Implement your specific task logic here"""
        # Example implementation
        return f"Completed processing {len(messages)} messages"

    def run(self, initial_messages: List[str]) -> AgentState:
        """Run the workflow with initial messages"""
        initial_state = {
            'messages': initial_messages,
            'current_step': '',
            'result': '',
            'error': ''
        }
        
        return self.app.invoke(initial_state)

if __name__ == "__main__":
    workflow = \${projectName}Workflow()
    
    # Example usage
    result = workflow.run(["Hello", "World", "Test message"])
    print(f"Workflow result: {result}")
`
                },
                {
                    path: 'requirements.txt',
                    content: `langgraph>=0.2.0
langchain>=0.1.0
langchain-openai>=0.1.0
python-dotenv>=1.0.0
`
                },
                {
                    path: '.env.example',
                    content: `# OpenAI Configuration
OPENAI_API_KEY=your_openai_api_key_here
OPENAI_MODEL=gpt-4o

# LangGraph Configuration
LANGCHAIN_TRACING_V2=true
LANGCHAIN_API_KEY=your_langchain_api_key_here
`
                }
            ],
            dependencies: ['langgraph', 'langchain', 'langchain-openai'],
            commands: ['pip install -r requirements.txt']
        });

        // Advanced LangGraph with Human-in-the-Loop
        this.templates.push({
            id: 'langgraph-human-in-loop',
            name: 'LangGraph Human-in-the-Loop',
            framework: 'langgraph',
            description: 'Advanced workflow with human intervention points and checkpointing',
            language: 'python',
            category: 'advanced',
            tags: ['langgraph', 'human-in-loop', 'checkpointing', 'advanced'],
            files: [
                {
                    path: 'src/human_in_loop_workflow.py',
                    content: `from langgraph.graph import StateGraph, END
from langgraph.checkpoint.sqlite import SqliteSaver
from typing import TypedDict, Annotated, List
import operator
import sqlite3

class WorkflowState(TypedDict):
    messages: Annotated[List[str], operator.add]
    current_step: str
    human_input: str
    requires_approval: bool
    approved: bool
    result: str

class HumanInLoopWorkflow:
    def __init__(self, checkpoint_path: str = "workflow_checkpoints.db"):
        self.checkpointer = SqliteSaver.from_conn_string(checkpoint_path)
        self.workflow = self._create_workflow()
        self.app = self.workflow.compile(checkpointer=self.checkpointer)

    def _create_workflow(self) -> StateGraph:
        workflow = StateGraph(WorkflowState)
        
        # Add nodes
        workflow.add_node('process_request', self.process_request)
        workflow.add_node('human_review', self.human_review)
        workflow.add_node('execute_approved', self.execute_approved)
        workflow.add_node('handle_rejection', self.handle_rejection)
        
        # Add edges with conditions
        workflow.set_entry_point('process_request')
        workflow.add_conditional_edges(
            'process_request',
            self.should_require_approval,
            {
                'human_review': 'human_review',
                'execute': 'execute_approved'
            }
        )
        workflow.add_conditional_edges(
            'human_review', 
            self.check_approval,
            {
                'approved': 'execute_approved',
                'rejected': 'handle_rejection'
            }
        )
        workflow.add_edge('execute_approved', END)
        workflow.add_edge('handle_rejection', END)
        
        return workflow

    def process_request(self, state: WorkflowState) -> WorkflowState:
        messages = state.get('messages', [])
        last_message = messages[-1] if messages else ''
        
        # Determine if human approval is needed
        requires_approval = self._check_if_approval_needed(last_message)
        
        return {
            'current_step': 'process_request',
            'requires_approval': requires_approval,
            'approved': False
        }

    def human_review(self, state: WorkflowState) -> WorkflowState:
        # This would typically integrate with a UI or notification system
        print(f"Human review required for: {state.get('messages', [])}")
        
        # In a real implementation, this would wait for human input
        # For demo purposes, we'll simulate approval
        human_decision = input("Approve this request? (y/n): ").lower().strip()
        approved = human_decision == 'y'
        
        return {
            'current_step': 'human_review',
            'approved': approved,
            'human_input': human_decision
        }

    def execute_approved(self, state: WorkflowState) -> WorkflowState:
        messages = state.get('messages', [])
        result = f"Executed approved request: {messages}"
        
        return {
            'current_step': 'execute_approved',
            'result': result
        }

    def handle_rejection(self, state: WorkflowState) -> WorkflowState:
        return {
            'current_step': 'handle_rejection',
            'result': 'Request was rejected by human reviewer'
        }

    def should_require_approval(self, state: WorkflowState) -> str:
        return 'human_review' if state.get('requires_approval', False) else 'execute'

    def check_approval(self, state: WorkflowState) -> str:
        return 'approved' if state.get('approved', False) else 'rejected'

    def _check_if_approval_needed(self, message: str) -> bool:
        # Define criteria for when human approval is required
        sensitive_keywords = ['delete', 'remove', 'critical', 'important', 'payment']
        return any(keyword in message.lower() for keyword in sensitive_keywords)

if __name__ == "__main__":
    workflow = HumanInLoopWorkflow()
    
    # Example with checkpointing
    thread_id = {"configurable": {"thread_id": "test-thread-1"}}
    
    initial_state = {
        'messages': ['Delete important file'],
        'current_step': '',
        'human_input': '',
        'requires_approval': False,
        'approved': False,
        'result': ''
    }
    
    result = workflow.app.invoke(initial_state, config=thread_id)
    print(f"Final result: {result}")
`
                }
            ],
            dependencies: ['langgraph', 'langchain', 'sqlite3'],
            commands: ['pip install -r requirements.txt']
        });
    }
    private addCrewAITemplates() {
        // Basic CrewAI Team
        this.templates.push({
            id: 'crewai-basic-team',
            name: 'Basic CrewAI Team',
            framework: 'crewai',
            description: 'Multi-agent team with specialized roles using CrewAI',
            language: 'python',
            category: 'basic',
            tags: ['crewai', 'multi-agent', 'team'],
            files: [
                {
                    path: 'src/crew.py',
                    content: `from crewai import Agent, Task, Crew, Process
from crewai.tools import SerperDevTool, FileReadTool
import os

class \${projectName}Crew:
    def __init__(self):
        # Initialize tools
        self.search_tool = SerperDevTool()
        self.file_tool = FileReadTool()
        
        # Create agents
        self.researcher = self._create_researcher()
        self.analyst = self._create_analyst()
        self.writer = self._create_writer()
        
        # Create crew
        self.crew = self._create_crew()

    def _create_researcher(self) -> Agent:
        return Agent(
            role='Research Specialist',
            goal='Gather comprehensive and accurate information on given topics',
            backstory='You are an expert researcher with years of experience in data analysis and information gathering. You excel at finding reliable sources and extracting key insights.',
            verbose=True,
            allow_delegation=False,
            tools=[self.search_tool, self.file_tool],
            max_iter=3,
            memory=True
        )

    def _create_analyst(self) -> Agent:
        return Agent(
            role='Data Analyst',
            goal='Analyze research data and provide actionable insights',
            backstory='You are a skilled analyst who can interpret complex data, identify patterns, and provide strategic recommendations based on research findings.',
            verbose=True,
            allow_delegation=False,
            max_iter=3,
            memory=True
        )

    def _create_writer(self) -> Agent:
        return Agent(
            role='Content Writer',
            goal='Create compelling and well-structured content',
            backstory='You are a talented writer who can transform complex information into clear, engaging, and well-organized content for various audiences.',
            verbose=True,
            allow_delegation=False,
            max_iter=3,
            memory=True
        )

    def _create_crew(self) -> Crew:
        return Crew(
            agents=[self.researcher, self.analyst, self.writer],
            tasks=[],  # Tasks will be added dynamically
            process=Process.sequential,
            verbose=2,
            memory=True
        )

    def create_research_task(self, topic: str) -> Task:
        return Task(
            description=f'Research the topic: {topic}. Gather comprehensive information from reliable sources.',
            agent=self.researcher,
            expected_output='A detailed research report with key findings and source citations'
        )

    def create_analysis_task(self, research_context: str = '') -> Task:
        return Task(
            description=f'Analyze the research findings and identify key insights, trends, and actionable recommendations. Context: {research_context}',
            agent=self.analyst,
            expected_output='A comprehensive analysis with key insights, trends, and strategic recommendations'
        )

    def create_writing_task(self, content_type: str = 'article', audience: str = 'general') -> Task:
        return Task(
            description=f'Write a {content_type} based on the research and analysis for {audience} audience. Ensure the content is engaging, well-structured, and informative.',
            agent=self.writer,
            expected_output=f'A well-written {content_type} ready for publication'
        )

    def execute_research_workflow(self, topic: str, content_type: str = 'article', audience: str = 'general'):
        # Create tasks for this specific workflow
        research_task = self.create_research_task(topic)
        analysis_task = self.create_analysis_task(f'Research topic: {topic}')
        writing_task = self.create_writing_task(content_type, audience)
        
        # Update crew with new tasks
        self.crew.tasks = [research_task, analysis_task, writing_task]
        
        # Execute the workflow
        result = self.crew.kickoff()
        return result

if __name__ == "__main__":
    # Initialize the crew
    crew = \${projectName}Crew()
    
    # Example usage
    topic = input("Enter a research topic: ")
    content_type = input("Enter content type (article/report/blog): ") or "article"
    audience = input("Enter target audience (general/technical/business): ") or "general"
    
    print(f"\\n🚀 Starting research workflow for: {topic}")
    result = crew.execute_research_workflow(topic, content_type, audience)
    
    print(f"\\n✅ Workflow completed!")
    print(f"Result: {result}")
`
                },
                {
                    path: 'requirements.txt',
                    content: `crewai>=0.28.0
crewai-tools>=0.1.0
python-dotenv>=1.0.0
`
                },
                {
                    path: '.env.example',
                    content: `# API Keys
OPENAI_API_KEY=your_openai_api_key_here
SERPER_API_KEY=your_serper_api_key_here

# CrewAI Configuration
CREW_TELEMETRY=false
`
                }
            ],
            dependencies: ['crewai', 'crewai-tools'],
            commands: ['pip install -r requirements.txt']
        });
    }

    private addAutoGenTemplates() {
        // Basic AutoGen Group Chat
        this.templates.push({
            id: 'autogen-group-chat',
            name: 'AutoGen Group Chat',
            framework: 'autogen',
            description: 'Multi-agent conversation system using AutoGen',
            language: 'python',
            category: 'basic',
            tags: ['autogen', 'group-chat', 'conversation'],
            files: [
                {
                    path: 'src/group_chat.py',
                    content: `import autogen
from autogen import ConversableAgent, GroupChat, GroupChatManager
import os

class \${projectName}GroupChat:
    def __init__(self):
        self.config_list = self._get_config_list()
        self.agents = self._create_agents()
        self.group_chat = self._create_group_chat()
        self.manager = self._create_manager()

    def _get_config_list(self):
        return [
            {
                "model": "gpt-4o",
                "api_key": os.getenv("OPENAI_API_KEY")
            }
        ]

    def _create_agents(self):
        # User proxy agent
        user_proxy = ConversableAgent(
            name="UserProxy",
            system_message="A human admin who gives tasks and manages conversations.",
            code_execution_config={"last_n_messages": 2, "work_dir": "workspace"},
            human_input_mode="ALWAYS",
            max_consecutive_auto_reply=10,
            is_termination_msg=lambda x: x.get("content", "").rstrip().endswith("TERMINATE"),
        )

        # Planner agent
        planner = ConversableAgent(
            name="Planner",
            system_message="You are a strategic planner. Break down complex tasks into manageable steps and create detailed plans.",
            llm_config={"config_list": self.config_list, "temperature": 0.7},
            max_consecutive_auto_reply=10,
        )

        # Researcher agent
        researcher = ConversableAgent(
            name="Researcher", 
            system_message="You are a thorough researcher. Gather information, analyze data, and provide comprehensive research reports.",
            llm_config={"config_list": self.config_list, "temperature": 0.5},
            max_consecutive_auto_reply=10,
        )

        # Developer agent
        developer = ConversableAgent(
            name="Developer",
            system_message="You are an expert developer. Write clean, efficient code and provide technical solutions.",
            llm_config={"config_list": self.config_list, "temperature": 0.3},
            max_consecutive_auto_reply=10,
        )

        # Reviewer agent
        reviewer = ConversableAgent(
            name="Reviewer",
            system_message="You are a quality reviewer. Evaluate work, provide feedback, and ensure high standards.",
            llm_config={"config_list": self.config_list, "temperature": 0.4},
            max_consecutive_auto_reply=10,
        )

        return {
            'user_proxy': user_proxy,
            'planner': planner,
            'researcher': researcher,
            'developer': developer,
            'reviewer': reviewer
        }

    def _create_group_chat(self):
        return GroupChat(
            agents=list(self.agents.values()),
            messages=[],
            max_round=15,
            speaker_selection_method="round_robin",
        )

    def _create_manager(self):
        return GroupChatManager(
            groupchat=self.group_chat,
            llm_config={"config_list": self.config_list, "temperature": 0.5},
        )

    def start_conversation(self, initial_message: str):
        """Start a group conversation with the given message"""
        return self.agents['user_proxy'].initiate_chat(
            self.manager,
            message=initial_message
        )

    def add_custom_agent(self, name: str, system_message: str, temperature: float = 0.7):
        """Add a custom agent to the group"""
        agent = ConversableAgent(
            name=name,
            system_message=system_message,
            llm_config={"config_list": self.config_list, "temperature": temperature},
            max_consecutive_auto_reply=10,
        )
        
        self.agents[name.lower()] = agent
        self.group_chat.agents.append(agent)
        return agent

if __name__ == "__main__":
    # Initialize the group chat
    group_chat = \${projectName}GroupChat()
    
    # Example conversation
    initial_message = """
    I need help creating a simple web application that displays weather information. 
    Can you help me plan, research, develop, and review this project?
    """
    
    print("🤖 Starting group chat conversation...")
    result = group_chat.start_conversation(initial_message)
    print("✅ Conversation completed!")
`
                },
                {
                    path: 'requirements.txt',
                    content: `pyautogen>=0.2.0
openai>=1.0.0
python-dotenv>=1.0.0
`
                }
            ],
            dependencies: ['pyautogen', 'openai'],
            commands: ['pip install -r requirements.txt']
        });
    }

    private addSmolAgentsTemplates() {
        // Basic SmolAgent
        this.templates.push({
            id: 'smolagents-basic',
            name: 'Basic SmolAgents Setup',
            framework: 'smolagents',
            description: 'Minimalist code-first agent using SmolAgents',
            language: 'python',
            category: 'basic',
            tags: ['smolagents', 'minimalist', 'code-first'],
            files: [
                {
                    path: 'src/agent.py',
                    content: `from smolagents import CodeAgent, LiteLLMModel
from smolagents.tools import DuckDuckGoSearchTool, PythonInterpreterTool
import os

class \${projectName}Agent:
    def __init__(self):
        # Initialize the model
        self.model = LiteLLMModel(model_id="gpt-4o")
        
        # Initialize tools
        self.tools = [
            DuckDuckGoSearchTool(),
            PythonInterpreterTool()
        ]
        
        # Create the agent
        self.agent = CodeAgent(
            tools=self.tools,
            model=self.model,
            max_steps=10,
            verbose=True
        )

    def run_task(self, task_description: str):
        """Run a task with the SmolAgent"""
        try:
            print(f"🤖 Executing task: {task_description}")
            result = self.agent.run(task_description)
            print(f"✅ Task completed!")
            return result
        except Exception as e:
            print(f"❌ Error executing task: {str(e)}")
            return f"Error: {str(e)}"

    def interactive_mode(self):
        """Start interactive mode for continuous conversation"""
        print("🚀 Starting interactive mode. Type 'quit' to exit.")
        
        while True:
            try:
                task = input("\\nYou: ").strip()
                
                if task.lower() in ['quit', 'exit', 'bye']:
                    print("👋 Goodbye!")
                    break
                
                if not task:
                    continue
                
                result = self.run_task(task)
                print(f"\\nAgent: {result}")
                
            except KeyboardInterrupt:
                print("\\n👋 Goodbye!")
                break
            except Exception as e:
                print(f"❌ Error: {str(e)}")

if __name__ == "__main__":
    # Initialize the agent
    agent = \${projectName}Agent()
    
    # Example tasks
    example_tasks = [
        "Search for the latest news about artificial intelligence and summarize the top 3 articles",
        "Calculate the fibonacci sequence up to 20 numbers and create a simple visualization",
        "Write a Python function to check if a number is prime and test it with a few examples"
    ]
    
    print("🤖 \${projectName} Agent initialized!")
    print("\\nChoose an option:")
    print("1. Run example tasks")
    print("2. Interactive mode")
    print("3. Exit")
    
    choice = input("\\nEnter your choice (1-3): ").strip()
    
    if choice == "1":
        print("\\n🚀 Running example tasks...")
        for i, task in enumerate(example_tasks, 1):
            print(f"\\n{'='*50}")
            print(f"Example Task {i}")
            print(f"{'='*50}")
            result = agent.run_task(task)
            print(f"Result: {result}")
    
    elif choice == "2":
        agent.interactive_mode()
    
    else:
        print("👋 Goodbye!")
`
                },
                {
                    path: 'requirements.txt',
                    content: `smolagents>=0.1.0
litellm>=1.0.0
python-dotenv>=1.0.0
`
                }
            ],
            dependencies: ['smolagents', 'litellm'],
            commands: ['pip install -r requirements.txt']
        });
    }

    private addOtherFrameworkTemplates() {
        // Pydantic AI Template
        this.templates.push({
            id: 'pydantic-ai-basic',
            name: 'Pydantic AI Agent',
            framework: 'pydantic-ai',
            description: 'Type-safe AI agent using Pydantic AI',
            language: 'python',
            category: 'basic',
            tags: ['pydantic-ai', 'type-safe', 'validation'],
            files: [
                {
                    path: 'src/agent.py',
                    content: `from pydantic_ai import Agent
from pydantic import BaseModel
from typing import Optional

class TaskRequest(BaseModel):
    task: str
    priority: Optional[str] = "normal"
    context: Optional[str] = None

class TaskResponse(BaseModel):
    result: str
    status: str
    confidence: float

class \${projectName}Agent:
    def __init__(self):
        self.agent = Agent(
            'openai:gpt-4o',
            result_type=TaskResponse,
            system_prompt='You are a helpful AI assistant that processes tasks and provides structured responses.'
        )

    async def process_task(self, request: TaskRequest) -> TaskResponse:
        """Process a task request and return a structured response"""
        prompt = f"Task: {request.task}"
        if request.context:
            prompt += f"\\nContext: {request.context}"
        if request.priority != "normal":
            prompt += f"\\nPriority: {request.priority}"
        
        result = await self.agent.run(prompt)
        return result

    async def simple_chat(self, message: str) -> str:
        """Simple chat interface"""
        request = TaskRequest(task=message)
        response = await self.process_task(request)
        return response.result

if __name__ == "__main__":
    import asyncio
    
    async def main():
        agent = \${projectName}Agent()
        
        # Example usage
        request = TaskRequest(
            task="Explain quantum computing in simple terms",
            priority="high",
            context="Educational content for beginners"
        )
        
        response = await agent.process_task(request)
        print(f"Result: {response.result}")
        print(f"Status: {response.status}")
        print(f"Confidence: {response.confidence}")
    
    asyncio.run(main())
`
                },
                {
                    path: 'requirements.txt',
                    content: `pydantic-ai>=0.0.1
pydantic>=2.0.0
python-dotenv>=1.0.0
`
                }
            ],
            dependencies: ['pydantic-ai', 'pydantic'],
            commands: ['pip install -r requirements.txt']
        });

        // Semantic Kernel Template
        this.templates.push({
            id: 'semantic-kernel-basic',
            name: 'Semantic Kernel Agent',
            framework: 'semantic-kernel',
            description: 'Enterprise AI orchestration with Semantic Kernel',
            language: 'python',
            category: 'basic',
            tags: ['semantic-kernel', 'enterprise', 'orchestration'],
            files: [
                {
                    path: 'src/agent.py',
                    content: `import semantic_kernel as sk
from semantic_kernel.connectors.ai.open_ai import OpenAIChatCompletion
from semantic_kernel.core_plugins.text_plugin import TextPlugin
import os

class \${projectName}Agent:
    def __init__(self):
        # Initialize the kernel
        self.kernel = sk.Kernel()
        
        # Add AI service
        self.kernel.add_service(OpenAIChatCompletion(
            service_id="chat",
            ai_model_id="gpt-4o",
            api_key=os.getenv("OPENAI_API_KEY")
        ))
        
        # Add plugins
        self.kernel.add_plugin(TextPlugin(), plugin_name="text")
        
        # Define custom functions
        self._add_custom_functions()

    def _add_custom_functions(self):
        @self.kernel.function(name="analyze_sentiment", description="Analyze the sentiment of text")
        def analyze_sentiment(text: str) -> str:
            # Implement sentiment analysis logic
            return f"Sentiment analysis for: {text}"
        
        @self.kernel.function(name="summarize_text", description="Summarize long text")
        def summarize_text(text: str, max_length: int = 100) -> str:
            # Implement text summarization logic
            return f"Summary of text (max {max_length} chars): {text[:max_length]}..."

    async def process_request(self, user_input: str) -> str:
        """Process user request using the kernel"""
        try:
            # Create a simple prompt
            prompt = f"""
            User request: {user_input}
            
            Please process this request and provide a helpful response.
            """
            
            # Execute with the kernel
            result = await self.kernel.invoke_prompt(prompt)
            return str(result)
            
        except Exception as e:
            return f"Error processing request: {str(e)}"

    async def run_plugin_function(self, plugin_name: str, function_name: str, **kwargs) -> str:
        """Run a specific plugin function"""
        try:
            function = self.kernel.get_function(plugin_name, function_name)
            result = await function.invoke(self.kernel, **kwargs)
            return str(result)
        except Exception as e:
            return f"Error running function: {str(e)}"

if __name__ == "__main__":
    import asyncio
    
    async def main():
        agent = \${projectName}Agent()
        
        # Example usage
        response = await agent.process_request("Hello, how can you help me today?")
        print(f"Agent response: {response}")
        
        # Example plugin usage
        summary = await agent.run_plugin_function("text", "summarize_text", 
                                                 text="This is a long text that needs to be summarized...",
                                                 max_length=50)
        print(f"Summary: {summary}")
    
    asyncio.run(main())
`
                },
                {
                    path: 'requirements.txt',
                    content: `semantic-kernel>=1.0.0
openai>=1.0.0
python-dotenv>=1.0.0
`
                }
            ],
            dependencies: ['semantic-kernel', 'openai'],
            commands: ['pip install -r requirements.txt']
        });
    }
    async generateAgent(): Promise<void> {
        try {
            this.outputChannel.appendLine('🚀 Starting agent generation wizard...');
            
            // Step 1: Select template
            const selectedTemplate = await this.selectTemplate();
            if (!selectedTemplate) {
                this.outputChannel.appendLine('❌ No template selected, cancelling generation');
                return;
            }

            // Step 2: Get project details
            const projectContext = await this.getProjectContext(selectedTemplate);
            if (!projectContext) {
                this.outputChannel.appendLine('❌ Project context not provided, cancelling generation');
                return;
            }

            // Step 3: Choose project location
            const projectPath = await this.getProjectPath(projectContext.projectName);
            if (!projectPath) {
                this.outputChannel.appendLine('❌ Project path not selected, cancelling generation');
                return;
            }

            // Step 4: Generate the project
            await this.createFromTemplate(selectedTemplate, projectPath, projectContext);

        } catch (error) {
            this.outputChannel.appendLine(`❌ Agent generation failed: ${error}`);
            vscode.window.showErrorMessage(`Failed to generate agent: ${error}`);
        }
    }

    private async selectTemplate(): Promise<AgentTemplate | undefined> {
        // Group templates by framework
        const groupedTemplates = this.groupTemplatesByFramework();
        
        // Create framework selection items
        const frameworkItems = Object.keys(groupedTemplates).map(framework => ({
            label: framework,
            description: `${groupedTemplates[framework].length} template(s) available`,
            detail: groupedTemplates[framework].map(t => t.name).join(', ')
        }));

        // Select framework first
        const selectedFramework = await vscode.window.showQuickPick(frameworkItems, {
            placeHolder: 'Select an AI framework',
            title: 'Choose Framework for Agent Template'
        });

        if (!selectedFramework) {
            return undefined;
        }

        // Select specific template
        const frameworkTemplates = groupedTemplates[selectedFramework.label];
        const templateItems = frameworkTemplates.map(template => ({
            label: template.name,
            description: `${template.category} - ${template.language}`,
            detail: template.description,
            template: template
        }));

        const selectedTemplate = await vscode.window.showQuickPick(templateItems, {
            placeHolder: 'Select a template',
            title: `Choose ${selectedFramework.label} Template`
        });

        return selectedTemplate?.template;
    }

    private groupTemplatesByFramework(): { [framework: string]: AgentTemplate[] } {
        const grouped: { [framework: string]: AgentTemplate[] } = {};
        
        for (const template of this.templates) {
            const framework = this.getFrameworkDisplayName(template.framework);
            if (!grouped[framework]) {
                grouped[framework] = [];
            }
            grouped[framework].push(template);
        }

        return grouped;
    }

    private getFrameworkDisplayName(framework: string): string {
        const displayNames: { [key: string]: string } = {
            'openai-agents-sdk': 'OpenAI Agents SDK',
            'elizaos': 'ElizaOS',
            'langgraph': 'LangGraph',
            'crewai': 'CrewAI',
            'autogen': 'AutoGen',
            'smolagents': 'SmolAgents',
            'pydantic-ai': 'Pydantic AI',
            'semantic-kernel': 'Semantic Kernel',
            'langchain': 'LangChain',
            'google-adk': 'Google ADK'
        };
        
        return displayNames[framework] || framework;
    }

    private async getProjectContext(template: AgentTemplate): Promise<TemplateContext | undefined> {
        // Get project name
        const projectName = await vscode.window.showInputBox({
            prompt: 'Enter project name',
            placeHolder: 'my-ai-agent',
            title: 'Project Configuration',
            validateInput: (value) => {
                if (!value || value.trim().length === 0) {
                    return 'Project name is required';
                }
                if (!/^[a-zA-Z0-9-_\s]+$/.test(value)) {
                    return 'Project name can only contain letters, numbers, hyphens, underscores, and spaces';
                }
                return undefined;
            }
        });

        if (!projectName) {
            return undefined;
        }

        // Get project description
        const description = await vscode.window.showInputBox({
            prompt: 'Enter project description',
            placeHolder: 'A helpful AI agent that...',
            title: 'Project Configuration'
        });

        // Get author name (optional)
        const author = await vscode.window.showInputBox({
            prompt: 'Enter author name (optional)',
            placeHolder: 'Your Name',
            title: 'Project Configuration'
        });

        // Get version (optional)
        const version = await vscode.window.showInputBox({
            prompt: 'Enter initial version (optional)',
            placeHolder: '1.0.0',
            title: 'Project Configuration',
            value: '1.0.0'
        });

        return {
            projectName: projectName.trim(),
            description: description?.trim() || `An AI agent built with ${this.getFrameworkDisplayName(template.framework)}`,
            framework: template.framework,
            language: template.language,
            author: author?.trim(),
            version: version?.trim() || '1.0.0'
        };
    }

    private async getProjectPath(projectName: string): Promise<string | undefined> {
        const workspaceFolders = vscode.workspace.workspaceFolders;

        if (workspaceFolders && workspaceFolders.length > 0) {
            // If workspace is open, offer to create in workspace or choose different location
            const locationChoice = await vscode.window.showQuickPick([
                {
                    label: 'Current workspace',
                    description: workspaceFolders[0].uri.fsPath,
                    detail: 'Create project in the current workspace folder'
                },
                {
                    label: 'Choose different location',
                    description: 'Browse for a different folder',
                    detail: 'Select a custom location for the project'
                }
            ], {
                placeHolder: 'Where would you like to create the project?',
                title: 'Project Location'
            });

            if (!locationChoice) {
                return undefined;
            }

            if (locationChoice.label === 'Current workspace') {
                return path.join(workspaceFolders[0].uri.fsPath, projectName);
            }
        }

        // Browse for folder
        const selectedFolder = await vscode.window.showOpenDialog({
            canSelectFolders: true,
            canSelectFiles: false,
            canSelectMany: false,
            openLabel: 'Select Project Location',
            title: 'Choose Project Location'
        });

        if (!selectedFolder || selectedFolder.length === 0) {
            return undefined;
        }

        return path.join(selectedFolder[0].fsPath, projectName);
    }

    private async createFromTemplate(
        template: AgentTemplate,
        projectPath: string,
        context: TemplateContext
    ): Promise<void> {
        this.outputChannel.show();
        this.outputChannel.appendLine(`🚀 Creating project "${context.projectName}" using template "${template.name}"`);

        try {
            // Create project directory
            await vscode.workspace.fs.createDirectory(vscode.Uri.file(projectPath));
            this.outputChannel.appendLine(`📁 Created project directory: ${projectPath}`);

            // Process and create all template files
            for (const file of template.files) {
                await this.createTemplateFile(file, projectPath, context);
            }

            // Create additional project files
            await this.createProjectMetadata(projectPath, template, context);

            // Install dependencies if specified
            if (template.dependencies && template.dependencies.length > 0) {
                await this.offerDependencyInstallation(projectPath, template, context);
            }

            this.outputChannel.appendLine(`✅ Project "${context.projectName}" created successfully!`);

            // Show success message with options
            const action = await vscode.window.showInformationMessage(
                `Project "${context.projectName}" created successfully!`,
                'Open Project',
                'Open in New Window',
                'View Documentation',
                'Show in Explorer'
            );

            await this.handlePostCreationAction(action, projectPath, template);

        } catch (error) {
            this.outputChannel.appendLine(`❌ Failed to create project: ${error}`);
            throw error;
        }
    }

    private async createTemplateFile(
        file: TemplateFile,
        projectPath: string,
        context: TemplateContext
    ): Promise<void> {
        const filePath = path.join(projectPath, file.path);
        const fileUri = vscode.Uri.file(filePath);

        // Create directory if it doesn't exist
        const dirPath = path.dirname(filePath);
        await vscode.workspace.fs.createDirectory(vscode.Uri.file(dirPath));

        // Process template variables in content
        const processedContent = this.processTemplateVariables(file.content, context);

        // Write file content
        const encoding = file.encoding || 'utf8';
        await vscode.workspace.fs.writeFile(fileUri, Buffer.from(processedContent, encoding));

        // Set executable permissions if needed
        if (file.isExecutable) {
            try {
                await this.setExecutablePermissions(filePath);
            } catch (error) {
                this.outputChannel.appendLine(`⚠️ Warning: Could not set executable permissions for ${file.path}`);
            }
        }

        this.outputChannel.appendLine(`📄 Created file: ${file.path}`);
    }

    private processTemplateVariables(content: string, context: TemplateContext): string {
        let processed = content;

        // Replace common template variables
        const variables: { [key: string]: string } = {
            'projectName': context.projectName,
            'description': context.description,
            'framework': context.framework,
            'language': context.language,
            'author': context.author || 'Unknown',
            'version': context.version || '1.0.0',
            'date': new Date().toISOString().split('T')[0],
            'year': new Date().getFullYear().toString(),
            ...context // Include any additional context variables
        };

        // Replace ${variable} patterns
        for (const [key, value] of Object.entries(variables)) {
            const regex = new RegExp(`\\$\\{${key}\\}`, 'g');
            processed = processed.replace(regex, value);
        }

        // Handle special transformations
        processed = processed.replace(/\$\{projectName\.toLowerCase\(\)\.replace\(\/\\s\+\/g, '-'\)\}/g, 
            context.projectName.toLowerCase().replace(/\s+/g, '-'));
        
        processed = processed.replace(/\$\{projectName\.toLowerCase\(\)\}/g, 
            context.projectName.toLowerCase());

        return processed;
    }

    private async setExecutablePermissions(filePath: string): Promise<void> {
        if (process.platform !== 'win32') {
            const { exec } = require('child_process');
            return new Promise((resolve, reject) => {
                exec(`chmod +x "${filePath}"`, (error: any) => {
                    if (error) {
                        reject(error);
                    } else {
                        resolve();
                    }
                });
            });
        }
    }

    private async createProjectMetadata(
        projectPath: string,
        template: AgentTemplate,
        context: TemplateContext
    ): Promise<void> {
        // Create AI Agent Studio metadata
        const metadataDir = path.join(projectPath, '.aiagent');
        await vscode.workspace.fs.createDirectory(vscode.Uri.file(metadataDir));

        const metadata = {
            name: context.projectName,
            description: context.description,
            framework: template.framework,
            template: template.id,
            language: template.language,
            created: new Date().toISOString(),
            author: context.author,
            version: context.version,
            tags: template.tags,
            category: template.category
        };

        const metadataPath = path.join(metadataDir, 'project.json');
        await vscode.workspace.fs.writeFile(
            vscode.Uri.file(metadataPath),
            Buffer.from(JSON.stringify(metadata, null, 2))
        );

        this.outputChannel.appendLine(`📄 Created project metadata: .aiagent/project.json`);
    }

    private async offerDependencyInstallation(
        projectPath: string,
        template: AgentTemplate,
        context: TemplateContext
    ): Promise<void> {
        const shouldInstall = await vscode.window.showQuickPick(['Yes', 'No'], {
            placeHolder: 'Install project dependencies now?',
            title: 'Dependency Installation'
        });

        if (shouldInstall === 'Yes') {
            await this.installDependencies(projectPath, template);
        } else {
            // Create installation instructions
            await this.createInstallationInstructions(projectPath, template);
        }
    }

    private async installDependencies(projectPath: string, template: AgentTemplate): Promise<void> {
        this.outputChannel.appendLine('📦 Installing project dependencies...');

        try {
            if (template.commands) {
                for (const command of template.commands) {
                    this.outputChannel.appendLine(`⚙️ Running: ${command}`);
                    await this.executeCommand(command, projectPath);
                }
            }

            this.outputChannel.appendLine('✅ Dependencies installed successfully!');
        } catch (error) {
            this.outputChannel.appendLine(`⚠️ Warning: Dependency installation failed: ${error}`);
            
            const openTerminal = await vscode.window.showWarningMessage(
                'Dependency installation failed. You may need to install dependencies manually.',
                'Open Terminal',
                'View Instructions'
            );

            if (openTerminal === 'Open Terminal') {
                const terminal = vscode.window.createTerminal({
                    name: `${template.framework} Setup`,
                    cwd: projectPath
                });
                terminal.show();
            } else if (openTerminal === 'View Instructions') {
                await this.createInstallationInstructions(projectPath, template);
            }
        }
    }

    private async executeCommand(command: string, workingDirectory: string): Promise<void> {
        return new Promise<void>((resolve, reject) => {
            const { exec } = require('child_process');
            
            exec(command, { cwd: workingDirectory }, (error: any, stdout: any, stderr: any) => {
                if (error) {
                    this.outputChannel.appendLine(`❌ Command failed: ${error.message}`);
                    reject(error);
                } else {
                    if (stdout) this.outputChannel.appendLine(stdout);
                    if (stderr) this.outputChannel.appendLine(stderr);
                    resolve();
                }
            });
        });
    }

    private async createInstallationInstructions(projectPath: string, template: AgentTemplate): Promise<void> {
        const instructions = `# Installation Instructions

## Dependencies
${template.dependencies?.map(dep => `- ${dep}`).join('\n') || 'No dependencies specified'}

## Commands
${template.commands?.map(cmd => `\`\`\`bash\n${cmd}\n\`\`\``).join('\n\n') || 'No installation commands specified'}

## Manual Installation
1. Open a terminal in the project directory
2. Run the commands listed above in order
3. Follow any additional setup instructions in the README.md file

`;

        const instructionsPath = path.join(projectPath, 'INSTALL.md');
        await vscode.workspace.fs.writeFile(
            vscode.Uri.file(instructionsPath),
            Buffer.from(instructions)
        );

        // Open the instructions file
        const doc = await vscode.workspace.openTextDocument(vscode.Uri.file(instructionsPath));
        await vscode.window.showTextDocument(doc);
    }

    private async handlePostCreationAction(
        action: string | undefined,
        projectPath: string,
        template: AgentTemplate
    ): Promise<void> {
        switch (action) {
            case 'Open Project':
                await vscode.commands.executeCommand('vscode.openFolder', vscode.Uri.file(projectPath));
                break;
            case 'Open in New Window':
                await vscode.commands.executeCommand('vscode.openFolder', vscode.Uri.file(projectPath), true);
                break;
            case 'View Documentation':
                if (template.documentation) {
                    await vscode.env.openExternal(vscode.Uri.parse(template.documentation));
                } else {
                    const frameworkUrls: { [key: string]: string } = {
                        'openai-agents-sdk': 'https://platform.openai.com/docs/agents',
                        'elizaos': 'https://elizaos.github.io/eliza/',
                        'langgraph': 'https://langchain-ai.github.io/langgraph/',
                        'crewai': 'https://docs.crewai.com/',
                        'autogen': 'https://microsoft.github.io/autogen/',
                        'smolagents': 'https://huggingface.co/docs/smolagents',
                        'pydantic-ai': 'https://ai.pydantic.dev/',
                        'semantic-kernel': 'https://learn.microsoft.com/en-us/semantic-kernel/'
                    };
                    
                    const url = frameworkUrls[template.framework];
                    if (url) {
                        await vscode.env.openExternal(vscode.Uri.parse(url));
                    }
                }
                break;
            case 'Show in Explorer':
                if (process.platform === 'win32') {
                    await vscode.commands.executeCommand('revealFileInOS', vscode.Uri.file(projectPath));
                } else {
                    await vscode.commands.executeCommand('revealFileInOS', vscode.Uri.file(projectPath));
                }
                break;
        }
    }

    // Public methods for external access
    getTemplates(): AgentTemplate[] {
        return this.templates;
    }

    getTemplatesByFramework(framework: string): AgentTemplate[] {
        return this.templates.filter(t => t.framework === framework);
    }

    getTemplatesByCategory(category: string): AgentTemplate[] {
        return this.templates.filter(t => t.category === category);
    }

    getTemplatesByLanguage(language: string): AgentTemplate[] {
        return this.templates.filter(t => t.language === language);
    }

    searchTemplates(query: string): AgentTemplate[] {
        const lowerQuery = query.toLowerCase();
        return this.templates.filter(template => 
            template.name.toLowerCase().includes(lowerQuery) ||
            template.description.toLowerCase().includes(lowerQuery) ||
            template.tags.some(tag => tag.toLowerCase().includes(lowerQuery)) ||
            template.framework.toLowerCase().includes(lowerQuery)
        );
    }

    getTemplateById(id: string): AgentTemplate | undefined {
        return this.templates.find(t => t.id === id);
    }

    dispose(): void {
        this.outputChannel.dispose();
    }
}