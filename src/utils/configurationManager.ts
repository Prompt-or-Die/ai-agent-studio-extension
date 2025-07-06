import * as vscode from 'vscode';
import * as fs from 'fs';
import * as path from 'path';

export interface ConfigurationProfile {
    name: string;
    id: string;
    description: string;
    settings: any;
    timestamp: number;
}

export interface ExtensionSettings {
    defaultFramework: string;
    context7: {
        enabled: boolean;
        apiKey: string;
        autoSearch: boolean;
        cacheEnabled: boolean;
        maxCacheSize: number;
    };
    monitoring: {
        enabled: boolean;
        interval: number;
        maxLogs: number;
        autoStart: boolean;
    };
    performance: {
        trackingEnabled: boolean;
        memoryWarningThreshold: number;
        commandTimeoutMs: number;
    };
    ui: {
        showWelcomeMessage: boolean;
        autoRefreshViews: boolean;
        compactMode: boolean;
        theme: 'auto' | 'light' | 'dark';
    };
    advanced: {
        enableExperimental: boolean;
        debugMode: boolean;
        verboseLogging: boolean;
        maxConcurrentOperations: number;
    };
}

export class ConfigurationManager {
    private readonly SETTINGS_KEY = 'aiAgentStudio';
    private readonly PROFILES_KEY = 'aiAgentStudioProfiles';
    private readonly BACKUP_KEY = 'aiAgentStudioBackup';
    private outputChannel: vscode.OutputChannel;
    private profiles: ConfigurationProfile[] = [];
    private watchers: vscode.Disposable[] = [];
    private onConfigurationChanged: vscode.EventEmitter<void> = new vscode.EventEmitter<void>();

    constructor(private context: vscode.ExtensionContext) {
        this.outputChannel = vscode.window.createOutputChannel('AI Agent Studio - Configuration');
        
        // Load existing profiles
        this.loadProfiles();
        
        // Set up configuration watcher
        this.setupConfigurationWatcher();
        
        // Register configuration change event
        this.context.subscriptions.push(this.onConfigurationChanged);
        this.context.subscriptions.push(this.outputChannel);
    }

    private setupConfigurationWatcher(): void {
        const watcher = vscode.workspace.onDidChangeConfiguration(e => {
            if (e.affectsConfiguration(this.SETTINGS_KEY)) {
                this.onConfigurationChanged.fire();
                this.outputChannel.appendLine('⚙️ Configuration changed');
                
                // Auto-backup on configuration change
                if (this.getSettings().advanced.enableExperimental) {
                    this.createAutoBackup();
                }
            }
        });
        
        this.watchers.push(watcher);
        this.context.subscriptions.push(watcher);
    }

    getSettings(): ExtensionSettings {
        const config = vscode.workspace.getConfiguration(this.SETTINGS_KEY);
        
        return {
            defaultFramework: config.get('defaultFramework', 'openai-agents-sdk'),
            context7: {
                enabled: config.get('context7.enabled', true),
                apiKey: config.get('context7.apiKey', ''),
                autoSearch: config.get('context7.autoSearch', false),
                cacheEnabled: config.get('context7.cacheEnabled', true),
                maxCacheSize: config.get('context7.maxCacheSize', 100)
            },
            monitoring: {
                enabled: config.get('monitoring.enabled', true),
                interval: config.get('monitoring.interval', 5000),
                maxLogs: config.get('monitoring.maxLogs', 1000),
                autoStart: config.get('monitoring.autoStart', false)
            },
            performance: {
                trackingEnabled: config.get('performance.trackingEnabled', true),
                memoryWarningThreshold: config.get('performance.memoryWarningThreshold', 512),
                commandTimeoutMs: config.get('performance.commandTimeoutMs', 30000)
            },
            ui: {
                showWelcomeMessage: config.get('ui.showWelcomeMessage', true),
                autoRefreshViews: config.get('ui.autoRefreshViews', true),
                compactMode: config.get('ui.compactMode', false),
                theme: config.get('ui.theme', 'auto')
            },
            advanced: {
                enableExperimental: config.get('advanced.enableExperimental', false),
                debugMode: config.get('advanced.debugMode', false),
                verboseLogging: config.get('advanced.verboseLogging', false),
                maxConcurrentOperations: config.get('advanced.maxConcurrentOperations', 5)
            }
        };
    }

