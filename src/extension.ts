import * as vscode from 'vscode';
import { FrameworkManager } from './framework/frameworkManager';
import { Context7Provider } from './context7/context7Provider';
import { AgentProjectManager } from './project/agentProjectManager';
import { AgentMonitor } from './monitoring/agentMonitor';
import { AgentDashboard } from './dashboard/agentDashboard';
import { TemplateManager } from './templates/templateManager';
import { SnippetProvider } from './snippets/snippetProvider';
import { PerformanceMonitor } from './utils/performanceMonitor';
import { ConfigurationManager } from './utils/configurationManager';
import { KeyboardShortcuts } from './utils/keyboardShortcuts';

// Global performance monitor
let performanceMonitor: PerformanceMonitor;

// Lazy-loaded managers
let managers: {
    frameworkManager?: FrameworkManager;
    context7Provider?: Context7Provider;
    projectManager?: AgentProjectManager;
    agentMonitor?: AgentMonitor;
    agentDashboard?: AgentDashboard;
    templateManager?: TemplateManager;
    snippetProvider?: SnippetProvider;
    configurationManager?: ConfigurationManager;
    keyboardShortcuts?: KeyboardShortcuts;
} = {};

export function activate(context: vscode.ExtensionContext) {
    const activationStart = Date.now();
    console.log('🚀 AI Agent Studio extension activating...');

    // Initialize performance monitoring first
    performanceMonitor = new PerformanceMonitor(context);
    performanceMonitor.startTracking();

    // Initialize configuration manager
    managers.configurationManager = new ConfigurationManager(context);

    // Initialize keyboard shortcuts
    managers.keyboardShortcuts = new KeyboardShortcuts(context);

    // Register all command handlers with lazy loading
    registerCommands(context);

    // Initialize workspace watchers
    initializeWorkspaceWatchers(context);
    
    // Show welcome message on first activation
    showWelcomeMessage(context);

    // Register activation event
    context.subscriptions.push(
        vscode.window.onDidChangeActiveTextEditor(() => {
            performanceMonitor.trackEvent('editor.changed');
        })
    );

    // Track activation time
    const activationTime = Date.now() - activationStart;
    performanceMonitor.trackMetric('activation.time', activationTime);
    
    console.log(`✅ AI Agent Studio extension activated in ${activationTime}ms`);

    // Preload critical managers in background
    setTimeout(() => {
        preloadCriticalManagers(context);
    }, 100);
}

function preloadCriticalManagers(context: vscode.ExtensionContext) {
    try {
        // Preload framework manager as it's used most frequently
        getFrameworkManager(context);
        
        // Preload project manager
        getProjectManager(context);
        
        console.log('📦 Critical managers preloaded successfully');
    } catch (error) {
        console.error('⚠️ Error preloading managers:', error);
    }
}

// Lazy loading functions for managers
function getFrameworkManager(context: vscode.ExtensionContext): FrameworkManager {
    if (!managers.frameworkManager) {
        const start = Date.now();
        managers.frameworkManager = new FrameworkManager(context);
        performanceMonitor.trackMetric('manager.framework.load', Date.now() - start);
    }
    return managers.frameworkManager;
}

function getContext7Provider(context: vscode.ExtensionContext): Context7Provider {
    if (!managers.context7Provider) {
        const start = Date.now();
        managers.context7Provider = new Context7Provider(context);
        performanceMonitor.trackMetric('manager.context7.load', Date.now() - start);
    }
    return managers.context7Provider;
}

function getProjectManager(context: vscode.ExtensionContext): AgentProjectManager {
    if (!managers.projectManager) {
        const start = Date.now();
        managers.projectManager = new AgentProjectManager(context);
        performanceMonitor.trackMetric('manager.project.load', Date.now() - start);
    }
    return managers.projectManager;
}

function getAgentMonitor(context: vscode.ExtensionContext): AgentMonitor {
    if (!managers.agentMonitor) {
        const start = Date.now();
        managers.agentMonitor = new AgentMonitor(context);
        performanceMonitor.trackMetric('manager.monitor.load', Date.now() - start);
    }
    return managers.agentMonitor;
}

function getAgentDashboard(context: vscode.ExtensionContext): AgentDashboard {
    if (!managers.agentDashboard) {
        const start = Date.now();
        managers.agentDashboard = new AgentDashboard(context);
        performanceMonitor.trackMetric('manager.dashboard.load', Date.now() - start);
    }
    return managers.agentDashboard;
}

