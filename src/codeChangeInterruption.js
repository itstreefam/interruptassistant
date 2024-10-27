const vscode = require('vscode');

class CodeChangeInterruption {
    constructor(context, interruptionManager) {
        this.context = context;
        this.interruptionManager = interruptionManager;
        this.executionCount = 0;
        this.accumulatedChanges = 0;
        this.randomThreshold = this.getRandomExecutionThreshold();
        console.log("Random Threshold for code change interruption: " + this.randomThreshold);
    }

    startMonitoring() {
        // Monitor when the user executes the program
        this.context.subscriptions.push(
            vscode.workspace.onDidSaveTextDocument((document) => this.onDocumentSaved(document))
        );

        // Monitor when the user makes changes in the editor
        this.context.subscriptions.push(
            vscode.workspace.onDidChangeTextDocument((event) => this.onDocumentChanged(event))
        );
    }

    onDocumentSaved(document) {
        console.log("Document saved: " + document.fileName);

        // Consider this as an execution of the program
        this.executionCount += 1;

        // Check if it's time to trigger the interruption
        if (this.executionCount >= this.randomThreshold) {
            if (this.accumulatedChanges > 5) {  // Only trigger if enough changes were made
                console.log(this.accumulatedChanges);

                // Trigger the interruption
                if (this.interruptionManager.interruptionQueue[1].isTriggered === false) {
                    this.trigger();
                }
            } else {
                // Reset the threshold if criteria not met
                this.randomThreshold = this.getRandomExecutionThreshold();
            }
        }
    }

    onDocumentChanged(event) {
        // Filter out non-code changes (e.g., comments, blank lines)
        const changes = event.contentChanges;
        changes.forEach(change => {
            const addedLines = change.text.split('\n').filter(line => line.trim() !== '' && !line.trim().startsWith('//')).length;
            this.accumulatedChanges += addedLines;
        });
    }

    trigger() {
        vscode.window.showInformationMessage("Code Change Interruption Triggered");
        this.interruptionManager.triggerInterruption();
        
        // Reset counters
        this.executionCount = 0;
        this.accumulatedChanges = 0;
        this.randomThreshold = this.getRandomExecutionThreshold();
    }

    getRandomExecutionThreshold() {
        // Return a random number between 3 and 8
        return Math.floor(Math.random() * (8 - 3 + 1)) + 3;
    }
}

module.exports = CodeChangeInterruption;
