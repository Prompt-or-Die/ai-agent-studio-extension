import * as vscode from 'vscode';
import axios, { AxiosResponse, AxiosError } from 'axios';
import { Context7TreeProvider } from './context7TreeProvider';

export interface Context7Response {
    content: string;
    source: string;
    language: string;
    title: string;
    description: string;
}

export interface Context7Library {
    id: string;
    name: string;
    description: string;
    codeSnippets: number;
    trustScore: number;
    versions?: string[];
}

export interface Context7SearchResult {
    libraries: Context7Library[];
    selectedLibrary?: Context7Library;
}

export class Context7Provider {
    private treeProvider: Context7TreeProvider;
    private mcpEndpoint = 'https://mcp.context7.com/mcp';
    private outputChannel: vscode.OutputChannel;
    private cache: Map<string, Context7Response[]> = new Map();
    private cacheTimeout = 5 * 60 * 1000; // 5 minutes
    private searchHistory: string[] = [];
    private maxHistorySize = 20;

    constructor(private context: vscode.ExtensionContext) {
        this.treeProvider = new Context7TreeProvider(this);
        this.outputChannel = vscode.window.createOutputChannel('AI Agent Studio - Context7');
        this.loadSearchHistory();
    }

    async searchDocumentation(query?: string): Promise<void> {
        const searchQuery = query || await this.getSearchQuery();
        
        if (!searchQuery) {
            return;
        }

        try {
            this.outputChannel.appendLine(`🔍 Searching Context7 for: "${searchQuery}"`);
            
            // Add to search history
            this.addToSearchHistory(searchQuery);

            // Check cache first
            const cachedResults = this.getCachedResults(searchQuery);
            if (cachedResults) {
                this.outputChannel.appendLine('📋 Using cached results');
                await this.showDocumentationResults(cachedResults, searchQuery);
                return;
            }

            // Show progress
            await vscode.window.withProgress({
                location: vscode.ProgressLocation.Notification,
                title: 'Searching Context7 Documentation',
                cancellable: true
            }, async (progress, token) => {
                progress.report({ increment: 0, message: 'Resolving library...' });

                // Step 1: Resolve library ID
                const libraryId = await this.resolveLibraryId(searchQuery);
                if (!libraryId) {
                    throw new Error(`No library found for "${searchQuery}"`);
                }

                progress.report({ increment: 40, message: 'Fetching documentation...' });

                // Step 2: Get documentation
                const docs = await this.getLibraryDocs(libraryId, searchQuery);
                if (docs.length === 0) {
                    throw new Error(`No documentation found for "${searchQuery}"`);
                }

                progress.report({ increment: 80, message: 'Processing results...' });

                // Cache results
                this.cacheResults(searchQuery, docs);

                progress.report({ increment: 100, message: 'Complete!' });

                // Step 3: Show results
                await this.showDocumentationResults(docs, searchQuery);
            });

        } catch (error) {
            this.handleSearchError(error, searchQuery);
        }
    }

    private async getSearchQuery(): Promise<string | undefined> {
        // Get current selection or word under cursor
        const editor = vscode.window.activeTextEditor;
        let defaultQuery = '';

        if (editor) {
            const selection = editor.selection;
            if (!selection.isEmpty) {
                defaultQuery = editor.document.getText(selection);
            } else {
                // Get word under cursor
                const wordRange = editor.document.getWordRangeAtPosition(selection.active);
                if (wordRange) {
                    defaultQuery = editor.document.getText(wordRange);
                }
            }
        }

        return await vscode.window.showInputBox({
            prompt: 'Enter search query for Context7 documentation',
            placeHolder: 'e.g., "OpenAI Agents SDK", "ElizaOS configuration"',
            value: defaultQuery,
            validateInput: (value) => {
                if (!value || value.trim().length === 0) {
                    return 'Search query is required';
                }
                if (value.length > 200) {
                    return 'Search query is too long (max 200 characters)';
                }
                return undefined;
            }
        });
    }

