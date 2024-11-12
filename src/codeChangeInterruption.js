const vscode = require('vscode');

class CodeChangeInterruption {
    constructor(context, interruptionManager) {
        this.context = context;
        this.interruptionManager = interruptionManager;
        this.executionCount = 0;
        this.accumulatedChanges = 0;
        this.randomThreshold = this.getRandomExecutionThreshold();
        this.autoTriggerTimeout = null; // Timer for auto-triggering
        this.isTriggered = false;
        console.log("Random Threshold for code change interruption: " + this.randomThreshold);
    }

    startMonitoring() {
        // Set a 12-minute auto-trigger timer
        this.autoTriggerTimeout = setTimeout(() => {
            if (!this.isTriggered) {
                console.log("Auto-triggering code change interruption due to time threshold.");
                this.trigger();
            }
        }, 12 * 60 * 1000); // 12 minutes in milliseconds

        // Monitor program executions and code changes
        this.context.subscriptions.push(
            vscode.workspace.onDidSaveTextDocument((document) => this.onDocumentSaved(document))
        );
        this.context.subscriptions.push(
            vscode.workspace.onDidChangeTextDocument((event) => this.onDocumentChanged(event))
        );
    }

    onDocumentSaved(document) {
        console.log("Document saved: " + document.fileName);
        this.executionCount += 1;

        if (this.executionCount >= this.randomThreshold && this.accumulatedChanges > 5 && !this.isTriggered) {
            this.trigger();
        } else if (this.executionCount >= this.randomThreshold && this.accumulatedChanges <= 5) {
            this.randomThreshold = this.getRandomExecutionThreshold();
            console.log("Insufficient code changes to trigger; new random threshold: " + this.randomThreshold);
        }
    }

    onDocumentChanged(event) {
        const changes = event.contentChanges;
        changes.forEach(change => {
            const addedLines = change.text.split('\n').filter(line => line.trim() !== '' && !line.trim().startsWith('//')).length;
            this.accumulatedChanges += addedLines;
        });
    }

    trigger() {
        this.isTriggered = true;

        // Clear the auto-trigger timer to prevent duplicate triggers
        if (this.autoTriggerTimeout) {
            clearTimeout(this.autoTriggerTimeout);
            this.autoTriggerTimeout = null;
        }

        this.interruptionManager.triggerInterruption();
        this.resetCounters();
    }

    resetCounters() {
        this.executionCount = 0;
        this.accumulatedChanges = 0;
        this.randomThreshold = this.getRandomExecutionThreshold();
        this.isTriggered = false;
    }

    getRandomExecutionThreshold() {
        return Math.floor(Math.random() * (8 - 3 + 1)) + 3; // Random threshold between 3 and 8
    }
}

module.exports = CodeChangeInterruption;
