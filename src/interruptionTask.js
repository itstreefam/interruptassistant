const vscode = require('vscode');
const fs = require('fs');
const path = require('path');
const activeWindow = require('active-win');
const os = require('os');
const cp = require('child_process');


class InterruptionTask {
    constructor(context, interruptionManager) {
        this.context = context;
        this.interruptionManager = interruptionManager;

        this.timer = null;
        this.startTime = null;
        this.stateSaved = false;

        this.isInterruptionOngoing = false;
    }

    async startInterruption(onComplete) {
        this.stateSaved = false;
        this.isInterruptionOngoing = true;
        console.log("Starting interruption: saving files and closing editors (excluding Webview panels).");
    
        try {
            // Save all files first
            await vscode.commands.executeCommand('workbench.action.files.saveAll');
    
            // Ensure the sidebar is closed
            await vscode.commands.executeCommand('workbench.action.closeSidebar');
    
            // Get all editor groups
            const groups = vscode.window.tabGroups.all;
    
            // Flag to check if any "Webview" tabs were found
            let webviewFound = false;
    
            // Close editors in all groups except Webview panels
            for (const group of groups) {
                // Create a copy of tabs to avoid modification during iteration
                const tabsToClose = [...group.tabs];
    
                for (const tab of tabsToClose) {
                    // Skip Webview tabs (case-insensitive check)
                    if (tab.label.toLowerCase().includes('webview')) {
                        console.log(`Skipping Webview tab: ${tab.label}`);
                        webviewFound = true;
                        continue;
                    }
    
                    try {
                        // Use safer closing method
                        await vscode.window.tabGroups.close(tab);
                        console.log(`Closed editor: ${tab.label}`);
                    } catch (closeErr) {
                        // More detailed error handling
                        if (closeErr.message.includes('Invalid tab')) {
                            console.warn(`Tab already closed or invalid: ${tab.label}`);
                        } else {
                            console.error(`Unexpected error closing tab ${tab.label}:`, closeErr);
                        }
                    }
                }
            }
    
            // Log a warning if no "Webview" tabs were found
            if (!webviewFound) {
                console.warn("No Webview tabs were found. Proceeding with interruption setup.");
            }

            // Close Chrome browser
            const allWindows = activeWindow.getOpenWindowsSync();

            for (let app of allWindows){
                let appName = app.owner.name.toLowerCase();
                let pid = app.owner.processId;

                if(appName.includes('chrome')){
                    this.closeApplication(pid);
                }
            }
            
            // Create the interruption panel
            const panel = vscode.window.createWebviewPanel(
                'interruptassistant',
                'Time for Interruption',
                vscode.ViewColumn.One,
                { 
                    enableScripts: true,
                    retainContextWhenHidden: true
                }
            );
    
            // Save the start time of the interruption in seconds
            this.startTime = Math.floor(Date.now() / 1000);
    
            await this.setupInterruptionPanel(panel, onComplete);
            
            console.log("Displaying interruption message...");
        } catch (error) {
            console.error("Error starting interruption:", error);
            vscode.window.showErrorMessage(`Failed to start interruption: ${error.message}`);
            this.isInterruptionOngoing = false;
        }
    }
    
    async setupInterruptionPanel(panel, onComplete) {
        // Set the content to simple text message
        panel.webview.html = this.getInterruptionHtml();
    
        // Set timer for 10 minutes (600 seconds)
        const interruptionDuration = 10 * 60 * 1000; // 10 minutes in milliseconds
    
        this.timer = setTimeout(() => {
            console.log("Interruption time complete (10 minutes).");
            this.finishInterruption(panel, onComplete);
        }, interruptionDuration);
    
        // Handle panel disposal (if user closes it manually)
        panel.onDidDispose(() => {
            if (this.timer) {
                clearTimeout(this.timer);
                this.timer = null;
            }
            if (!this.stateSaved) {
                console.log("Panel disposed before completion. Saving state.");
                this.finishInterruption(panel, onComplete);
            }
        });
    }
    
    getInterruptionHtml() {
        return `
            <!DOCTYPE html>
            <html lang="en">
                <head>
                    <meta charset="UTF-8">
                    <meta name="viewport" content="width=device-width, initial-scale=1.0">
                    <title>Time for Interruption</title>
                    <style>
                        body {
                            display: flex;
                            justify-content: center;
                            align-items: center;
                            height: 100vh;
                            margin: 0;
                            font-family: Arial, sans-serif;
                            background-color: #1e1e1e;
                            color: #ffffff;
                        }
                        h1 {
                            font-size: 3em;
                            text-align: center;
                        }
                    </style>
                </head>
                <body>
                    <h1>Time for Interruption</h1>
                </body>
            </html>
        `;
    }
    
    finishInterruption(panel, onComplete) {
        if (this.stateSaved) {
            console.warn("Interruption already saved. Skipping duplicate save.");
            return;
        }
    
        this.stateSaved = true; // Mark state as saved to prevent duplicates

        this.isInterruptionOngoing = false;
    
        // Save the end time of the interruption
        this.endTime = Math.floor(Date.now() / 1000);
    
        vscode.window.showInformationMessage(`Interruption complete.`);
    
        const interruptionData = {
            startTime: this.startTime,
            endTime: this.endTime
        };
    
        const interruptionDataString = JSON.stringify(interruptionData);
        console.log("Interruption data:", interruptionDataString);
    
        // Resolve path to save the interruption log
        const cwd = this.getCwd();
        const interruptionLogsPath = path.join(cwd, 'CH_cfg_and_logs', 'interruptionLogs.json');
    
        // Attempt to save the data
        fs.appendFile(interruptionLogsPath, interruptionDataString + '\n', (err) => {
            if (err) {
                console.error("Error saving interruption data:", err);
                vscode.window.showErrorMessage("Failed to save interruption data.");
            } else {
                console.log("Interruption data saved successfully.");
            }
    
            // Dispose the panel regardless of the logging result
            panel.dispose();
    
            // Notify InterruptionManager of completion
            if (onComplete) onComplete();
    
            // Reset the state
            this.resetState();
        });

        // close vscode editors (but not the tab that has Webview)
        vscode.window.tabGroups.all.forEach(group => {
            group.tabs
            .filter(tab => !tab.label.toLowerCase().includes('webview'))
            .forEach(tab => {
                try {
                    // Use safer closing method
                    vscode.window.tabGroups.close(tab);
                    console.log(`Closed editor: ${tab.label}`);
                } catch (closeErr) {
                    // More detailed error handling
                    if (closeErr.message.includes('Invalid tab')) {
                        console.warn(`Tab already closed or invalid: ${tab.label}`);
                    } else {
                        console.error(`Unexpected error closing tab ${tab.label}:`, closeErr);
                    }
                }
            });
        });
    }    

    resetState() {
        clearTimeout(this.timer);
        this.timer = null;
    }

    getCwd() {
        const workspaceFolders = vscode.workspace.workspaceFolders;
    
        if (workspaceFolders && workspaceFolders.length > 0) {
            // Return the URI path of the first workspace folder
            return workspaceFolders[0].uri.fsPath;
        } else {
            console.error("No workspace folder is open.");
            return null;
        }
    }

    // function to close chrome browser for respective os system
    closeApplication(pid){
        let platform = os.platform();

        switch(platform){
            case 'win32':
                cp.exec(`taskkill /PID ${pid} /F`);
                break;
            case 'darwin':
                cp.exec(`kill -9 ${pid}`);
                break;
            case 'linux':
                cp.exec(`kill -9 ${pid}`);
                break;
        }
    }
}

module.exports = InterruptionTask;