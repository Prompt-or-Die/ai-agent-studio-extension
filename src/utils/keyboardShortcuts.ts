import * as vscode from 'vscode';

export interface KeyboardShortcut {
    command: string;
    key: string;
    when?: string;
    description: string;
    category: string;
}

export class KeyboardShortcuts {
    private shortcuts: KeyboardShortcut[] = [];
    private outputChannel: vscode.OutputChannel;

    constructor(private context: vscode.ExtensionContext) {
        this.outputChannel = vscode.window.createOutputChannel('AI Agent Studio - Shortcuts');
        this.initializeShortcuts();
        this.registerShortcuts();
        
        context.subscriptions.push(this.outputChannel);
    }

    private initializeShortcuts(): void {
        this.shortcuts = [
            // Project Management
            {
                command: 'ai-agent-studio.createProject',
                key: 'ctrl+shift+a p',
                description: 'Create New Agent Project',
                category: 'Project Management'
            },
            {
                command: 'ai-agent-studio.openAgentDashboard',
                key: 'ctrl+shift+a d',
                description: 'Open Agent Dashboard',
                category: 'Project Management'
            },
            {
                command: 'ai-agent-studio.refreshViews',
                key: 'ctrl+shift+a r',
                description: 'Refresh All Views',
                category: 'Project Management'
            },

            // Agent Development
            {
                command: 'ai-agent-studio.generateAgent',
                key: 'ctrl+shift+a g',
                description: 'Generate Agent Code',
                category: 'Agent Development'
            },
            {
                command: 'ai-agent-studio.testAgent',
                key: 'ctrl+shift+a t',
                description: 'Test Agent',
                category: 'Agent Development'
            },
            {
                command: 'ai-agent-studio.deployAgent',
                key: 'ctrl+shift+a y',
                description: 'Deploy Agent',
                category: 'Agent Development'
            },

            // Framework Management
            {
                command: 'ai-agent-studio.configureFramework',
                key: 'ctrl+shift+a f',
                description: 'Configure Framework',
                category: 'Framework Management'
            },
            {
                command: 'ai-agent-studio.installFramework',
                key: 'ctrl+shift+a i',
                description: 'Install Framework',
                category: 'Framework Management'
            },
            {
                command: 'ai-agent-studio.openFrameworkDocs',
                key: 'ctrl+shift+a o',
                description: 'Open Framework Documentation',
                category: 'Framework Management'
            },

            // Monitoring & Debugging
            {
                command: 'ai-agent-studio.startAgentMonitoring',
                key: 'ctrl+shift+a m',
                description: 'Start Agent Monitoring',
                category: 'Monitoring & Debugging'
            },
            {
                command: 'ai-agent-studio.agentFlowVisualizer',
                key: 'ctrl+shift+a v',
                description: 'Visualize Agent Flow',
                category: 'Monitoring & Debugging'
            },
            {
                command: 'ai-agent-studio.showPerformanceMetrics',
                key: 'ctrl+shift+a shift+p',
                description: 'Show Performance Metrics',
                category: 'Monitoring & Debugging'
            },

            // Context7 & Documentation
            {
                command: 'ai-agent-studio.searchContext7',
                key: 'ctrl+shift+a s',
                description: 'Search Context7 Documentation',
                category: 'Documentation'
            },
            {
                command: 'ai-agent-studio.clearContext7History',
                key: 'ctrl+shift+a shift+c',
                description: 'Clear Context7 History',
                category: 'Documentation'
            },

            // Configuration
            {
                command: 'ai-agent-studio.openSettings',
                key: 'ctrl+shift+a ,',
                description: 'Open Extension Settings',
                category: 'Configuration'
            },
            {
                command: 'ai-agent-studio.exportConfiguration',
                key: 'ctrl+shift+a e',
                description: 'Export Configuration',
                category: 'Configuration'
            },
            {
                command: 'ai-agent-studio.importConfiguration',
                key: 'ctrl+shift+a shift+i',
                description: 'Import Configuration',
                category: 'Configuration'
            },

            // Quick Access
            {
                command: 'ai-agent-studio.showShortcuts',
                key: 'ctrl+shift+a ?',
                description: 'Show Keyboard Shortcuts',
                category: 'Quick Access'
            },
            {
                command: 'ai-agent-studio.quickCommand',
                key: 'ctrl+shift+a space',
                description: 'Quick Command Palette',
                category: 'Quick Access'
            }
        ];
    }

    private registerShortcuts(): void {
        // Register quick command palette
        const quickCommandDisposable = vscode.commands.registerCommand('ai-agent-studio.quickCommand', () => {
            this.showQuickCommandPalette();
        });
        
        // Register show shortcuts command
        const showShortcutsDisposable = vscode.commands.registerCommand('ai-agent-studio.showShortcuts', () => {
            this.showShortcuts();
        });

        this.context.subscriptions.push(quickCommandDisposable, showShortcutsDisposable);
        
        this.outputChannel.appendLine(`🔑 Registered ${this.shortcuts.length} keyboard shortcuts`);
    }

