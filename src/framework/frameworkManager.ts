import * as vscode from 'vscode';
import { FrameworkDetector } from './frameworkDetector';
import { FrameworkInstaller } from './frameworkInstaller';
import { FrameworkTreeProvider } from './frameworkTreeProvider';

export interface Framework {
    id: string;
    name: string;
    displayName: string;
    description: string;
    version?: string;
    installed: boolean;
    languages: string[];
    dependencies: string[];
    documentationUrl: string;
    templatePath: string;
    configSchema: any;
}

export class FrameworkManager {
    private frameworks: Framework[] = [];
    private detector: FrameworkDetector;
    private installer: FrameworkInstaller;
    private treeProvider: FrameworkTreeProvider;
    
    constructor(private context: vscode.ExtensionContext) {
        this.detector = new FrameworkDetector();
        this.installer = new FrameworkInstaller();
        this.treeProvider = new FrameworkTreeProvider(this);
        
        this.initializeFrameworks();
        this.detectInstalledFrameworks();
    }
    
    private initializeFrameworks() {
        this.frameworks = [
            {
                id: 'openai-agents-sdk',
                name: 'openai-agents-sdk',
                displayName: 'OpenAI Agents SDK',
                description: 'Production-ready framework for multi-agent workflows',
                installed: false,
                languages: ['typescript', 'javascript', 'python'],
                dependencies: ['openai'],
                documentationUrl: 'https://platform.openai.com/docs/agents',
                templatePath: 'templates/openai-agents-sdk',
                configSchema: {
                    type: 'object',
                    properties: {
                        apiKey: { type: 'string' },
                        model: { type: 'string', default: 'gpt-4o' },
                        temperature: { type: 'number', default: 0.7 }
                    }
                }
            },
            {
                id: 'elizaos',
                name: 'elizaos',
                displayName: 'ElizaOS',
                description: 'Web3-friendly AI agent framework',
                installed: false,
                languages: ['typescript', 'javascript'],
                dependencies: ['@elizaos/core'],
                documentationUrl: 'https://elizaos.github.io/eliza/',
                templatePath: 'templates/elizaos',
                configSchema: {
                    type: 'object',
                    properties: {
                        character: { type: 'string' },
                        providers: { type: 'array' },
                        actions: { type: 'array' }
                    }
                }
            },
            {
                id: 'langraph',
                name: 'langraph',
                displayName: 'LangGraph',
                description: 'State machine approach for complex agent workflows',
                installed: false,
                languages: ['python', 'typescript', 'javascript'],
                dependencies: ['@langchain/langgraph', 'langgraph'],
                documentationUrl: 'https://langchain-ai.github.io/langgraph/',
                templatePath: 'templates/langraph',
                configSchema: {
                    type: 'object',
                    properties: {
                        stateType: { type: 'string', default: 'AgentState' },
                        checkpointer: { type: 'string', default: 'memory' },
                        nodes: { type: 'array', items: { type: 'string' } }
                    }
                }
            },
            {
                id: 'crewai',
                name: 'crewai',
                displayName: 'CrewAI',
                description: 'Role-based multi-agent collaboration framework',
                installed: false,
                languages: ['python'],
                dependencies: ['crewai'],
                documentationUrl: 'https://docs.crewai.com/',
                templatePath: 'templates/crewai',
                configSchema: {
                    type: 'object',
                    properties: {
                        agents: { type: 'array', items: { type: 'object' } },
                        tasks: { type: 'array', items: { type: 'object' } },
                        process: { type: 'string', default: 'sequential' }
                    }
                }
            },
            {
                id: 'autogen',
                name: 'autogen',
                displayName: 'Microsoft AutoGen',
                description: 'Conversation-based multi-agent systems',
                installed: false,
                languages: ['python'],
                dependencies: ['pyautogen'],
                documentationUrl: 'https://microsoft.github.io/autogen/',
                templatePath: 'templates/autogen',
                configSchema: {
                    type: 'object',
                    properties: {
                        llm_config: { type: 'object' },
                        human_input_mode: { type: 'string', default: 'NEVER' },
                        max_consecutive_auto_reply: { type: 'number', default: 10 }
                    }
                }
            },
            {
                id: 'smolagents',
                name: 'smolagents',
                displayName: 'SmolAgents',
                description: 'Minimalist code-first agent framework',
                installed: false,
                languages: ['python'],
                dependencies: ['smolagents'],
                documentationUrl: 'https://huggingface.co/docs/smolagents',
                templatePath: 'templates/smolagents',
                configSchema: {
                    type: 'object',
                    properties: {
                        model_id: { type: 'string', default: 'gpt-4o' },
                        max_steps: { type: 'number', default: 10 },
                        verbose: { type: 'boolean', default: true }
                    }
                }
            },
            {
                id: 'google-adk',
                name: 'google-adk',
                displayName: 'Google ADK',
                description: 'Google Agent Development Kit for enterprise',
                installed: false,
                languages: ['python', 'typescript', 'javascript'],
                dependencies: ['@google-cloud/agents'],
                documentationUrl: 'https://cloud.google.com/agents',
                templatePath: 'templates/google-adk',
                configSchema: {
                    type: 'object',
                    properties: {
                        project_id: { type: 'string' },
                        location: { type: 'string', default: 'us-central1' },
                        agent_type: { type: 'string', default: 'sequential' }
                    }
                }
            },
            {
                id: 'semantic-kernel',
                name: 'semantic-kernel',
                displayName: 'Semantic Kernel',
                description: 'Microsoft enterprise AI orchestration framework',
                installed: false,
                languages: ['python', 'csharp'],
                dependencies: ['semantic-kernel'],
                documentationUrl: 'https://learn.microsoft.com/en-us/semantic-kernel/',
                templatePath: 'templates/semantic-kernel',
                configSchema: {
                    type: 'object',
                    properties: {
                        ai_service: { type: 'string', default: 'openai' },
                        model: { type: 'string', default: 'gpt-4o' },
                        max_tokens: { type: 'number', default: 1000 }
                    }
                }
            },
            {
                id: 'pydantic-ai',
                name: 'pydantic-ai',
                displayName: 'Pydantic AI',
                description: 'Type-safe AI agent framework',
                installed: false,
                languages: ['python'],
                dependencies: ['pydantic-ai'],
                documentationUrl: 'https://ai.pydantic.dev/',
                templatePath: 'templates/pydantic-ai',
                configSchema: {
                    type: 'object',
                    properties: {
                        model: { type: 'string', default: 'openai:gpt-4o' },
                        result_type: { type: 'string' },
                        system_prompt: { type: 'string' }
                    }
                }
            },
            {
                id: 'langchain',
                name: 'langchain',
                displayName: 'LangChain',
                description: 'Popular LLM application framework',
                installed: false,
                languages: ['python', 'typescript', 'javascript'],
                dependencies: ['langchain'],
                documentationUrl: 'https://docs.langchain.com/',
                templatePath: 'templates/langchain',
                configSchema: {
                    type: 'object',
                    properties: {
                        llm: { type: 'object' },
                        tools: { type: 'array', items: { type: 'object' } },
                        agent_type: { type: 'string', default: 'zero-shot-react-description' }
                    }
                }
            }
        ];
    }
    private async detectInstalledFrameworks() {
        for (const framework of this.frameworks) {
            framework.installed = await this.detector.isFrameworkInstalled(framework);
            if (framework.installed) {
                framework.version = await this.detector.getFrameworkVersion(framework);
            }
        }
        this.treeProvider.refresh();
    }
    