function getTemplateManager(context: vscode.ExtensionContext): TemplateManager {
    if (!managers.templateManager) {
        const start = Date.now();
        managers.templateManager = new TemplateManager(context);
        performanceMonitor.trackMetric('manager.template.load', Date.now() - start);
    }
    return managers.templateManager;
}

function getSnippetProvider(context: vscode.ExtensionContext): SnippetProvider {
    if (!managers.snippetProvider) {
        const start = Date.now();
        managers.snippetProvider = new SnippetProvider(context);
        performanceMonitor.trackMetric('manager.snippet.load', Date.now() - start);
    }
    return managers.snippetProvider;
}

function registerCommands(context: vscode.ExtensionContext) {
    const commands = [
        vscode.commands.registerCommand('ai-agent-studio.createProject', async () => {
            await performanceMonitor.trackCommand('createProject', async () => {
                await getProjectManager(context).createProject();
            });
        }),
        
        vscode.commands.registerCommand('ai-agent-studio.openAgentDashboard', async () => {
            await performanceMonitor.trackCommand('openAgentDashboard', async () => {
                await getAgentDashboard(context).open();
            });
        }),
        
        vscode.commands.registerCommand('ai-agent-studio.generateAgent', async () => {
            await performanceMonitor.trackCommand('generateAgent', async () => {
                await getTemplateManager(context).generateAgent();
            });
        }),
        
        vscode.commands.registerCommand('ai-agent-studio.startAgentMonitoring', async () => {
            await performanceMonitor.trackCommand('startAgentMonitoring', async () => {
                await getAgentMonitor(context).startMonitoring();
            });
        }),
        
        vscode.commands.registerCommand('ai-agent-studio.searchContext7', async () => {
            await performanceMonitor.trackCommand('searchContext7', async () => {
                await getContext7Provider(context).searchDocumentation();
            });
        }),
        
        vscode.commands.registerCommand('ai-agent-studio.configureFramework', async () => {
            await performanceMonitor.trackCommand('configureFramework', async () => {
                await getFrameworkManager(context).configureFramework();
            });
        }),
        
        vscode.commands.registerCommand('ai-agent-studio.deployAgent', async () => {
            await performanceMonitor.trackCommand('deployAgent', async () => {
                await getProjectManager(context).deployAgent();
            });
        }),
        
        vscode.commands.registerCommand('ai-agent-studio.testAgent', async () => {
            await performanceMonitor.trackCommand('testAgent', async () => {
                await getAgentMonitor(context).testAgent();
            });
        }),
        
        vscode.commands.registerCommand('ai-agent-studio.openFrameworkDocs', async () => {
            await performanceMonitor.trackCommand('openFrameworkDocs', async () => {
                await getContext7Provider(context).openFrameworkDocs();
            });
        }),
        
        vscode.commands.registerCommand('ai-agent-studio.agentFlowVisualizer', async () => {
            await performanceMonitor.trackCommand('agentFlowVisualizer', async () => {
                await getAgentDashboard(context).visualizeFlow();
            });
        }),

        // Enhanced utility commands
        vscode.commands.registerCommand('ai-agent-studio.refreshViews', async () => {
            await performanceMonitor.trackCommand('refreshViews', async () => {
                // Only refresh if managers are loaded
                if (managers.projectManager) managers.projectManager.getTreeDataProvider().refresh();
                if (managers.frameworkManager) managers.frameworkManager.getTreeDataProvider().refresh();
                if (managers.agentMonitor) managers.agentMonitor.getTreeDataProvider().refresh();
                if (managers.context7Provider) managers.context7Provider.getTreeDataProvider().refresh();
            });
        }),

        vscode.commands.registerCommand('ai-agent-studio.refreshFrameworkStatus', async () => {
            await performanceMonitor.trackCommand('refreshFrameworkStatus', async () => {
                await getFrameworkManager(context).refreshFrameworkStatus();
            });
        }),

        vscode.commands.registerCommand('ai-agent-studio.installFramework', async (framework) => {
            await performanceMonitor.trackCommand('installFramework', async () => {
                const frameworkManager = getFrameworkManager(context);
                if (framework) {
                    await frameworkManager.installFramework(framework);
                } else {
                    await frameworkManager.installFramework();
                }
            });
        }),

        vscode.commands.registerCommand('ai-agent-studio.uninstallFramework', async (framework) => {
            await performanceMonitor.trackCommand('uninstallFramework', async () => {
                if (framework) {
                    await getFrameworkManager(context).uninstallFramework(framework);
                }
            });
        }),

        vscode.commands.registerCommand('ai-agent-studio.showFrameworkDetails', async (framework) => {
            await performanceMonitor.trackCommand('showFrameworkDetails', async () => {
                if (framework) {
                    await showFrameworkDetails(framework);
                }
            });
        }),

        vscode.commands.registerCommand('ai-agent-studio.clearContext7History', async () => {
            await performanceMonitor.trackCommand('clearContext7History', async () => {
                getContext7Provider(context).clearSearchHistory();
                vscode.window.showInformationMessage('Context7 search history cleared');
            });
        }),

        // New enhanced commands
        vscode.commands.registerCommand('ai-agent-studio.openSettings', async () => {
            await vscode.commands.executeCommand('workbench.action.openSettings', 'aiAgentStudio');
        }),

        vscode.commands.registerCommand('ai-agent-studio.showPerformanceMetrics', async () => {
            await performanceMonitor.showMetrics();
        }),

        vscode.commands.registerCommand('ai-agent-studio.exportConfiguration', async () => {
            await managers.configurationManager?.exportConfiguration();
        }),

        vscode.commands.registerCommand('ai-agent-studio.importConfiguration', async () => {
            await managers.configurationManager?.importConfiguration();
        }),

        vscode.commands.registerCommand('ai-agent-studio.resetExtension', async () => {
            const result = await vscode.window.showWarningMessage(
                'Are you sure you want to reset all AI Agent Studio settings?',
                'Yes', 'No'
            );
            if (result === 'Yes') {
                await managers.configurationManager?.resetToDefaults();
                vscode.window.showInformationMessage('Settings reset. Please reload the window.');
            }
        }),

        // Agent-specific enhanced commands
        vscode.commands.registerCommand('ai-agent-studio.stopAgent', async (agent) => {
            await performanceMonitor.trackCommand('stopAgent', async () => {
                if (agent && managers.agentMonitor) {
                    await managers.agentMonitor.stopAgent(agent);
                    vscode.window.showInformationMessage(`Agent ${agent.name} stopped`);
                }
            });
        }),

        vscode.commands.registerCommand('ai-agent-studio.restartAgent', async (agent) => {
            await performanceMonitor.trackCommand('restartAgent', async () => {
                if (agent && managers.agentMonitor) {
                    await managers.agentMonitor.restartAgent(agent);
                    vscode.window.showInformationMessage(`Agent ${agent.name} restarted`);
                }
            });
        }),

        vscode.commands.registerCommand('ai-agent-studio.viewAgentLogs', async (agent) => {
            await performanceMonitor.trackCommand('viewAgentLogs', async () => {
                if (agent && managers.agentMonitor) {
                    await managers.agentMonitor.viewAgentLogs(agent);
                }
            });
        }),

        vscode.commands.registerCommand('ai-agent-studio.cloneAgent', async (agent) => {
            await performanceMonitor.trackCommand('cloneAgent', async () => {
                if (agent && managers.projectManager) {
                    await managers.projectManager.cloneAgent(agent);
                }
            });
        })
    ];

    commands.forEach(command => {
        context.subscriptions.push(command);
    });

    // Register providers only when needed
    registerProviders(context);
}