    private async showQuickCommandPalette(): Promise<void> {
        const commandItems = this.shortcuts.map(shortcut => ({
            label: `$(${this.getCategoryIcon(shortcut.category)}) ${shortcut.description}`,
            description: shortcut.key,
            detail: shortcut.category,
            command: shortcut.command
        }));

        const selected = await vscode.window.showQuickPick(commandItems, {
            placeHolder: 'Select a command to execute',
            matchOnDescription: true,
            matchOnDetail: true
        });

        if (selected) {
            await vscode.commands.executeCommand(selected.command);
        }
    }

    async showShortcuts(): Promise<void> {
        const panel = vscode.window.createWebviewPanel(
            'keyboardShortcuts',
            '⌨️ Keyboard Shortcuts',
            vscode.ViewColumn.One,
            {
                enableScripts: true,
                retainContextWhenHidden: true
            }
        );

        panel.webview.html = this.generateShortcutsHTML();
        
        // Handle webview messages
        panel.webview.onDidReceiveMessage(
            async message => {
                switch (message.command) {
                    case 'executeCommand':
                        await vscode.commands.executeCommand(message.commandId);
                        break;
                    case 'copyShortcut':
                        await vscode.env.clipboard.writeText(message.shortcut);
                        vscode.window.showInformationMessage('Shortcut copied to clipboard');
                        break;
                    case 'customizeShortcut':
                        await this.customizeShortcut(message.commandId);
                        break;
                }
            },
            undefined,
            this.context.subscriptions
        );
    }

