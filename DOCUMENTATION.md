# AI Agent Studio Extension Documentation

## 🎯 Overview

The AI Agent Studio extension is the ultimate VS Code extension for developing AI agents with comprehensive support for all major frameworks. It provides templates, snippets, documentation access, and development tools to streamline your AI agent development workflow.

## 🚀 Getting Started

### Installation

1. **From VS Code Marketplace** (when published):
   - Open VS Code
   - Go to Extensions (Ctrl+Shift+X)
   - Search for "AI Agent Studio"
   - Click Install

2. **From VSIX file**:
   ```bash
   code --install-extension ai-agent-studio-1.0.0.vsix
   ```

### First Steps

1. **Open Command Palette** (`Ctrl+Shift+P` or `Cmd+Shift+P`)
2. **Run**: `AI Agent Studio: Create New Agent Project`
3. **Select** your preferred framework
4. **Choose** a template
5. **Start coding**!

## 📚 Supported Frameworks

### 🔥 Latest Frameworks (2025)

| Framework | Language | Status | Description |
|-----------|----------|--------|-------------|
| OpenAI Agents SDK | TypeScript/Python | ✅ Active | Production-ready multi-agent framework |
| ElizaOS | TypeScript | ✅ Active | Web3-friendly agent framework |
| LangGraph | Python/TypeScript | ✅ Active | State machine workflow approach |
| CrewAI | Python | ✅ Active | Role-based multi-agent collaboration |
| AutoGen | Python | ✅ Active | Conversation-based multi-agent systems |
| SmolAgents | Python | ✅ Active | Minimalist code-first agents |
| Google ADK | Python | ✅ Active | Enterprise-grade development kit |
| Semantic Kernel | C#/Python | ✅ Active | Microsoft's AI orchestration |
| Pydantic AI | Python | ✅ Active | Type-safe agent development |

## 🎨 Features

### 🔧 Code Generation & Templates

#### Creating New Projects
```bash
# Command Palette
AI Agent Studio: Create New Agent Project

# Select Framework → Choose Template → Start Coding
```

#### Available Templates
- **OpenAI Agents SDK**: Basic Agent, Multi-Agent System, Tool Integration
- **ElizaOS**: Character Agent, Web3 Integration, Social Media Bot
- **LangGraph**: Workflow Agent, State Machine, Conditional Logic
- **CrewAI**: Role-Based Team, Sequential Tasks, Hierarchical Process
- **AutoGen**: Group Chat, Code Execution, Human-in-the-Loop

### 📝 Smart Snippets

#### TypeScript/JavaScript Snippets
```typescript
// Type: openai-agent
import { Agent } from '@openai/agents-sdk';

export class MyAgent extends Agent {
    constructor() {
        super({
            name: 'MyAgent',
            instructions: 'You are a helpful AI assistant.',
            model: 'gpt-4o'
        });
    }
}
```

#### Python Snippets
```python
# Type: crew-agent
from crewai import Agent, Task, Crew

researcher = Agent(
    role='Research Specialist',
    goal='Gather comprehensive information',
    backstory='Expert in research and data analysis'
)
```

### 🔍 Context7 Integration

#### Real-time Documentation Access
- **Search**: Right-click → "Search Context7 Documentation"
- **Hover**: Hover over framework keywords for quick info
- **Panel**: View comprehensive documentation in side panel

#### Context7 Commands
```bash
# Search specific framework docs
AI Agent Studio: Search Context7 Documentation

# Open framework documentation
AI Agent Studio: Open Framework Documentation
```

### 📊 Agent Dashboard

#### Visual Management Interface
- **Active Agents**: Monitor running agents
- **Framework Status**: Check installed frameworks
- **Performance Metrics**: Track agent performance
- **Project Overview**: Manage multiple projects

#### Opening Dashboard
```bash
# Command Palette
AI Agent Studio: Open Agent Dashboard
```

### 🛠 Development Tools

#### Agent Monitoring
```bash
# Start monitoring
AI Agent Studio: Start Agent Monitoring

# View metrics in sidebar
- Agent Status
- Performance Data
- Error Logs
- Usage Statistics
```

#### Testing Tools
```bash
# Test agent functionality
AI Agent Studio: Test Agent

# Run specific test suites
- Unit Tests
- Integration Tests
- Performance Tests
```

## 🎯 Framework-Specific Guides

### OpenAI Agents SDK