function registerProviders(context: vscode.ExtensionContext) {
    // Register tree data providers lazily
    const registerTreeProvider = (viewId: string, getProvider: () => any) => {
        let provider: any = null;
        context.subscriptions.push(
            vscode.window.registerTreeDataProvider(viewId, {
                getTreeItem: (element: any) => {
                    if (!provider) provider = getProvider();
                    return provider.getTreeItem(element);
                },
                getChildren: (element?: any) => {
                    if (!provider) provider = getProvider();
                    return provider.getChildren(element);
                },
                onDidChangeTreeData: undefined
            })
        );
    };

    registerTreeProvider('agentProjects', () => getProjectManager(context).getTreeDataProvider());
    registerTreeProvider('frameworkStatus', () => getFrameworkManager(context).getTreeDataProvider());
    registerTreeProvider('agentMonitoring', () => getAgentMonitor(context).getTreeDataProvider());
    registerTreeProvider('context7Explorer', () => getContext7Provider(context).getTreeDataProvider());

    // Register completion provider
    const completionProvider = vscode.languages.registerCompletionItemProvider(
        ['typescript', 'javascript', 'python'],
        {
            provideCompletionItems: (document, position, token, context) => {
                return getSnippetProvider(context).provideCompletionItems(document, position, token, context);
            }
        },
        '.'
    );
    context.subscriptions.push(completionProvider);

    // Register hover provider
    const hoverProvider = vscode.languages.registerHoverProvider(
        ['typescript', 'javascript', 'python'],
        {
            provideHover: (document, position, token) => {
                return getContext7Provider(context).getHoverProvider().provideHover(document, position, token);
            }
        }
    );
    context.subscriptions.push(hoverProvider);
}