    private generateShortcutsHTML(): string {
        const categorizedShortcuts = this.groupShortcutsByCategory();
        
        return `
            <!DOCTYPE html>
            <html>
            <head>
                <meta charset="UTF-8">
                <meta name="viewport" content="width=device-width, initial-scale=1.0">
                <title>Keyboard Shortcuts</title>
                <style>
                    body {
                        font-family: var(--vscode-font-family);
                        padding: 20px;
                        background-color: var(--vscode-editor-background);
                        color: var(--vscode-editor-foreground);
                        line-height: 1.6;
                    }
                    .header {
                        display: flex;
                        justify-content: space-between;
                        align-items: center;
                        margin-bottom: 30px;
                        padding-bottom: 15px;
                        border-bottom: 1px solid var(--vscode-panel-border);
                    }
                    .search-container {
                        margin-bottom: 20px;
                    }
                    .search-input {
                        width: 100%;
                        padding: 10px;
                        border: 1px solid var(--vscode-input-border);
                        border-radius: 4px;
                        background: var(--vscode-input-background);
                        color: var(--vscode-input-foreground);
                        font-family: var(--vscode-font-family);
                        font-size: 14px;
                    }
                    .category-section {
                        margin-bottom: 30px;
                    }
                    .category-header {
                        display: flex;
                        align-items: center;
                        margin-bottom: 15px;
                        padding: 10px;
                        background: var(--vscode-input-background);
                        border-radius: 6px;
                        cursor: pointer;
                        user-select: none;
                    }
                    .category-header:hover {
                        background: var(--vscode-list-hoverBackground);
                    }
                    .category-icon {
                        margin-right: 10px;
                        font-size: 16px;
                    }
                    .category-title {
                        font-size: 18px;
                        font-weight: 600;
                        color: var(--vscode-textLink-foreground);
                    }
                    .category-count {
                        margin-left: auto;
                        font-size: 12px;
                        opacity: 0.7;
                        background: var(--vscode-badge-background);
                        color: var(--vscode-badge-foreground);
                        padding: 2px 8px;
                        border-radius: 10px;
                    }
                    .shortcuts-list {
                        display: none;
                        animation: fadeIn 0.3s ease-in-out;
                    }
                    .shortcuts-list.expanded {
                        display: block;
                    }
                    .shortcut-item {
                        display: flex;
                        align-items: center;
                        padding: 12px;
                        margin-bottom: 8px;
                        background: var(--vscode-editor-background);
                        border: 1px solid var(--vscode-panel-border);
                        border-radius: 6px;
                        transition: all 0.2s ease;
                    }
                    .shortcut-item:hover {
                        background: var(--vscode-list-hoverBackground);
                        border-color: var(--vscode-focusBorder);
                    }
                    .shortcut-description {
                        flex: 1;
                        font-weight: 500;
                    }
                    .shortcut-key {
                        font-family: var(--vscode-editor-font-family);
                        font-size: 12px;
                        background: var(--vscode-keybindingLabel-background);
                        color: var(--vscode-keybindingLabel-foreground);
                        border: 1px solid var(--vscode-keybindingLabel-border);
                        padding: 4px 8px;
                        border-radius: 4px;
                        margin-right: 10px;
                        white-space: nowrap;
                    }
                    .shortcut-actions {
                        display: flex;
                        gap: 8px;
                    }
                    .btn {
                        padding: 4px 8px;
                        border: none;
                        border-radius: 3px;
                        cursor: pointer;
                        font-size: 12px;
                        background: var(--vscode-button-background);
                        color: var(--vscode-button-foreground);
                        transition: background 0.2s;
                    }
                    .btn:hover {
                        background: var(--vscode-button-hoverBackground);
                    }
                    .btn-secondary {
                        background: var(--vscode-button-secondaryBackground);
                        color: var(--vscode-button-secondaryForeground);
                    }
                    .btn-secondary:hover {
                        background: var(--vscode-button-secondaryHoverBackground);
                    }
                    .stats {
                        display: flex;
                        gap: 20px;
                        margin-top: 20px;
                        padding: 15px;
                        background: var(--vscode-input-background);
                        border-radius: 6px;
                        font-size: 14px;
                    }
                    .stat-item {
                        display: flex;
                        align-items: center;
                        gap: 8px;
                    }
                    .hidden {
                        display: none !important;
                    }
                    @keyframes fadeIn {
                        from { opacity: 0; transform: translateY(-10px); }
                        to { opacity: 1; transform: translateY(0); }
                    }
                </style>
            </head>
            <body>
                <div class="header">
                    <h1>⌨️ Keyboard Shortcuts</h1>
                    <div>
                        <button class="btn" onclick="exportShortcuts()">📤 Export</button>
                        <button class="btn btn-secondary" onclick="resetShortcuts()">🔄 Reset</button>
                    </div>
                </div>

                <div class="search-container">
                    <input type="text" class="search-input" placeholder="Search shortcuts..." onkeyup="searchShortcuts(this.value)">
                </div>

                ${Object.entries(categorizedShortcuts).map(([category, shortcuts]) => `
                    <div class="category-section" data-category="${category}">
                        <div class="category-header" onclick="toggleCategory('${category}')">
                            <span class="category-icon">${this.getCategoryIcon(category)}</span>
                            <span class="category-title">${category}</span>
                            <span class="category-count">${shortcuts.length}</span>
                        </div>
                        <div class="shortcuts-list" id="shortcuts-${category.replace(/\s/g, '')}">
                            ${shortcuts.map(shortcut => `
                                <div class="shortcut-item" data-command="${shortcut.command}" data-description="${shortcut.description.toLowerCase()}">
                                    <div class="shortcut-description">${shortcut.description}</div>
                                    <div class="shortcut-key">${shortcut.key}</div>
                                    <div class="shortcut-actions">
                                        <button class="btn" onclick="executeCommand('${shortcut.command}')" title="Execute Command">▶️</button>
                                        <button class="btn btn-secondary" onclick="copyShortcut('${shortcut.key}')" title="Copy Shortcut">📋</button>
                                        <button class="btn btn-secondary" onclick="customizeShortcut('${shortcut.command}')" title="Customize">⚙️</button>
                                    </div>
                                </div>
                            `).join('')}
                        </div>
                    </div>
                `).join('')}

                <div class="stats">
                    <div class="stat-item">
                        <span>📊</span>
                        <span>Total Shortcuts: ${this.shortcuts.length}</span>
                    </div>
                    <div class="stat-item">
                        <span>📁</span>
                        <span>Categories: ${Object.keys(categorizedShortcuts).length}</span>
                    </div>
                    <div class="stat-item">
                        <span>⌨️</span>
                        <span>Most Used: Ctrl+Shift+A</span>
                    </div>
                </div>

                <script>
                    const vscode = acquireVsCodeApi();
                    let expandedCategories = new Set();

                    function toggleCategory(category) {
                        const listId = 'shortcuts-' + category.replace(/\\s/g, '');
                        const list = document.getElementById(listId);
                        
                        if (expandedCategories.has(category)) {
                            list.classList.remove('expanded');
                            expandedCategories.delete(category);
                        } else {
                            list.classList.add('expanded');
                            expandedCategories.add(category);
                        }
                    }

                    function searchShortcuts(query) {
                        const searchTerm = query.toLowerCase();
                        const shortcutItems = document.querySelectorAll('.shortcut-item');
                        const categories = document.querySelectorAll('.category-section');

                        shortcutItems.forEach(item => {
                            const description = item.getAttribute('data-description');
                            const command = item.getAttribute('data-command').toLowerCase();
                            
                            if (description.includes(searchTerm) || command.includes(searchTerm)) {
                                item.classList.remove('hidden');
                            } else {
                                item.classList.add('hidden');
                            }
                        });

                        // Show/hide categories based on visible shortcuts
                        categories.forEach(category => {
                            const visibleShortcuts = category.querySelectorAll('.shortcut-item:not(.hidden)');
                            if (visibleShortcuts.length > 0) {
                                category.classList.remove('hidden');
                                // Auto-expand categories with search results
                                const categoryName = category.getAttribute('data-category');
                                if (searchTerm && !expandedCategories.has(categoryName)) {
                                    toggleCategory(categoryName);
                                }
                            } else {
                                category.classList.add('hidden');
                            }
                        });
                    }

                    function executeCommand(command) {
                        vscode.postMessage({
                            command: 'executeCommand',
                            commandId: command
                        });
                    }

                    function copyShortcut(shortcut) {
                        vscode.postMessage({
                            command: 'copyShortcut',
                            shortcut: shortcut
                        });
                    }

                    function customizeShortcut(command) {
                        vscode.postMessage({
                            command: 'customizeShortcut',
                            commandId: command
                        });
                    }

                    function exportShortcuts() {
                        vscode.postMessage({
                            command: 'exportShortcuts'
                        });
                    }

                    function resetShortcuts() {
                        if (confirm('Reset all shortcuts to defaults?')) {
                            vscode.postMessage({
                                command: 'resetShortcuts'
                            });
                        }
                    }

                    // Initialize with first category expanded
                    document.addEventListener('DOMContentLoaded', function() {
                        const firstCategory = document.querySelector('.category-section');
                        if (firstCategory) {
                            const categoryName = firstCategory.getAttribute('data-category');
                            toggleCategory(categoryName);
                        }
                    });
                </script>
            </body>
            </html>
        `;
    }

