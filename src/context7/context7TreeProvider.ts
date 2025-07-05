import * as vscode from 'vscode';
import { Context7Provider } from './context7Provider';

export class Context7TreeItem extends vscode.TreeItem {
    constructor(
        public readonly label: string,
        public readonly collapsibleState: vscode.TreeItemCollapsibleState,
        public readonly itemType: 'category' | 'framework' | 'history' | 'search' | 'action',
        public readonly data?: any
    ) {
        super(label, collapsibleState);
        
        this.contextValue = itemType;
        this.tooltip = this.getTooltip();
        this.iconPath = this.getIcon();
        
        if (itemType === 'framework' || itemType === 'search') {
            this.command = {
                command: 'ai-agent-studio.searchContext7',
                title: 'Search Context7',
                arguments: [label]
            };
        } else if (itemType === 'action') {
            this.command = {
                command: this.getActionCommand(),
                title: label,
                arguments: []
            };
        }
    }

    private getTooltip(): string {
        switch (this.itemType) {
            case 'framework':
                return `Search Context7 for ${this.label} documentation`;
            case 'history':
                return `Previous search: ${this.label}`;
            case 'search':
                return `Search for: ${this.label}`;
            case 'action':
                return this.getActionTooltip();
            default:
                return this.label;
        }
    }

    private getIcon(): vscode.ThemeIcon {
        switch (this.itemType) {
            case 'category':
                return new vscode.ThemeIcon('folder');
            case 'framework':
                return new vscode.ThemeIcon('package');
            case 'history':
                return new vscode.ThemeIcon('history');
            case 'search':
                return new vscode.ThemeIcon('search');
            case 'action':
                return new vscode.ThemeIcon(this.getActionIcon());
            default:
                return new vscode.ThemeIcon('circle-outline');
        }
    }

    private getActionCommand(): string {
        switch (this.label) {
            case 'New Search':
                return 'ai-agent-studio.searchContext7';
            case 'Clear History':
                return 'ai-agent-studio.clearContext7History';
            case 'Browse Frameworks':
                return 'ai-agent-studio.openFrameworkDocs';
            case 'Refresh':
                return 'ai-agent-studio.refreshContext7';
            default:
                return 'ai-agent-studio.searchContext7';
        }
    }

    private getActionIcon(): string {
        switch (this.label) {
            case 'New Search':
                return 'search';
            case 'Clear History':
                return 'clear-all';
            case 'Browse Frameworks':
                return 'library';
            case 'Refresh':
                return 'refresh';
            default:
                return 'circle-outline';
        }
    }

    private getActionTooltip(): string {
        switch (this.label) {
            case 'New Search':
                return 'Start a new Context7 documentation search';
            case 'Clear History':
                return 'Clear search history';
            case 'Browse Frameworks':
                return 'Browse available framework documentation';
            case 'Refresh':
                return 'Refresh the Context7 explorer';
            default:
                return this.label;
        }
    }
}

export class Context7TreeProvider implements vscode.TreeDataProvider<Context7TreeItem> {
    private _onDidChangeTreeData: vscode.EventEmitter<Context7TreeItem | undefined | null | void> = 
        new vscode.EventEmitter<Context7TreeItem | undefined | null | void>();
    readonly onDidChangeTreeData: vscode.Event<Context7TreeItem | undefined | null | void> = 
        this._onDidChangeTreeData.event;

    constructor(private context7Provider: Context7Provider) {}

    refresh(): void {
        this._onDidChangeTreeData.fire();
    }

    getTreeItem(element: Context7TreeItem): vscode.TreeItem {
        return element;
    }