function initializeWorkspaceWatchers(context: vscode.ExtensionContext) {
    // Optimized file watchers with debouncing
    const debounceMap = new Map<string, NodeJS.Timeout>();

    const createDebouncedWatcher = (pattern: string, callback: (uri: vscode.Uri) => void, delay: number = 500) => {
        const watcher = vscode.workspace.createFileSystemWatcher(pattern);
        
        const debouncedCallback = (uri: vscode.Uri) => {
            const key = uri.fsPath;
            if (debounceMap.has(key)) {
                clearTimeout(debounceMap.get(key)!);
            }
            debounceMap.set(key, setTimeout(() => {
                callback(uri);
                debounceMap.delete(key);
            }, delay));
        };

        watcher.onDidCreate(debouncedCallback);
        watcher.onDidChange(debouncedCallback);
        watcher.onDidDelete(debouncedCallback);
        
        return watcher;
    };

    // Watch for agent config files
    const configWatcher = createDebouncedWatcher('**/*.{agent.json,crew.json,eliza.json}', (uri) => {
        performanceMonitor.trackEvent('config.changed');
        vscode.window.showInformationMessage(`Agent config updated: ${uri.fsPath}`);
        vscode.commands.executeCommand('ai-agent-studio.refreshViews');
    });
    
    context.subscriptions.push(configWatcher);
    
    // Watch for framework changes
    const frameworkWatcher = createDebouncedWatcher('**/package.json', () => {
        performanceMonitor.trackEvent('framework.changed');
        vscode.commands.executeCommand('ai-agent-studio.refreshFrameworkStatus');
    });
    
    context.subscriptions.push(frameworkWatcher);
}

function showWelcomeMessage(context: vscode.ExtensionContext) {
    const hasShownWelcome = context.globalState.get('hasShownWelcome', false);
    
    if (!hasShownWelcome) {
        vscode.window.showInformationMessage(
            'Welcome to AI Agent Studio! 🤖 Get started with AI agent development.',
            'Create Project',
            'Open Dashboard',
            'View Shortcuts',
            'Learn More'
        ).then(selection => {
            performanceMonitor.trackEvent('welcome.action', { action: selection });
            
            switch (selection) {
                case 'Create Project':
                    vscode.commands.executeCommand('ai-agent-studio.createProject');
                    break;
                case 'Open Dashboard':
                    vscode.commands.executeCommand('ai-agent-studio.openAgentDashboard');
                    break;
                case 'View Shortcuts':
                    managers.keyboardShortcuts?.showShortcuts();
                    break;
                case 'Learn More':
                    vscode.env.openExternal(vscode.Uri.parse('https://github.com/ai-agent-studio/vscode-extension'));
                    break;
            }
        });
        
        context.globalState.update('hasShownWelcome', true);
    }
}