    async configureFramework() {
        const frameworks = this.frameworks.filter(f => f.installed);
        
        if (frameworks.length === 0) {
            vscode.window.showWarningMessage('No AI frameworks detected. Install a framework first.');
            return;
        }
        
        const selectedFramework = await vscode.window.showQuickPick(
            frameworks.map(f => ({
                label: f.displayName,
                description: f.description,
                framework: f
            })),
            { placeHolder: 'Select a framework to configure' }
        );
        
        if (selectedFramework) {
            await this.openFrameworkConfig(selectedFramework.framework);
        }
    }
    
    private async openFrameworkConfig(framework: Framework) {
        const config = vscode.workspace.getConfiguration('aiAgentStudio');
        const frameworkConfig = config.get(`frameworks.${framework.id}`) || {};
        
        const configUri = vscode.Uri.joinPath(
            this.context.extensionUri,
            'configs',
            `${framework.id}.json`
        );
        
        try {
            await vscode.workspace.fs.writeFile(
                configUri,
                Buffer.from(JSON.stringify(frameworkConfig, null, 2))
            );
            
            const doc = await vscode.workspace.openTextDocument(configUri);
            await vscode.window.showTextDocument(doc);
        } catch (error) {
            vscode.window.showErrorMessage(`Failed to open config: ${error}`);
        }
    }
    
    async installFramework() {
        const availableFrameworks = this.frameworks.filter(f => !f.installed);
        
        if (availableFrameworks.length === 0) {
            vscode.window.showInformationMessage('All frameworks are already installed.');
            return;
        }
        
        const selectedFramework = await vscode.window.showQuickPick(
            availableFrameworks.map(f => ({
                label: f.displayName,
                description: f.description,
                framework: f
            })),
            { placeHolder: 'Select a framework to install' }
        );
        
        if (selectedFramework) {
            await this.installer.installFramework(selectedFramework.framework);
            await this.detectInstalledFrameworks();
        }
    }
    
    getFrameworks(): Framework[] {
        return this.frameworks;
    }
    
    getFrameworkById(id: string): Framework | undefined {
        return this.frameworks.find(f => f.id === id);
    }
    
    getInstalledFrameworks(): Framework[] {
        return this.frameworks.filter(f => f.installed);
    }
    
    getTreeDataProvider(): FrameworkTreeProvider {
        return this.treeProvider;
    }
    