    async updateSetting(key: string, value: any, scope: vscode.ConfigurationTarget = vscode.ConfigurationTarget.Global): Promise<void> {
        try {
            const config = vscode.workspace.getConfiguration(this.SETTINGS_KEY);
            await config.update(key, value, scope);
            this.outputChannel.appendLine(`✅ Updated setting: ${key} = ${value}`);
        } catch (error) {
            this.outputChannel.appendLine(`❌ Error updating setting ${key}: ${error}`);
            throw error;
        }
    }

    async resetToDefaults(): Promise<void> {
        try {
            const config = vscode.workspace.getConfiguration(this.SETTINGS_KEY);
            const inspect = config.inspect('');
            
            if (inspect) {
                // Reset all settings to default
                const defaultSettings = {
                    defaultFramework: 'openai-agents-sdk',
                    'context7.enabled': true,
                    'context7.apiKey': '',
                    'context7.autoSearch': false,
                    'context7.cacheEnabled': true,
                    'context7.maxCacheSize': 100,
                    'monitoring.enabled': true,
                    'monitoring.interval': 5000,
                    'monitoring.maxLogs': 1000,
                    'monitoring.autoStart': false,
                    'performance.trackingEnabled': true,
                    'performance.memoryWarningThreshold': 512,
                    'performance.commandTimeoutMs': 30000,
                    'ui.showWelcomeMessage': true,
                    'ui.autoRefreshViews': true,
                    'ui.compactMode': false,
                    'ui.theme': 'auto',
                    'advanced.enableExperimental': false,
                    'advanced.debugMode': false,
                    'advanced.verboseLogging': false,
                    'advanced.maxConcurrentOperations': 5
                };

                for (const [key, value] of Object.entries(defaultSettings)) {
                    await config.update(key, value, vscode.ConfigurationTarget.Global);
                }
                
                this.outputChannel.appendLine('🔄 Settings reset to defaults');
            }
        } catch (error) {
            this.outputChannel.appendLine(`❌ Error resetting settings: ${error}`);
            throw error;
        }
    }

    async exportConfiguration(): Promise<void> {
        try {
            const settings = this.getSettings();
            const exportData = {
                version: '1.0.0',
                timestamp: new Date().toISOString(),
                settings: settings,
                profiles: this.profiles,
                metadata: {
                    extensionVersion: vscode.extensions.getExtension('ai-agent-studio.ai-agent-studio')?.packageJSON.version,
                    vscodeVersion: vscode.version
                }
            };

            const saveOptions: vscode.SaveDialogOptions = {
                defaultUri: vscode.Uri.file('ai-agent-studio-config.json'),
                filters: {
                    'JSON Files': ['json'],
                    'All Files': ['*']
                }
            };

            const uri = await vscode.window.showSaveDialog(saveOptions);
            if (uri) {
                await vscode.workspace.fs.writeFile(uri, Buffer.from(JSON.stringify(exportData, null, 2)));
                vscode.window.showInformationMessage(`Configuration exported to ${uri.fsPath}`);
                this.outputChannel.appendLine(`📤 Configuration exported to ${uri.fsPath}`);
            }
        } catch (error) {
            this.outputChannel.appendLine(`❌ Error exporting configuration: ${error}`);
            vscode.window.showErrorMessage(`Failed to export configuration: ${error}`);
        }
    }