    private async resolveLibraryId(libraryName: string): Promise<string | null> {
        try {
            const response: AxiosResponse = await axios.post(this.mcpEndpoint, {
                method: 'resolve-library-id',
                params: {
                    libraryName: libraryName
                }
            }, {
                timeout: 10000,
                headers: {
                    'Content-Type': 'application/json'
                }
            });

            if (response.data && response.data.results && response.data.results.length > 0) {
                const library = response.data.results[0];
                this.outputChannel.appendLine(`✅ Found library: ${library.name} (${library.id})`);
                return library.id;
            }

            this.outputChannel.appendLine(`❌ No library found for: ${libraryName}`);
            return null;

        } catch (error) {
            this.outputChannel.appendLine(`❌ Failed to resolve library ID: ${this.getErrorMessage(error)}`);
            
            // Try alternative search strategies
            return await this.tryAlternativeSearch(libraryName);
        }
    }

    private async tryAlternativeSearch(libraryName: string): Promise<string | null> {
        this.outputChannel.appendLine(`🔄 Trying alternative search strategies for: ${libraryName}`);

        // Strategy 1: Search with common variations
        const variations = [
            libraryName.toLowerCase(),
            libraryName.replace(/\s+/g, '-'),
            libraryName.replace(/\s+/g, '_'),
            libraryName.replace(/[-_]/g, ' '),
            ...this.getFrameworkAliases(libraryName)
        ];

        for (const variation of variations) {
            if (variation !== libraryName) {
                this.outputChannel.appendLine(`  Trying variation: ${variation}`);
                const result = await this.resolveLibraryIdDirect(variation);
                if (result) {
                    return result;
                }
            }
        }

        // Strategy 2: Search for partial matches
        return await this.searchPartialMatches(libraryName);
    }

    private async resolveLibraryIdDirect(libraryName: string): Promise<string | null> {
        try {
            const response = await axios.post(this.mcpEndpoint, {
                method: 'resolve-library-id',
                params: { libraryName }
            }, { timeout: 5000 });

            return response.data?.results?.[0]?.id || null;
        } catch {
            return null;
        }
    }

    private getFrameworkAliases(libraryName: string): string[] {
        const aliasMap: { [key: string]: string[] } = {
            'openai': ['openai-agents-sdk', '@openai/agents-sdk', 'openai agents'],
            'eliza': ['elizaos', 'eliza-os', '@elizaos/core'],
            'crew': ['crewai', 'crew-ai', 'crew ai'],
            'autogen': ['pyautogen', 'microsoft autogen', 'ms autogen'],
            'langchain': ['lang-chain', '@langchain/core'],
            'langgraph': ['lang-graph', '@langchain/langgraph'],
            'smol': ['smolagents', 'smol-agents', 'smol agents']
        };

        const lowerName = libraryName.toLowerCase();
        for (const [key, aliases] of Object.entries(aliasMap)) {
            if (lowerName.includes(key)) {
                return aliases;
            }
        }

        return [];
    }

    private async searchPartialMatches(libraryName: string): Promise<string | null> {
        // This would implement fuzzy matching logic
        // For now, return null to indicate no match found
        this.outputChannel.appendLine(`❌ No partial matches found for: ${libraryName}`);
        return null;
    }

    private async getLibraryDocs(libraryId: string, topic?: string): Promise<Context7Response[]> {
        try {
            const response: AxiosResponse = await axios.post(this.mcpEndpoint, {
                method: 'get-library-docs',
                params: {
                    context7CompatibleLibraryID: libraryId,
                    topic: topic,
                    tokens: 10000
                }
            }, {
                timeout: 15000,
                headers: {
                    'Content-Type': 'application/json'
                }
            });

            if (response.data && response.data.results) {
                this.outputChannel.appendLine(`✅ Retrieved ${response.data.results.length} documentation items`);
                return response.data.results;
            }

            this.outputChannel.appendLine('❌ No documentation results returned');
            return [];

        } catch (error) {
            this.outputChannel.appendLine(`❌ Failed to get library docs: ${this.getErrorMessage(error)}`);
            throw error;
        }
    }

    private async showDocumentationResults(docs: Context7Response[], query: string): Promise<void> {
        if (docs.length === 0) {
            vscode.window.showWarningMessage(`No documentation found for "${query}"`);
            return;
        }

        // Create webview panel
        const panel = vscode.window.createWebviewPanel(
            'context7Results',
            `Context7: ${query}`,
            vscode.ViewColumn.Beside,
            {
                enableScripts: true,
                retainContextWhenHidden: true,
                localResourceRoots: [this.context.extensionUri]
            }
        );

        // Generate and set HTML content
        panel.webview.html = this.generateDocumentationHTML(docs, query);

        // Handle messages from webview
        panel.webview.onDidReceiveMessage(
            message => this.handleWebviewMessage(message, docs),
            undefined,
            this.context.subscriptions
        );

        // Show notification
        vscode.window.showInformationMessage(
            `Found ${docs.length} documentation item(s) for "${query}"`,
            'Copy Link', 'Save Results'
        ).then(action => {
            switch (action) {
                case 'Copy Link':
                    this.copyDocumentationLink(query, docs);
                    break;
                case 'Save Results':
                    this.saveDocumentationResults(query, docs);
                    break;
            }
        });
    }