    getChildren(element?: Context7TreeItem): Thenable<Context7TreeItem[]> {
        if (!element) {
            // Root level
            return Promise.resolve([
                new Context7TreeItem('Quick Actions', vscode.TreeItemCollapsibleState.Expanded, 'category'),
                new Context7TreeItem('AI Frameworks', vscode.TreeItemCollapsibleState.Expanded, 'category'),
                new Context7TreeItem('Search History', vscode.TreeItemCollapsibleState.Collapsed, 'category'),
                new Context7TreeItem('Popular Searches', vscode.TreeItemCollapsibleState.Collapsed, 'category')
            ]);
        }

        switch (element.label) {
            case 'Quick Actions':
                return Promise.resolve([
                    new Context7TreeItem('New Search', vscode.TreeItemCollapsibleState.None, 'action'),
                    new Context7TreeItem('Browse Frameworks', vscode.TreeItemCollapsibleState.None, 'action'),
                    new Context7TreeItem('Clear History', vscode.TreeItemCollapsibleState.None, 'action'),
                    new Context7TreeItem('Refresh', vscode.TreeItemCollapsibleState.None, 'action')
                ]);

            case 'AI Frameworks':
                return Promise.resolve([
                    new Context7TreeItem('OpenAI Agents SDK', vscode.TreeItemCollapsibleState.Collapsed, 'framework'),
                    new Context7TreeItem('ElizaOS', vscode.TreeItemCollapsibleState.Collapsed, 'framework'),
                    new Context7TreeItem('LangGraph', vscode.TreeItemCollapsibleState.Collapsed, 'framework'),
                    new Context7TreeItem('CrewAI', vscode.TreeItemCollapsibleState.Collapsed, 'framework'),
                    new Context7TreeItem('AutoGen', vscode.TreeItemCollapsibleState.Collapsed, 'framework'),
                    new Context7TreeItem('SmolAgents', vscode.TreeItemCollapsibleState.Collapsed, 'framework'),
                    new Context7TreeItem('Google ADK', vscode.TreeItemCollapsibleState.Collapsed, 'framework'),
                    new Context7TreeItem('Semantic Kernel', vscode.TreeItemCollapsibleState.Collapsed, 'framework'),
                    new Context7TreeItem('Pydantic AI', vscode.TreeItemCollapsibleState.Collapsed, 'framework'),
                    new Context7TreeItem('LangChain', vscode.TreeItemCollapsibleState.Collapsed, 'framework')
                ]);

            case 'Search History':
                const history = this.context7Provider.getSearchHistory();
                if (history.length === 0) {
                    return Promise.resolve([
                        new Context7TreeItem('No search history', vscode.TreeItemCollapsibleState.None, 'history')
                    ]);
                }
                return Promise.resolve(
                    history.slice(0, 10).map(item => 
                        new Context7TreeItem(item, vscode.TreeItemCollapsibleState.None, 'history')
                    )
                );

            case 'Popular Searches':
                return Promise.resolve([
                    new Context7TreeItem('agent configuration', vscode.TreeItemCollapsibleState.None, 'search'),
                    new Context7TreeItem('multi-agent workflow', vscode.TreeItemCollapsibleState.None, 'search'),
                    new Context7TreeItem('agent communication', vscode.TreeItemCollapsibleState.None, 'search'),
                    new Context7TreeItem('tool integration', vscode.TreeItemCollapsibleState.None, 'search'),
                    new Context7TreeItem('state management', vscode.TreeItemCollapsibleState.None, 'search'),
                    new Context7TreeItem('error handling', vscode.TreeItemCollapsibleState.None, 'search'),
                    new Context7TreeItem('deployment guide', vscode.TreeItemCollapsibleState.None, 'search'),
                    new Context7TreeItem('best practices', vscode.TreeItemCollapsibleState.None, 'search'),
                    new Context7TreeItem('performance optimization', vscode.TreeItemCollapsibleState.None, 'search'),
                    new Context7TreeItem('testing strategies', vscode.TreeItemCollapsibleState.None, 'search')
                ]);

            // Framework sub-items
            case 'OpenAI Agents SDK':
                return Promise.resolve([
                    new Context7TreeItem('Basic setup', vscode.TreeItemCollapsibleState.None, 'search'),
                    new Context7TreeItem('Agent configuration', vscode.TreeItemCollapsibleState.None, 'search'),
                    new Context7TreeItem('Multi-agent systems', vscode.TreeItemCollapsibleState.None, 'search'),
                    new Context7TreeItem('Function calling', vscode.TreeItemCollapsibleState.None, 'search'),
                    new Context7TreeItem('Streaming responses', vscode.TreeItemCollapsibleState.None, 'search')
                ]);

            case 'ElizaOS':
                return Promise.resolve([
                    new Context7TreeItem('Character creation', vscode.TreeItemCollapsibleState.None, 'search'),
                    new Context7TreeItem('Provider configuration', vscode.TreeItemCollapsibleState.None, 'search'),
                    new Context7TreeItem('Action handlers', vscode.TreeItemCollapsibleState.None, 'search'),
                    new Context7TreeItem('Memory management', vscode.TreeItemCollapsibleState.None, 'search'),
                    new Context7TreeItem('Plugin development', vscode.TreeItemCollapsibleState.None, 'search')
                ]);

            case 'LangGraph':
                return Promise.resolve([
                    new Context7TreeItem('State graphs', vscode.TreeItemCollapsibleState.None, 'search'),
                    new Context7TreeItem('Node definitions', vscode.TreeItemCollapsibleState.None, 'search'),
                    new Context7TreeItem('Conditional edges', vscode.TreeItemCollapsibleState.None, 'search'),
                    new Context7TreeItem('Checkpointing', vscode.TreeItemCollapsibleState.None, 'search'),
                    new Context7TreeItem('Human-in-the-loop', vscode.TreeItemCollapsibleState.None, 'search')
                ]);

            case 'CrewAI':
                return Promise.resolve([
                    new Context7TreeItem('Agent roles', vscode.TreeItemCollapsibleState.None, 'search'),
                    new Context7TreeItem('Task definition', vscode.TreeItemCollapsibleState.None, 'search'),
                    new Context7TreeItem('Crew coordination', vscode.TreeItemCollapsibleState.None, 'search'),
                    new Context7TreeItem('Tool integration', vscode.TreeItemCollapsibleState.None, 'search'),
                    new Context7TreeItem('Process flows', vscode.TreeItemCollapsibleState.None, 'search')
                ]);

            case 'AutoGen':
                return Promise.resolve([
                    new Context7TreeItem('Conversable agents', vscode.TreeItemCollapsibleState.None, 'search'),
                    new Context7TreeItem('Group chat', vscode.TreeItemCollapsibleState.None, 'search'),
                    new Context7TreeItem('Code execution', vscode.TreeItemCollapsibleState.None, 'search'),
                    new Context7TreeItem('Human input modes', vscode.TreeItemCollapsibleState.None, 'search'),
                    new Context7TreeItem('Agent orchestration', vscode.TreeItemCollapsibleState.None, 'search')
                ]);

            case 'SmolAgents':
                return Promise.resolve([
                    new Context7TreeItem('Agent initialization', vscode.TreeItemCollapsibleState.None, 'search'),
                    new Context7TreeItem('Tool integration', vscode.TreeItemCollapsibleState.None, 'search'),
                    new Context7TreeItem('Code generation', vscode.TreeItemCollapsibleState.None, 'search'),
                    new Context7TreeItem('Step-by-step execution', vscode.TreeItemCollapsibleState.None, 'search'),
                    new Context7TreeItem('Custom tools', vscode.TreeItemCollapsibleState.None, 'search')
                ]);

            case 'Google ADK':
                return Promise.resolve([
                    new Context7TreeItem('Project setup', vscode.TreeItemCollapsibleState.None, 'search'),
                    new Context7TreeItem('Agent deployment', vscode.TreeItemCollapsibleState.None, 'search'),
                    new Context7TreeItem('Cloud integration', vscode.TreeItemCollapsibleState.None, 'search'),
                    new Context7TreeItem('Enterprise features', vscode.TreeItemCollapsibleState.None, 'search'),
                    new Context7TreeItem('Monitoring', vscode.TreeItemCollapsibleState.None, 'search')
                ]);

            case 'Semantic Kernel':
                return Promise.resolve([
                    new Context7TreeItem('Kernel setup', vscode.TreeItemCollapsibleState.None, 'search'),
                    new Context7TreeItem('Plugin development', vscode.TreeItemCollapsibleState.None, 'search'),
                    new Context7TreeItem('Prompt templating', vscode.TreeItemCollapsibleState.None, 'search'),
                    new Context7TreeItem('Memory stores', vscode.TreeItemCollapsibleState.None, 'search'),
                    new Context7TreeItem('AI services', vscode.TreeItemCollapsibleState.None, 'search')
                ]);

            case 'Pydantic AI':
                return Promise.resolve([
                    new Context7TreeItem('Type-safe agents', vscode.TreeItemCollapsibleState.None, 'search'),
                    new Context7TreeItem('Model validation', vscode.TreeItemCollapsibleState.None, 'search'),
                    new Context7TreeItem('Agent configuration', vscode.TreeItemCollapsibleState.None, 'search'),
                    new Context7TreeItem('Result handling', vscode.TreeItemCollapsibleState.None, 'search'),
                    new Context7TreeItem('Testing patterns', vscode.TreeItemCollapsibleState.None, 'search')
                ]);

            case 'LangChain':
                return Promise.resolve([
                    new Context7TreeItem('Chain composition', vscode.TreeItemCollapsibleState.None, 'search'),
                    new Context7TreeItem('Agent types', vscode.TreeItemCollapsibleState.None, 'search'),
                    new Context7TreeItem('Tool usage', vscode.TreeItemCollapsibleState.None, 'search'),
                    new Context7TreeItem('Memory integration', vscode.TreeItemCollapsibleState.None, 'search'),
                    new Context7TreeItem('Vector stores', vscode.TreeItemCollapsibleState.None, 'search')
                ]);

            default:
                return Promise.resolve([]);
        }
    }

    getParent(element: Context7TreeItem): vscode.ProviderResult<Context7TreeItem> {
        // Implement parent relationship if needed for navigation
        return undefined;
    }
}