async function showFrameworkDetails(framework: any) {
    const panel = vscode.window.createWebviewPanel(
        'frameworkDetails',
        `Framework: ${framework.displayName}`,
        vscode.ViewColumn.Beside,
        { 
            enableScripts: true,
            retainContextWhenHidden: true
        }
    );

    panel.webview.html = `
        <!DOCTYPE html>
        <html>
        <head>
            <meta charset="UTF-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <title>${framework.displayName} Details</title>
            <style>
                body { 
                    font-family: var(--vscode-font-family); 
                    padding: 20px; 
                    background-color: var(--vscode-editor-background);
                    color: var(--vscode-editor-foreground);
                    line-height: 1.6;
                }
                .header { 
                    border-bottom: 1px solid var(--vscode-panel-border); 
                    padding-bottom: 15px; 
                    margin-bottom: 20px;
                    display: flex;
                    justify-content: space-between;
                    align-items: center;
                }
                .section { 
                    margin: 20px 0; 
                    padding: 15px; 
                    border: 1px solid var(--vscode-panel-border); 
                    border-radius: 8px;
                    background-color: var(--vscode-editor-background);
                }
                .badge { 
                    display: inline-block;
                    background: var(--vscode-badge-background); 
                    color: var(--vscode-badge-foreground); 
                    padding: 4px 12px; 
                    border-radius: 12px; 
                    font-size: 0.85em; 
                    margin: 3px;
                    font-weight: 500;
                }
                .status-installed { 
                    background: var(--vscode-testing-iconPassed); 
                    color: white; 
                }
                .status-not-installed { 
                    background: var(--vscode-testing-iconFailed); 
                    color: white; 
                }
                .actions {
                    display: flex;
                    gap: 10px;
                    margin-top: 15px;
                }
                .btn {
                    padding: 8px 16px;
                    border: none;
                    border-radius: 4px;
                    cursor: pointer;
                    font-size: 14px;
                    background: var(--vscode-button-background);
                    color: var(--vscode-button-foreground);
                }
                .btn:hover {
                    background: var(--vscode-button-hoverBackground);
                }
                .feature-grid {
                    display: grid;
                    grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
                    gap: 15px;
                    margin: 15px 0;
                }
                .feature-item {
                    padding: 12px;
                    background: var(--vscode-input-background);
                    border-radius: 6px;
                    border: 1px solid var(--vscode-input-border);
                }
                .feature-item h4 {
                    margin: 0 0 8px 0;
                    color: var(--vscode-textLink-foreground);
                }
                .feature-item p {
                    margin: 0;
                    font-size: 0.9em;
                    opacity: 0.8;
                }
                a {
                    color: var(--vscode-textLink-foreground);
                    text-decoration: none;
                }
                a:hover {
                    text-decoration: underline;
                }
            </style>
        </head>
        <body>
            <div class="header">
                <div>
                    <h1>${framework.displayName}</h1>
                    <p>${framework.description}</p>
                </div>
                <div>
                    <span class="badge ${framework.installed ? 'status-installed' : 'status-not-installed'}">
                        ${framework.installed ? `✅ v${framework.version || 'unknown'}` : '❌ Not installed'}
                    </span>
                </div>
            </div>

            <div class="section">
                <h3>🌐 Languages & Technologies</h3>
                <div>
                    ${framework.languages.map((lang: string) => `<span class="badge">${lang}</span>`).join('')}
                </div>
            </div>

            <div class="section">
                <h3>📦 Dependencies</h3>
                <div>
                    ${framework.dependencies.map((dep: string) => `<span class="badge">${dep}</span>`).join('')}
                </div>
            </div>

            <div class="section">
                <h3>🔗 Resources</h3>
                <div class="feature-grid">
                    <div class="feature-item">
                        <h4>📚 Documentation</h4>
                        <p><a href="${framework.documentationUrl}" target="_blank">View Official Docs</a></p>
                    </div>
                    <div class="feature-item">
                        <h4>📁 Template Path</h4>
                        <p><code>${framework.templatePath}</code></p>
                    </div>
                    <div class="feature-item">
                        <h4>⚙️ Configuration</h4>
                        <p>Schema-based configuration support</p>
                    </div>
                </div>
            </div>

            <div class="section">
                <h3>🚀 Quick Actions</h3>
                <div class="actions">
                    ${!framework.installed ? 
                        '<button class="btn" onclick="installFramework()">📦 Install Framework</button>' : 
                        '<button class="btn" onclick="createProject()">➕ Create Project</button>'
                    }
                    <button class="btn" onclick="openDocs()">📖 View Documentation</button>
                    <button class="btn" onclick="viewExamples()">💡 View Examples</button>
                </div>
            </div>

            <script>
                function installFramework() {
                    vscode.postMessage({
                        command: 'installFramework',
                        framework: '${framework.id}'
                    });
                }

                function createProject() {
                    vscode.postMessage({
                        command: 'createProject',
                        framework: '${framework.id}'
                    });
                }

                function openDocs() {
                    vscode.postMessage({
                        command: 'openDocs',
                        url: '${framework.documentationUrl}'
                    });
                }

                function viewExamples() {
                    vscode.postMessage({
                        command: 'viewExamples',
                        framework: '${framework.id}'
                    });
                }
            </script>
        </body>
        </html>
    `;

    // Handle webview messages
    panel.webview.onDidReceiveMessage(
        async message => {
            switch (message.command) {
                case 'installFramework':
                    await vscode.commands.executeCommand('ai-agent-studio.installFramework', message.framework);
                    break;
                case 'createProject':
                    await vscode.commands.executeCommand('ai-agent-studio.createProject');
                    break;
                case 'openDocs':
                    await vscode.env.openExternal(vscode.Uri.parse(message.url));
                    break;
                case 'viewExamples':
                    // Implementation for viewing examples
                    break;
            }
        },
        undefined,
        context.subscriptions
    );
}

export function deactivate() {
    console.log('🔄 AI Agent Studio extension deactivating...');
    
    // Clean up performance monitor
    if (performanceMonitor) {
        performanceMonitor.dispose();
    }
    
    // Clean up managers
    Object.values(managers).forEach(manager => {
        if (manager && typeof manager.dispose === 'function') {
            manager.dispose();
        }
    });
    
    managers = {};
    
    console.log('✅ AI Agent Studio extension deactivated');
}