    private async handleWebviewMessage(message: any, docs: Context7Response[]): Promise<void> {
        switch (message.command) {
            case 'copyCode':
                await vscode.env.clipboard.writeText(message.code);
                vscode.window.showInformationMessage('Code copied to clipboard');
                break;
            case 'insertCode':
                await this.insertCodeAtCursor(message.code);
                break;
            case 'openLink':
                await vscode.env.openExternal(vscode.Uri.parse(message.url));
                break;
            case 'searchRelated':
                await this.searchDocumentation(message.query);
                break;
        }
    }

    private async insertCodeAtCursor(code: string): Promise<void> {
        const editor = vscode.window.activeTextEditor;
        if (!editor) {
            vscode.window.showWarningMessage('No active editor found');
            return;
        }

        const selection = editor.selection;
        await editor.edit(editBuilder => {
            editBuilder.replace(selection, code);
        });

        vscode.window.showInformationMessage('Code inserted at cursor');
    }

    private async copyDocumentationLink(query: string, docs: Context7Response[]): Promise<void> {
        const link = `https://context7.com/search?q=${encodeURIComponent(query)}`;
        await vscode.env.clipboard.writeText(link);
        vscode.window.showInformationMessage('Documentation link copied to clipboard');
    }

    private async saveDocumentationResults(query: string, docs: Context7Response[]): Promise<void> {
        const workspaceFolders = vscode.workspace.workspaceFolders;
        if (!workspaceFolders) {
            vscode.window.showWarningMessage('No workspace folder open');
            return;
        }

        const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
        const filename = `context7-${query.replace(/[^a-zA-Z0-9]/g, '-')}-${timestamp}.md`;
        const filepath = vscode.Uri.joinPath(workspaceFolders[0].uri, 'docs', filename);

        // Create docs directory if it doesn't exist
        await vscode.workspace.fs.createDirectory(vscode.Uri.joinPath(workspaceFolders[0].uri, 'docs'));

        // Generate markdown content
        const markdown = this.generateMarkdownContent(query, docs);

        // Write file
        await vscode.workspace.fs.writeFile(filepath, Buffer.from(markdown, 'utf8'));

        // Open file
        const document = await vscode.workspace.openTextDocument(filepath);
        await vscode.window.showTextDocument(document);

        vscode.window.showInformationMessage(`Documentation saved to ${filename}`);
    }

    private generateMarkdownContent(query: string, docs: Context7Response[]): string {
        let markdown = `# Context7 Documentation: ${query}\n\n`;
        markdown += `Generated on: ${new Date().toLocaleString()}\n`;
        markdown += `Total items: ${docs.length}\n\n`;

        docs.forEach((doc, index) => {
            markdown += `## ${index + 1}. ${doc.title}\n\n`;
            markdown += `**Description:** ${doc.description}\n\n`;
            markdown += `**Source:** ${doc.source}\n\n`;
            markdown += `**Language:** ${doc.language}\n\n`;
            markdown += `\`\`\`${doc.language}\n${doc.content}\n\`\`\`\n\n`;
            markdown += '---\n\n';
        });

        return markdown;
    }