    async importConfiguration(): Promise<void> {
        try {
            const openOptions: vscode.OpenDialogOptions = {
                canSelectMany: false,
                openLabel: 'Import Configuration',
                filters: {
                    'JSON Files': ['json'],
                    'All Files': ['*']
                }
            };

            const uris = await vscode.window.showOpenDialog(openOptions);
            if (uris && uris[0]) {
                const data = await vscode.workspace.fs.readFile(uris[0]);
                const importData = JSON.parse(data.toString());

                // Validate import data
                if (!importData.version || !importData.settings) {
                    throw new Error('Invalid configuration file format');
                }

                // Confirm import
                const choice = await vscode.window.showWarningMessage(
                    'This will overwrite your current configuration. Continue?',
                    'Yes', 'No'
                );

                if (choice === 'Yes') {
                    // Backup current settings first
                    await this.createBackup('Pre-import backup');

                    // Import settings
                    const config = vscode.workspace.getConfiguration(this.SETTINGS_KEY);
                    for (const [key, value] of Object.entries(importData.settings)) {
                        if (typeof value === 'object' && value !== null) {
                            for (const [subKey, subValue] of Object.entries(value)) {
                                await config.update(`${key}.${subKey}`, subValue, vscode.ConfigurationTarget.Global);
                            }
                        } else {
                            await config.update(key, value, vscode.ConfigurationTarget.Global);
                        }
                    }

                    // Import profiles if available
                    if (importData.profiles) {
                        this.profiles = importData.profiles;
                        this.saveProfiles();
                    }

                    vscode.window.showInformationMessage('Configuration imported successfully. Restart VS Code to apply all changes.');
                    this.outputChannel.appendLine(`📥 Configuration imported from ${uris[0].fsPath}`);
                }
            }
        } catch (error) {
            this.outputChannel.appendLine(`❌ Error importing configuration: ${error}`);
            vscode.window.showErrorMessage(`Failed to import configuration: ${error}`);
        }
    }

    async createProfile(name: string, description: string = ''): Promise<void> {
        try {
            const profile: ConfigurationProfile = {
                name,
                id: Date.now().toString(),
                description,
                settings: this.getSettings(),
                timestamp: Date.now()
            };

            this.profiles.push(profile);
            this.saveProfiles();
            
            vscode.window.showInformationMessage(`Profile "${name}" created successfully`);
            this.outputChannel.appendLine(`📁 Profile created: ${name}`);
        } catch (error) {
            this.outputChannel.appendLine(`❌ Error creating profile: ${error}`);
            throw error;
        }
    }

    async loadProfile(profileId: string): Promise<void> {
        try {
            const profile = this.profiles.find(p => p.id === profileId);
            if (!profile) {
                throw new Error(`Profile not found: ${profileId}`);
            }

            // Backup current settings
            await this.createBackup(`Pre-load ${profile.name}`);

            // Load profile settings
            const config = vscode.workspace.getConfiguration(this.SETTINGS_KEY);
            for (const [key, value] of Object.entries(profile.settings)) {
                if (typeof value === 'object' && value !== null) {
                    for (const [subKey, subValue] of Object.entries(value)) {
                        await config.update(`${key}.${subKey}`, subValue, vscode.ConfigurationTarget.Global);
                    }
                } else {
                    await config.update(key, value, vscode.ConfigurationTarget.Global);
                }
            }

            vscode.window.showInformationMessage(`Profile "${profile.name}" loaded successfully`);
            this.outputChannel.appendLine(`📂 Profile loaded: ${profile.name}`);
        } catch (error) {
            this.outputChannel.appendLine(`❌ Error loading profile: ${error}`);
            throw error;
        }
    }

    async deleteProfile(profileId: string): Promise<void> {
        try {
            const index = this.profiles.findIndex(p => p.id === profileId);
            if (index === -1) {
                throw new Error(`Profile not found: ${profileId}`);
            }

            const profile = this.profiles[index];
            this.profiles.splice(index, 1);
            this.saveProfiles();

            vscode.window.showInformationMessage(`Profile "${profile.name}" deleted successfully`);
            this.outputChannel.appendLine(`🗑️ Profile deleted: ${profile.name}`);
        } catch (error) {
            this.outputChannel.appendLine(`❌ Error deleting profile: ${error}`);
            throw error;
        }
    }

    getProfiles(): ConfigurationProfile[] {
        return [...this.profiles];
    }

    async showProfileManager(): Promise<void> {
        const panel = vscode.window.createWebviewPanel(
            'profileManager',
            '📁 Configuration Profiles',
            vscode.ViewColumn.One,
            {
                enableScripts: true,
                retainContextWhenHidden: true
            }
        );

        panel.webview.html = this.generateProfileManagerHTML();
        
        // Handle webview messages
        panel.webview.onDidReceiveMessage(
            async message => {
                switch (message.command) {
                    case 'createProfile':
                        await this.createProfile(message.name, message.description);
                        panel.webview.html = this.generateProfileManagerHTML();
                        break;
                    case 'loadProfile':
                        await this.loadProfile(message.profileId);
                        break;
                    case 'deleteProfile':
                        await this.deleteProfile(message.profileId);
                        panel.webview.html = this.generateProfileManagerHTML();
                        break;
                    case 'exportProfile':
                        await this.exportProfile(message.profileId);
                        break;
                }
            },
            undefined,
            this.context.subscriptions
        );
    }

