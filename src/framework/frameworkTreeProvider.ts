import * as vscode from 'vscode';
import { FrameworkManager, Framework } from './frameworkManager';

export class FrameworkTreeItem extends vscode.TreeItem {
    constructor(
        public readonly framework: Framework,
        public readonly collapsibleState: vscode.TreeItemCollapsibleState,
        public readonly contextValue: string
    ) {
        super(framework.displayName, collapsibleState);
        
        this.description = framework.installed ? 
            `v${framework.version || 'unknown'}` : 
            'Not installed';
        
        this.iconPath = framework.installed ? 
            new vscode.ThemeIcon('check', new vscode.ThemeColor('testing.iconPassed')) :
            new vscode.ThemeIcon('circle-slash', new vscode.ThemeColor('testing.iconFailed'));
        
        this.tooltip = `${framework.displayName}\n${framework.description}\nLanguages: ${framework.languages.join(', ')}`;
        
        this.command = {
            command: 'ai-agent-studio.showFrameworkDetails',
            title: 'Show Framework Details',
            arguments: [framework]
        };
    }
}

export class FrameworkDetailItem extends vscode.TreeItem {
    constructor(
        public readonly label: string,
        public readonly value: string,
        public readonly framework: Framework
    ) {
        super(label, vscode.TreeItemCollapsibleState.None);
        this.description = value;
        this.contextValue = 'frameworkDetail';
        this.iconPath = new vscode.ThemeIcon('info');
    }
}

export class FrameworkActionItem extends vscode.TreeItem {
    constructor(
        public readonly label: string,
        public readonly action: string,
        public readonly framework: Framework
    ) {
        super(label, vscode.TreeItemCollapsibleState.None);
        this.contextValue = 'frameworkAction';
        this.iconPath = new vscode.ThemeIcon(this.getIconForAction(action));
        
        this.command = {
            command: this.getCommandForAction(action),
            title: label,
            arguments: [framework]
        };
    }
    
    private getIconForAction(action: string): string {
        switch (action) {
            case 'install': return 'cloud-download';
            case 'uninstall': return 'trash';
            case 'configure': return 'gear';
            case 'docs': return 'book';
            case 'template': return 'file-add';
            default: return 'info';
        }
    }
    
    private getCommandForAction(action: string): string {
        switch (action) {
            case 'install': return 'ai-agent-studio.installFramework';
            case 'uninstall': return 'ai-agent-studio.uninstallFramework';
            case 'configure': return 'ai-agent-studio.configureFramework';
            case 'docs': return 'ai-agent-studio.openFrameworkDocs';
            case 'template': return 'ai-agent-studio.createFromTemplate';
            default: return 'ai-agent-studio.showFrameworkDetails';
        }
    }
}
export class FrameworkTreeProvider implements vscode.TreeDataProvider<FrameworkTreeItem | FrameworkDetailItem | FrameworkActionItem> {
    private _onDidChangeTreeData: vscode.EventEmitter<FrameworkTreeItem | FrameworkDetailItem | FrameworkActionItem | undefined | null | void> = 
        new vscode.EventEmitter<FrameworkTreeItem | FrameworkDetailItem | FrameworkActionItem | undefined | null | void>();
    readonly onDidChangeTreeData: vscode.Event<FrameworkTreeItem | FrameworkDetailItem | FrameworkActionItem | undefined | null | void> = 
        this._onDidChangeTreeData.event;

    constructor(private frameworkManager: FrameworkManager) {}

    refresh(): void {
        this._onDidChangeTreeData.fire();
    }

    getTreeItem(element: FrameworkTreeItem | FrameworkDetailItem | FrameworkActionItem): vscode.TreeItem {
        return element;
    }

    getChildren(element?: FrameworkTreeItem | FrameworkDetailItem | FrameworkActionItem): 
        Thenable<(FrameworkTreeItem | FrameworkDetailItem | FrameworkActionItem)[]> {
        
        if (!element) {
            // Root level - show all frameworks
            const frameworks = this.frameworkManager.getFrameworks();
            const items = frameworks.map(framework => 
                new FrameworkTreeItem(
                    framework, 
                    vscode.TreeItemCollapsibleState.Collapsed,
                    framework.installed ? 'installedFramework' : 'availableFramework'
                )
            );
            return Promise.resolve(items);
        }

        if (element instanceof FrameworkTreeItem) {
            // Framework selected - show details and actions
            const details: (FrameworkDetailItem | FrameworkActionItem)[] = [];
            
            // Add framework details
            details.push(new FrameworkDetailItem('Description', element.framework.description, element.framework));
            details.push(new FrameworkDetailItem('Languages', element.framework.languages.join(', '), element.framework));
            details.push(new FrameworkDetailItem('Dependencies', element.framework.dependencies.join(', '), element.framework));
            
            if (element.framework.installed && element.framework.version) {
                details.push(new FrameworkDetailItem('Version', element.framework.version, element.framework));
            }
            
            // Add actions based on installation status
            if (element.framework.installed) {
                details.push(new FrameworkActionItem('Configure', 'configure', element.framework));
                details.push(new FrameworkActionItem('Create Template', 'template', element.framework));
                details.push(new FrameworkActionItem('View Documentation', 'docs', element.framework));
                details.push(new FrameworkActionItem('Uninstall', 'uninstall', element.framework));
            } else {
                details.push(new FrameworkActionItem('Install', 'install', element.framework));
                details.push(new FrameworkActionItem('View Documentation', 'docs', element.framework));
            }
            
            return Promise.resolve(details);
        }

        return Promise.resolve([]);
    }

    getParent(element: FrameworkTreeItem | FrameworkDetailItem | FrameworkActionItem): 
        vscode.ProviderResult<FrameworkTreeItem | FrameworkDetailItem | FrameworkActionItem> {
        
        if (element instanceof FrameworkDetailItem || element instanceof FrameworkActionItem) {
            // Find the parent framework tree item
            const frameworks = this.frameworkManager.getFrameworks();
            const framework = frameworks.find(f => f.id === element.framework.id);
            if (framework) {
                return new FrameworkTreeItem(
                    framework,
                    vscode.TreeItemCollapsibleState.Collapsed,
                    framework.installed ? 'installedFramework' : 'availableFramework'
                );
            }
        }
        
        return undefined;
    }
}