#### Basic Setup
```typescript
import { Agent, Tool } from '@openai/agents-sdk';

const weatherTool: Tool = {
    name: 'get_weather',
    description: 'Get current weather',
    parameters: {
        type: 'object',
        properties: {
            location: { type: 'string' }
        }
    },
    async execute(params) {
        // Tool implementation
        return { weather: 'sunny' };
    }
};

export class WeatherAgent extends Agent {
    constructor() {
        super({
            name: 'WeatherAgent',
            instructions: 'You provide weather information',
            tools: [weatherTool]
        });
    }
}
```

#### Multi-Agent Handoffs
```typescript
// Agent A can hand off to Agent B
const agentA = new Agent({
    name: 'AgentA',
    instructions: 'Handle initial queries, hand off complex tasks',
    handoffTargets: ['AgentB']
});

const agentB = new Agent({
    name: 'AgentB',
    instructions: 'Handle complex analysis tasks'
});
```

### ElizaOS

#### Character Configuration
```json
{
    "name": "TechMentor",
    "bio": "AI assistant for developers",
    "lore": ["Helps with AI development"],
    "style": {
        "all": ["Be helpful", "Provide examples"]
    },
    "topics": ["AI", "programming", "frameworks"],
    "clients": ["discord", "twitter"]
}
```

#### Custom Actions
```typescript
const codeAnalysisAction = {
    name: 'ANALYZE_CODE',
    description: 'Analyze code snippets',
    validate: async (runtime, message) => {
        return message.content.text.includes('```');
    },
    handler: async (runtime, message) => {
        // Analysis logic
        return { text: 'Code analysis complete' };
    }
};
```

### LangGraph

#### State Machine Setup
```python
from langgraph.graph import StateGraph
from typing import TypedDict

class AgentState(TypedDict):
    messages: list
    current_step: str

def process_node(state: AgentState):
    return {"current_step": "processing"}

workflow = StateGraph(AgentState)
workflow.add_node("process", process_node)
workflow.add_edge("__start__", "process")
```

### CrewAI

#### Multi-Agent Team
```python
from crewai import Agent, Task, Crew

# Define specialized agents
researcher = Agent(
    role='Researcher',
    goal='Gather information',
    backstory='Expert researcher'
)

analyst = Agent(
    role='Analyst',
    goal='Analyze data',
    backstory='Data analysis expert'
)

# Create collaborative crew
crew = Crew(
    agents=[researcher, analyst],
    tasks=[research_task, analysis_task],
    process=Process.sequential
)
```

## ⚙️ Configuration

### Extension Settings

#### Basic Configuration
```json
{
    "aiAgentStudio.defaultFramework": "openai-agents-sdk",
    "aiAgentStudio.context7.enabled": true,
    "aiAgentStudio.monitoring.enabled": true,
    "aiAgentStudio.autoCompleteEnabled": true
}
```

#### Context7 Setup
```json
{
    "aiAgentStudio.context7.apiKey": "your-api-key",
    "aiAgentStudio.context7.endpoint": "https://mcp.context7.com/mcp"
}
```

### Framework Detection

The extension automatically detects installed frameworks by:
- Analyzing `package.json` dependencies
- Checking import statements
- Scanning project files for framework-specific patterns

## 🔄 Workflows

### Development Workflow

1. **Create Project**
   ```bash
   AI Agent Studio: Create New Agent Project
   ```

2. **Choose Framework & Template**
   - Select from supported frameworks
   - Pick appropriate template
   - Customize configuration

3. **Develop Agent**
   - Use smart snippets
   - Access Context7 documentation
   - Test incrementally

4. **Monitor & Debug**
   - Enable agent monitoring
   - View performance metrics
   - Debug with built-in tools

5. **Deploy**
   ```bash
   AI Agent Studio: Deploy Agent
   ```

### Testing Workflow

1. **Unit Testing**
   ```bash
   AI Agent Studio: Test Agent
   ```

2. **Integration Testing**
   - Test multi-agent interactions
   - Verify tool integrations
   - Check handoff mechanisms

3. **Performance Testing**
   - Monitor response times
   - Track resource usage
   - Optimize configurations

## 🎨 Customization

### Custom Templates

#### Creating Templates
```json
{
    "name": "Custom Agent Template",
    "framework": "openai-agents-sdk",
    "files": [
        {
            "path": "src/agent.ts",
            "content": "// Custom agent implementation"
        }
    ]
}
```

#### Template Structure
```
templates/
├── openai-agents-sdk/
│   ├── basic-agent/
│   ├── multi-agent/
│   └── tool-integration/
├── elizaos/
│   ├── character-agent/
│   └── web3-integration/
└── crewai/
    ├── research-team/
    └── analysis-crew/