    private async createBackup(description: string = 'Manual backup'): Promise<void> {
        const backup = {
            description,
            timestamp: Date.now(),
            settings: this.getSettings()
        };

        const backups = this.context.globalState.get<any[]>(this.BACKUP_KEY, []);
        backups.push(backup);
        
        // Keep only last 10 backups
        if (backups.length > 10) {
            backups.splice(0, backups.length - 10);
        }

        await this.context.globalState.update(this.BACKUP_KEY, backups);
        this.outputChannel.appendLine(`💾 Backup created: ${description}`);
    }

    private async createAutoBackup(): Promise<void> {
        const lastBackup = this.context.globalState.get<any>('lastAutoBackup', 0);
        const now = Date.now();
        
        // Create auto-backup only if last backup is older than 1 hour
        if (now - lastBackup > 3600000) {
            await this.createBackup('Auto-backup');
            await this.context.globalState.update('lastAutoBackup', now);
        }
    }

    private loadProfiles(): void {
        try {
            const storedProfiles = this.context.globalState.get<ConfigurationProfile[]>(this.PROFILES_KEY, []);
            this.profiles = storedProfiles;
            this.outputChannel.appendLine(`📂 Loaded ${this.profiles.length} configuration profiles`);
        } catch (error) {
            this.outputChannel.appendLine(`❌ Error loading profiles: ${error}`);
        }
    }

    private saveProfiles(): void {
        try {
            this.context.globalState.update(this.PROFILES_KEY, this.profiles);
            this.outputChannel.appendLine(`💾 Saved ${this.profiles.length} configuration profiles`);
        } catch (error) {
            this.outputChannel.appendLine(`❌ Error saving profiles: ${error}`);
        }
    }