    private generateDocumentationHTML(docs: Context7Response[], query: string): string {
        const docItems = docs.map((doc, index) => `
            <div class="doc-item" data-index="${index}">
                <div class="doc-header">
                    <h3>${this.escapeHtml(doc.title)}</h3>
                    <div class="doc-actions">
                        <button onclick="copyCode(${index})" title="Copy code">📋</button>
                        <button onclick="insertCode(${index})" title="Insert at cursor">📝</button>
                        <button onclick="openSource('${this.escapeHtml(doc.source)}')" title="Open source">🔗</button>
                    </div>
                </div>
                <p class="description">${this.escapeHtml(doc.description)}</p>
                <div class="source">Source: <a href="${this.escapeHtml(doc.source)}" onclick="openSource('${this.escapeHtml(doc.source)}')">${this.escapeHtml(doc.source)}</a></div>
                <div class="code-container">
                    <div class="code-header">
                        <span class="language">${doc.language}</span>
                        <button onclick="copyCode(${index})" class="copy-btn">Copy</button>
                    </div>
                    <pre><code class="language-${doc.language}" data-code="${this.escapeHtml(doc.content)}">${this.escapeHtml(doc.content)}</code></pre>
                </div>
            </div>
        `).join('');

        return `
            <!DOCTYPE html>
            <html>
            <head>
                <meta charset="UTF-8">
                <meta http-equiv="Content-Security-Policy" content="default-src 'none'; style-src 'unsafe-inline'; script-src 'unsafe-inline';">
                <title>Context7 Documentation</title>
                <style>
                    body { 
                        font-family: var(--vscode-font-family); 
                        line-height: 1.6;
                        margin: 0;
                        padding: 20px;
                        background-color: var(--vscode-editor-background);
                        color: var(--vscode-editor-foreground);
                    }
                    .header {
                        border-bottom: 2px solid var(--vscode-panel-border);
                        padding-bottom: 20px;
                        margin-bottom: 30px;
                    }
                    .search-info {
                        background-color: var(--vscode-textBlockQuote-background);
                        padding: 15px;
                        border-radius: 5px;
                        margin-bottom: 20px;
                    }
                    .doc-item { 
                        margin: 30px 0; 
                        padding: 20px; 
                        border: 1px solid var(--vscode-panel-border); 
                        border-radius: 8px;
                        background-color: var(--vscode-textBlockQuote-background);
                    }
                    .doc-header {
                        display: flex;
                        justify-content: space-between;
                        align-items: flex-start;
                        margin-bottom: 15px;
                    }
                    .doc-actions {
                        display: flex;
                        gap: 5px;
                    }
                    .doc-actions button {
                        background-color: var(--vscode-button-background);
                        color: var(--vscode-button-foreground);
                        border: none;
                        padding: 5px 8px;
                        border-radius: 3px;
                        cursor: pointer;
                        font-size: 12px;
                    }
                    .doc-actions button:hover {
                        background-color: var(--vscode-button-hoverBackground);
                    }
                    h1 { 
                        color: var(--vscode-textLink-foreground); 
                        margin-bottom: 10px;
                    }
                    h3 { 
                        color: var(--vscode-textLink-foreground); 
                        margin: 0 0 10px 0;
                    }
                    .description { 
                        color: var(--vscode-descriptionForeground); 
                        font-style: italic;
                        margin-bottom: 10px;
                    }
                    .source { 
                        font-size: 0.9em; 
                        color: var(--vscode-textLink-foreground); 
                        margin-bottom: 15px;
                    }
                    .source a {
                        color: var(--vscode-textLink-foreground);
                        text-decoration: none;
                    }
                    .source a:hover {
                        text-decoration: underline;
                    }
                    .code-container {
                        background-color: var(--vscode-editor-background);
                        border: 1px solid var(--vscode-panel-border);
                        border-radius: 5px;
                        overflow: hidden;
                    }
                    .code-header {
                        display: flex;
                        justify-content: space-between;
                        align-items: center;
                        padding: 8px 12px;
                        background-color: var(--vscode-tab-activeBackground);
                        border-bottom: 1px solid var(--vscode-panel-border);
                    }
                    .language {
                        font-size: 0.85em;
                        color: var(--vscode-descriptionForeground);
                        font-weight: bold;
                    }
                    .copy-btn {
                        background-color: var(--vscode-button-background);
                        color: var(--vscode-button-foreground);
                        border: none;
                        padding: 4px 8px;
                        border-radius: 3px;
                        cursor: pointer;
                        font-size: 11px;
                    }
                    .copy-btn:hover {
                        background-color: var(--vscode-button-hoverBackground);
                    }
                    pre { 
                        margin: 0;
                        padding: 15px; 
                        overflow-x: auto;
                        background-color: var(--vscode-editor-background);
                    }
                    code {
                        font-family: var(--vscode-editor-font-family);
                        font-size: var(--vscode-editor-font-size);
                    }
                    .stats {
                        display: flex;
                        gap: 20px;
                        margin-top: 10px;
                        font-size: 0.9em;
                        color: var(--vscode-descriptionForeground);
                    }
                    .related-search {
                        margin-top: 30px;
                        padding: 15px;
                        background-color: var(--vscode-textBlockQuote-background);
                        border-radius: 5px;
                    }
                    .related-search button {
                        background-color: var(--vscode-button-background);
                        color: var(--vscode-button-foreground);
                        border: none;
                        padding: 5px 10px;
                        margin: 2px;
                        border-radius: 3px;
                        cursor: pointer;
                    }
                </style>
            </head>
            <body>
                <div class="header">
                    <h1>🔍 Context7 Documentation Results</h1>
                    <div class="search-info">
                        <strong>Query:</strong> "${this.escapeHtml(query)}"<br>
                        <strong>Results:</strong> ${docs.length} item(s)<br>
                        <strong>Timestamp:</strong> ${new Date().toLocaleString()}
                    </div>
                </div>
                
                ${docItems}
                
                <div class="related-search">
                    <h4>Related Searches:</h4>
                    <button onclick="searchRelated('${query} examples')">Examples</button>
                    <button onclick="searchRelated('${query} configuration')">Configuration</button>
                    <button onclick="searchRelated('${query} tutorial')">Tutorial</button>
                    <button onclick="searchRelated('${query} best practices')">Best Practices</button>
                </div>

                <script>
                    const vscode = acquireVsCodeApi();
                    const docs = ${JSON.stringify(docs)};
                    
                    function copyCode(index) {
                        const code = docs[index].content;
                        vscode.postMessage({
                            command: 'copyCode',
                            code: code
                        });
                    }
                    
                    function insertCode(index) {
                        const code = docs[index].content;
                        vscode.postMessage({
                            command: 'insertCode',
                            code: code
                        });
                    }
                    
                    function openSource(url) {
                        vscode.postMessage({
                            command: 'openLink',
                            url: url
                        });
                    }
                    
                    function searchRelated(query) {
                        vscode.postMessage({
                            command: 'searchRelated',
                            query: query
                        });
                    }
                </script>
            </body>
            </html>
        `;
    }