```

### Custom Snippets

#### Adding Snippets
```json
{
    "Custom Agent Pattern": {
        "prefix": ["custom-agent"],
        "body": [
            "class ${1:AgentName} {",
            "    constructor() {",
            "        this.name = '${1:AgentName}';",
            "    }",
            "}"
        ],
        "description": "Custom agent pattern"
    }
}
```

## 🚀 Advanced Features

### Multi-Agent Orchestration

#### Agent Communication
```typescript
class AgentOrchestrator {
    private agents = new Map<string, Agent>();
    
    async delegateTask(task: string, agentId: string) {
        const agent = this.agents.get(agentId);
        return await agent.process(task);
    }
    
    async broadcastMessage(message: string) {
        const responses = new Map();
        for (const [id, agent] of this.agents) {
            const response = await agent.process(message);
            responses.set(id, response);
        }
        return responses;
    }
}
```

### Context7 Integration

#### Custom Context7 Queries
```typescript
import { Context7Provider } from './context7/context7Provider';

const context7 = new Context7Provider(context);

// Search for specific documentation
const docs = await context7.searchDocumentation('OpenAI Agents SDK tools');

// Get framework-specific docs
const frameworkDocs = await context7.openFrameworkDocs('ElizaOS');
```

### Performance Monitoring

#### Agent Metrics
```typescript
class AgentMonitor {
    private metrics = {
        responseTime: [],
        errorRate: 0,
        requestCount: 0,
        memoryUsage: 0
    };
    
    trackResponse(startTime: number, endTime: number) {
        this.metrics.responseTime.push(endTime - startTime);
        this.metrics.requestCount++;
    }
    
    getAverageResponseTime() {
        return this.metrics.responseTime.reduce((a, b) => a + b, 0) / 
               this.metrics.responseTime.length;
    }
}
```

## 🔧 Troubleshooting

### Common Issues

#### Framework Not Detected
```bash
# Check package.json
npm list @openai/agents-sdk

# Refresh framework status
AI Agent Studio: Configure Framework Settings
```

#### Context7 Connection Issues
```bash
# Test connection
curl -X POST https://mcp.context7.com/mcp \
  -H "Content-Type: application/json" \
  -d '{"method": "resolve-library-id", "params": {"libraryName": "test"}}'
```

#### Extension Performance
```bash
# Clear extension cache
AI Agent Studio: Clear Cache

# Restart VS Code
Ctrl+Shift+P → "Developer: Reload Window"
```

## 🤝 Contributing

### Development Setup

1. **Clone Repository**
   ```bash
   git clone https://github.com/ai-agent-studio/vscode-extension
   cd vscode-extension
   ```

2. **Install Dependencies**
   ```bash
   npm install
   ```

3. **Build Extension**
   ```bash
   npm run compile
   ```

4. **Run Tests**
   ```bash
   npm test
   ```

### Adding Framework Support

1. **Create Framework Definition**
   ```typescript
   const newFramework: Framework = {
       id: 'new-framework',
       name: 'New Framework',
       displayName: 'New Framework',
       description: 'Description of the framework',
       languages: ['typescript', 'python'],
       dependencies: ['new-framework-package'],
       documentationUrl: 'https://docs.new-framework.com',
       templatePath: 'templates/new-framework'
   };
   ```

2. **Add Templates**
   ```
   templates/new-framework/
   ├── basic-agent/
   ├── advanced-agent/
   └── multi-agent/
   ```

3. **Create Snippets**
   ```json
   {
       "New Framework Agent": {
           "prefix": ["new-framework-agent"],
           "body": ["// New framework agent code"],
           "description": "New framework agent template"
       }
   }
   ```

## 📞 Support

### Getting Help

- **GitHub Issues**: [Report bugs and request features](https://github.com/ai-agent-studio/vscode-extension/issues)
- **Documentation**: [Full documentation](https://ai-agent-studio.github.io/docs)
- **Discord**: [Join our community](https://discord.gg/ai-agent-studio)
- **Email**: support@ai-agent-studio.com

### FAQ

**Q: Which framework should I choose for my project?**
A: Use the extension's framework recommendation feature or check our [framework comparison guide](https://ai-agent-studio.github.io/docs/frameworks).

**Q: How do I add custom templates?**
A: Create templates in the `templates/` directory and register them in the extension settings.

**Q: Can I use multiple frameworks in one project?**
A: Yes! The extension supports multi-framework projects with proper configuration.

**Q: How do I integrate with Context7?**
A: Enable Context7 in settings and use the search commands to access real-time documentation.

---

**Happy AI Agent Development! 🤖✨**