    private groupShortcutsByCategory(): { [category: string]: KeyboardShortcut[] } {
        const grouped: { [category: string]: KeyboardShortcut[] } = {};
        
        this.shortcuts.forEach(shortcut => {
            if (!grouped[shortcut.category]) {
                grouped[shortcut.category] = [];
            }
            grouped[shortcut.category].push(shortcut);
        });

        return grouped;
    }

    private getCategoryIcon(category: string): string {
        const icons: { [key: string]: string } = {
            'Project Management': '📁',
            'Agent Development': '🤖',
            'Framework Management': '📦',
            'Monitoring & Debugging': '🔍',
            'Documentation': '📚',
            'Configuration': '⚙️',
            'Quick Access': '⚡'
        };

        return icons[category] || '📋';
    }

    private async customizeShortcut(commandId: string): Promise<void> {
        const shortcut = this.shortcuts.find(s => s.command === commandId);
        if (!shortcut) {
            vscode.window.showErrorMessage('Shortcut not found');
            return;
        }

        const newKey = await vscode.window.showInputBox({
            prompt: `Enter new keyboard shortcut for: ${shortcut.description}`,
            value: shortcut.key,
            validateInput: (value) => {
                if (!value || value.trim().length === 0) {
                    return 'Please enter a valid keyboard shortcut';
                }
                return null;
            }
        });

        if (newKey && newKey !== shortcut.key) {
            try {
                // Update the shortcut
                shortcut.key = newKey;
                
                // Note: In a real implementation, you would update the keybindings.json file
                // For now, we'll just show a message
                vscode.window.showInformationMessage(
                    `Shortcut updated to: ${newKey}. Please update your keybindings.json manually.`
                );
                
                this.outputChannel.appendLine(`✅ Shortcut updated: ${commandId} -> ${newKey}`);
            } catch (error) {
                vscode.window.showErrorMessage(`Failed to update shortcut: ${error}`);
            }
        }
    }

    getShortcuts(): KeyboardShortcut[] {
        return [...this.shortcuts];
    }

    getShortcutByCommand(command: string): KeyboardShortcut | undefined {
        return this.shortcuts.find(s => s.command === command);
    }

    getShortcutsByCategory(category: string): KeyboardShortcut[] {
        return this.shortcuts.filter(s => s.category === category);
    }

    async exportShortcuts(): Promise<void> {
        const exportData = {
            version: '1.0.0',
            timestamp: new Date().toISOString(),
            shortcuts: this.shortcuts,
            keybindings: this.shortcuts.map(s => ({
                key: s.key,
                command: s.command,
                when: s.when
            }))
        };

        const saveOptions: vscode.SaveDialogOptions = {
            defaultUri: vscode.Uri.file('ai-agent-studio-shortcuts.json'),
            filters: {
                'JSON Files': ['json']
            }
        };

        const uri = await vscode.window.showSaveDialog(saveOptions);
        if (uri) {
            await vscode.workspace.fs.writeFile(uri, Buffer.from(JSON.stringify(exportData, null, 2)));
            vscode.window.showInformationMessage(`Shortcuts exported to ${uri.fsPath}`);
        }
    }

    dispose(): void {
        this.outputChannel.dispose();
    }
}