    private escapeHtml(text: string): string {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }

    private handleSearchError(error: any, query: string): void {
        const errorMessage = this.getErrorMessage(error);
        this.outputChannel.appendLine(`❌ Search failed for "${query}": ${errorMessage}`);
        
        // Show appropriate error message to user
        if (errorMessage.includes('network') || errorMessage.includes('timeout')) {
            vscode.window.showErrorMessage(
                'Context7 search failed due to network issues. Please check your connection and try again.',
                'Retry', 'Open Offline Docs'
            ).then(action => {
                if (action === 'Retry') {
                    this.searchDocumentation(query);
                } else if (action === 'Open Offline Docs') {
                    this.openOfflineDocumentation();
                }
            });
        } else if (errorMessage.includes('not found')) {
            vscode.window.showWarningMessage(
                `No documentation found for "${query}". Try a different search term.`,
                'Search Again', 'Browse Frameworks'
            ).then(action => {
                if (action === 'Search Again') {
                    this.searchDocumentation();
                } else if (action === 'Browse Frameworks') {
                    this.openFrameworkDocs();
                }
            });
        } else {
            vscode.window.showErrorMessage(`Context7 search failed: ${errorMessage}`);
        }
    }

    private getErrorMessage(error: any): string {
        if (error instanceof Error) {
            return error.message;
        } else if (typeof error === 'string') {
            return error;
        } else if (error.response) {
            return `HTTP ${error.response.status}: ${error.response.statusText}`;
        } else if (error.code) {
            return `${error.code}: ${error.message || 'Unknown error'}`;
        } else {
            return 'Unknown error occurred';
        }
    }

    async openFrameworkDocs(): Promise<void> {
        const frameworks = [
            { name: 'OpenAI Agents SDK', query: 'openai agents sdk' },
            { name: 'ElizaOS', query: 'elizaos' },
            { name: 'LangGraph', query: 'langgraph' },
            { name: 'CrewAI', query: 'crewai' },
            { name: 'AutoGen', query: 'autogen' },
            { name: 'SmolAgents', query: 'smolagents' },
            { name: 'Google ADK', query: 'google adk' },
            { name: 'Semantic Kernel', query: 'semantic kernel' },
            { name: 'Pydantic AI', query: 'pydantic ai' }
        ];

        const selected = await vscode.window.showQuickPick(frameworks, {
            placeHolder: 'Select a framework to view documentation'
        });

        if (selected) {
            await this.searchDocumentation(selected.query);
        }
    }