    private generateProfileManagerHTML(): string {
        return `
            <!DOCTYPE html>
            <html>
            <head>
                <meta charset="UTF-8">
                <meta name="viewport" content="width=device-width, initial-scale=1.0">
                <title>Configuration Profiles</title>
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
                    .create-profile {
                        background: var(--vscode-input-background);
                        border: 1px solid var(--vscode-input-border);
                        border-radius: 8px;
                        padding: 20px;
                        margin-bottom: 20px;
                    }
                    .create-profile h3 {
                        margin: 0 0 15px 0;
                        color: var(--vscode-textLink-foreground);
                    }
                    .form-group {
                        margin: 10px 0;
                    }
                    .form-group label {
                        display: block;
                        margin-bottom: 5px;
                        font-weight: 500;
                    }
                    .form-group input, .form-group textarea {
                        width: 100%;
                        padding: 8px;
                        border: 1px solid var(--vscode-input-border);
                        border-radius: 4px;
                        background: var(--vscode-input-background);
                        color: var(--vscode-input-foreground);
                        font-family: var(--vscode-font-family);
                    }
                    .profiles-list {
                        display: grid;
                        grid-template-columns: repeat(auto-fill, minmax(350px, 1fr));
                        gap: 20px;
                    }
                    .profile-card {
                        background: var(--vscode-input-background);
                        border: 1px solid var(--vscode-input-border);
                        border-radius: 8px;
                        padding: 20px;
                    }
                    .profile-card h4 {
                        margin: 0 0 10px 0;
                        color: var(--vscode-textLink-foreground);
                    }
                    .profile-card p {
                        margin: 5px 0;
                        opacity: 0.8;
                    }
                    .profile-actions {
                        display: flex;
                        gap: 10px;
                        margin-top: 15px;
                    }
                    .btn {
                        padding: 6px 12px;
                        border: none;
                        border-radius: 4px;
                        cursor: pointer;
                        font-size: 13px;
                        background: var(--vscode-button-background);
                        color: var(--vscode-button-foreground);
                    }
                    .btn:hover {
                        background: var(--vscode-button-hoverBackground);
                    }
                    .btn-primary {
                        background: var(--vscode-button-background);
                    }
                    .btn-danger {
                        background: var(--vscode-testing-iconFailed);
                        color: white;
                    }
                    .btn-success {
                        background: var(--vscode-testing-iconPassed);
                        color: white;
                    }
                </style>
            </head>
            <body>
                <div class="header">
                    <h1>📁 Configuration Profiles</h1>
                    <button class="btn btn-primary" onclick="exportAll()">📥 Export All</button>
                </div>

                <div class="create-profile">
                    <h3>➕ Create New Profile</h3>
                    <div class="form-group">
                        <label for="profileName">Name:</label>
                        <input type="text" id="profileName" placeholder="Enter profile name" />
                    </div>
                    <div class="form-group">
                        <label for="profileDescription">Description:</label>
                        <textarea id="profileDescription" placeholder="Enter profile description" rows="3"></textarea>
                    </div>
                    <button class="btn btn-success" onclick="createProfile()">Create Profile</button>
                </div>

                <div class="profiles-list">
                    ${this.profiles.map(profile => `
                        <div class="profile-card">
                            <h4>${profile.name}</h4>
                            <p>${profile.description || 'No description'}</p>
                            <p><small>Created: ${new Date(profile.timestamp).toLocaleString()}</small></p>
                            <div class="profile-actions">
                                <button class="btn btn-primary" onclick="loadProfile('${profile.id}')">📂 Load</button>
                                <button class="btn btn-primary" onclick="exportProfile('${profile.id}')">📤 Export</button>
                                <button class="btn btn-danger" onclick="deleteProfile('${profile.id}')">🗑️ Delete</button>
                            </div>
                        </div>
                    `).join('')}
                </div>

                <script>
                    const vscode = acquireVsCodeApi();

                    function createProfile() {
                        const name = document.getElementById('profileName').value;
                        const description = document.getElementById('profileDescription').value;
                        
                        if (!name.trim()) {
                            alert('Please enter a profile name');
                            return;
                        }

                        vscode.postMessage({
                            command: 'createProfile',
                            name: name.trim(),
                            description: description.trim()
                        });

                        // Clear form
                        document.getElementById('profileName').value = '';
                        document.getElementById('profileDescription').value = '';
                    }

                    function loadProfile(profileId) {
                        vscode.postMessage({
                            command: 'loadProfile',
                            profileId: profileId
                        });
                    }

                    function deleteProfile(profileId) {
                        if (confirm('Are you sure you want to delete this profile?')) {
                            vscode.postMessage({
                                command: 'deleteProfile',
                                profileId: profileId
                            });
                        }
                    }

                    function exportProfile(profileId) {
                        vscode.postMessage({
                            command: 'exportProfile',
                            profileId: profileId
                        });
                    }

                    function exportAll() {
                        vscode.postMessage({
                            command: 'exportAll'
                        });
                    }
                </script>
            </body>
            </html>
        `;
    }

    private async exportProfile(profileId: string): Promise<void> {
        const profile = this.profiles.find(p => p.id === profileId);
        if (!profile) {
            vscode.window.showErrorMessage('Profile not found');
            return;
        }

        const exportData = {
            version: '1.0.0',
            timestamp: new Date().toISOString(),
            profile: profile
        };

        const saveOptions: vscode.SaveDialogOptions = {
            defaultUri: vscode.Uri.file(`${profile.name}-profile.json`),
            filters: {
                'JSON Files': ['json']
            }
        };

        const uri = await vscode.window.showSaveDialog(saveOptions);
        if (uri) {
            await vscode.workspace.fs.writeFile(uri, Buffer.from(JSON.stringify(exportData, null, 2)));
            vscode.window.showInformationMessage(`Profile exported to ${uri.fsPath}`);
        }
    }

    get onDidChangeConfiguration(): vscode.Event<void> {
        return this.onConfigurationChanged.event;
    }

    dispose(): void {
        this.watchers.forEach(watcher => watcher.dispose());
        this.onConfigurationChanged.dispose();
        this.outputChannel.dispose();
    }
}