    async refreshFrameworkStatus() {
        await this.detectInstalledFrameworks();
    }
}            },
            {
                id: 'langraph',
                name: 'langraph',
                displayName: 'LangGraph',
                description: 'State machine approach for complex agent workflows',
                installed: false,
                languages: ['python', 'typescript', 'javascript'],
                dependencies: ['@langchain/langgraph', 'langgraph'],
                documentationUrl: 'https://langchain-ai.github.io/langgraph/',
                templatePath: 'templates/langraph',
                configSchema: {
                    type: 'object',
                    properties: {
                        stateType: { type: 'string', default: 'AgentState' },
                        checkpointer: { type: 'string', default: 'memory' },
                        nodes: { type: 'array', items: { type: 'string' } }
                    }
                }
            },
            {
                id: 'crewai',
                name: 'crewai',
                displayName: 'CrewAI',
                description: 'Role-based multi-agent collaboration framework',
                installed: false,
                languages: ['python'],
                dependencies: ['crewai'],
                documentationUrl: 'https://docs.crewai.com/',
                templatePath: 'templates/crewai',
                configSchema: {
                    type: 'object',
                    properties: {
                        agents: { type: 'array', items: { type: 'object' } },
                        tasks: { type: 'array', items: { type: 'object' } },
                        process: { type: 'string', default: 'sequential' }
                    }
                }
            },
            {
                id: 'autogen',
                name: 'autogen',
                displayName: 'Microsoft AutoGen',
                description: 'Conversation-based multi-agent systems',
                installed: false,
                languages: ['python'],
                dependencies: ['pyautogen'],
                documentationUrl: 'https://microsoft.github.io/autogen/',
                templatePath: 'templates/autogen',
                configSchema: {
                    type: 'object',
                    properties: {
                        llm_config: { type: 'object' },
                        human_input_mode: { type: 'string', default: 'NEVER' },
                        max_consecutive_auto_reply: { type: 'number', default: 10 }
                    }
                }
            },
            {
                id: 'smolagents',
                name: 'smolagents',
                displayName: 'SmolAgents',
                description: 'Minimalist code-first agent framework',
                installed: false,
                languages: ['python'],
                dependencies: ['smolagents'],
                documentationUrl: 'https://huggingface.co/docs/smolagents',
                templatePath: 'templates/smolagents',
                configSchema: {
                    type: 'object',
                    properties: {
                        model_id: { type: 'string', default: 'gpt-4o' },
                        max_steps: { type: 'number', default: 10 },
                        verbose: { type: 'boolean', default: true }
                    }
                }
            },
            {
                id: 'google-adk',
                name: 'google-adk',
                displayName: 'Google ADK',
                description: 'Google Agent Development Kit for enterprise',
                installed: false,
                languages: ['python', 'typescript', 'javascript'],
                dependencies: ['@google-cloud/agents'],
                documentationUrl: 'https://cloud.google.com/agents',
                templatePath: 'templates/google-adk',
                configSchema: {
                    type: 'object',
                    properties: {
                        project_id: { type: 'string' },
                        location: { type: 'string', default: 'us-central1' },
                        agent_type: { type: 'string', default: 'sequential' }
                    }
                }
            },
            {
                id: 'semantic-kernel',
                name: 'semantic-kernel',
                displayName: 'Semantic Kernel',
                description: 'Microsoft enterprise AI orchestration framework',
                installed: false,
                languages: ['python', 'csharp'],
                dependencies: ['semantic-kernel'],
                documentationUrl: 'https://learn.microsoft.com/en-us/semantic-kernel/',
                templatePath: 'templates/semantic-kernel',
                configSchema: {
                    type: 'object',
                    properties: {
                        ai_service: { type: 'string', default: 'openai' },
                        model: { type: 'string', default: 'gpt-4o' },
                        max_tokens: { type: 'number', default: 1000 }
                    }
                }
            },
            {
                id: 'pydantic-ai',
                name: 'pydantic-ai',
                displayName: 'Pydantic AI',
                description: 'Type-safe AI agent framework',
                installed: false,
                languages: ['python'],
                dependencies: ['pydantic-ai'],
                documentationUrl: 'https://ai.pydantic.dev/',
                templatePath: 'templates/pydantic-ai',
                configSchema: {
                    type: 'object',
                    properties: {
                        model: { type: 'string', default: 'openai:gpt-4o' },
                        result_type: { type: 'string' },
                        system_prompt: { type: 'string' }
                    }
                }
            },
            {
                id: 'langchain',
                name: 'langchain',
                displayName: 'LangChain',
                description: 'Popular LLM application framework',
                installed: false,
                languages: ['python', 'typescript', 'javascript'],
                dependencies: ['langchain'],
                documentationUrl: 'https://docs.langchain.com/',
                templatePath: 'templates/langchain',
                configSchema: {
                    type: 'object',
                    properties: {
                        llm: { type: 'object' },
                        tools: { type: 'array', items: { type: 'object' } },
                        agent_type: { type: 'string', default: 'zero-shot-react-description' }
                    }
                }
            }
        ];
    }