    private async openOfflineDocumentation(): Promise<void> {
        // Open local documentation or fallback resources
        const offlineOptions = [
            'View Extension README',
            'Open Local Templates',
            'Browse Snippets'
        ];

        const selected = await vscode.window.showQuickPick(offlineOptions, {
            placeHolder: 'Select offline documentation'
        });

        switch (selected) {
            case 'View Extension README':
                const readmePath = vscode.Uri.joinPath(this.context.extensionUri, 'README.md');
                const readmeDoc = await vscode.workspace.openTextDocument(readmePath);
                await vscode.window.showTextDocument(readmeDoc);
                break;
            case 'Open Local Templates':
                vscode.commands.executeCommand('ai-agent-studio.createProject');
                break;
            case 'Browse Snippets':
                vscode.commands.executeCommand('workbench.action.openSnippets');
                break;
        }
    }

    // Cache management
    private getCachedResults(query: string): Context7Response[] | null {
        const cacheKey = query.toLowerCase().trim();
        const cached = this.cache.get(cacheKey);
        
        if (cached) {
            this.outputChannel.appendLine(`📋 Cache hit for: ${query}`);
            return cached;
        }
        
        return null;
    }

    private cacheResults(query: string, results: Context7Response[]): void {
        const cacheKey = query.toLowerCase().trim();
        this.cache.set(cacheKey, results);
        
        // Set timeout to clear cache entry
        setTimeout(() => {
            this.cache.delete(cacheKey);
        }, this.cacheTimeout);
    }

    private clearCache(): void {
        this.cache.clear();
        this.outputChannel.appendLine('🗑️ Cache cleared');
    }

    // Search history management
    private addToSearchHistory(query: string): void {
        const normalizedQuery = query.trim();
        
        // Remove if already exists
        const index = this.searchHistory.indexOf(normalizedQuery);
        if (index > -1) {
            this.searchHistory.splice(index, 1);
        }
        
        // Add to beginning
        this.searchHistory.unshift(normalizedQuery);
        
        // Limit size
        if (this.searchHistory.length > this.maxHistorySize) {
            this.searchHistory = this.searchHistory.slice(0, this.maxHistorySize);
        }
        
        this.saveSearchHistory();
    }

    private loadSearchHistory(): void {
        try {
            const history = this.context.globalState.get<string[]>('context7.searchHistory', []);
            this.searchHistory = history;
        } catch (error) {
            console.error('Error loading search history:', error);
            this.searchHistory = [];
        }
    }

    private saveSearchHistory(): void {
        try {
            this.context.globalState.update('context7.searchHistory', this.searchHistory);
        } catch (error) {
            console.error('Error saving search history:', error);
        }
    }

    getSearchHistory(): string[] {
        return [...this.searchHistory];
    }

    clearSearchHistory(): void {
        this.searchHistory = [];
        this.saveSearchHistory();
        this.treeProvider.refresh();
    }

    // Public methods
    getTreeDataProvider(): Context7TreeProvider {
        return this.treeProvider;
    }

    getHoverProvider(): vscode.HoverProvider {
        return {
            provideHover: (document, position, token) => {
                const word = document.getWordRangeAtPosition(position);
                if (word) {
                    const wordText = document.getText(word);
                    
                    // Check if word is a known framework term
                    const frameworkTerms = {
                        'Agent': 'Base class for creating AI agents. Use Context7 to search for specific framework implementations.',
                        'startAgent': 'ElizaOS function to start an agent. Search "ElizaOS startAgent" for examples.',
                        'StateGraph': 'LangGraph state machine for agent workflows. Search "LangGraph StateGraph" for usage.',
                        'Crew': 'CrewAI class for multi-agent teams. Search "CrewAI Crew" for documentation.',
                        'ConversableAgent': 'AutoGen agent that can have conversations. Search "AutoGen ConversableAgent" for details.',
                        'CodeAgent': 'SmolAgents code-first agent. Search "SmolAgents CodeAgent" for examples.'
                    };
                    
                    if (frameworkTerms[wordText]) {
                        const hoverContent = new vscode.MarkdownString(frameworkTerms[wordText]);
                        hoverContent.appendMarkdown(`\n\n[Search Context7 for "${wordText}"](command:ai-agent-studio.searchContext7?${encodeURIComponent(JSON.stringify([wordText]))})`);
                        return new vscode.Hover(hoverContent);
                    }
                }
                return null;
            }
        };
    }

    dispose(): void {
        this.clearCache();
        this.outputChannel.dispose();
    }
}