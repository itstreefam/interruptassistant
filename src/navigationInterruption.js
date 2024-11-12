const vscode = require('vscode');

class NavigationInterruption {
    constructor(context, interruptionManager) {
        this.context = context;
        this.interruptionManager = interruptionManager;
        this.navigationCount = 0;
        this.randomThreshold = this.getRandomNavigationThreshold();
        this.autoTriggerTimeout = null; // Timer for auto-triggering
        this.isTriggered = false;
        this.previousFileName = vscode.window.activeTextEditor ? vscode.window.activeTextEditor.document.fileName : null;
        console.log("Random Threshold for navigation interruption: " + this.randomThreshold);
    }

    startMonitoring() {
        // Set a 12-minute auto-trigger timer
        this.autoTriggerTimeout = setTimeout(() => {
            if (!this.isTriggered) {
                console.log("Auto-triggering navigation interruption due to time threshold.");
                this.trigger();
            }
        }, 12 * 60 * 1000); // 12 minutes in milliseconds

        // Monitor between and within file navigation
        this.context.subscriptions.push(
            vscode.window.onDidChangeActiveTextEditor((event) => this.onBetweenFilesNav(event))
        );
        this.context.subscriptions.push(
            vscode.window.onDidChangeTextEditorSelection((event) => this.onWithinFileNav(event))
        );
    }

    onBetweenFilesNav(event) {
        if (event && event.document) {
            const currentFileName = event.document.fileName;

            if (this.previousFileName !== currentFileName) {
                this.navigationCount += 1;
                console.log("Navigation Count: " + this.navigationCount);
                this.previousFileName = currentFileName;

                if (this.navigationCount >= this.randomThreshold && !this.isTriggered) {
                    this.trigger();
                }
            }
        }
    }

    onWithinFileNav(event) {
        if (event && event.textEditor && event.textEditor.document) {
            const currentFileName = event.textEditor.document.fileName;
    
            if (this.previousFileName === currentFileName) {
                const selections = event.selections;
    
                selections.forEach(selection => {
                    const selectedText = event.textEditor.document.getText(selection).trim();
    
                    // Set thresholds for a selection to be counted as "significant"
                    const minSelectionLength = 5; // Minimum selection length
                    const significantPositionChange = 15; // Minimum position change for new selection
    
                    const currentSelectionLength = selectedText.length;
                    const isSignificantLength = currentSelectionLength >= minSelectionLength;
    
                    // Calculate start and end positions of the current selection
                    const { start, end } = selection;
                    const hasMovedSignificantly = !this.lastSelection || 
                        Math.abs(start.line - this.lastSelection.start.line) > 1 || 
                        Math.abs(end.character - this.lastSelection.end.character) >= significantPositionChange;
    
                    // Only count if the selection length is significant and position has moved significantly
                    if (isSignificantLength && hasMovedSignificantly && !/^\s*$/.test(selectedText)) {
                        console.log(`Significant selection: "${selectedText}"`);
    
                        this.navigationCount += 1;
                        console.log("Navigation Count: " + this.navigationCount);
    
                        // Update the last recorded significant selection
                        this.lastSelection = { start, end };
                        this.lastSelectedText = selectedText;
    
                        if (this.navigationCount >= this.randomThreshold && !this.isTriggered) {
                            this.trigger();
                        }
                    }
                });
            }
        }
    }    

    trigger() {
        this.isTriggered = true;

        // Clear the auto-trigger timer to prevent duplicate triggers
        if (this.autoTriggerTimeout) {
            clearTimeout(this.autoTriggerTimeout);
            this.autoTriggerTimeout = null;
        }

        this.interruptionManager.triggerInterruption();
        this.resetNavigation();
    }

    resetNavigation() {
        this.navigationCount = 0;
        this.randomThreshold = this.getRandomNavigationThreshold();
        this.isTriggered = false;
    }

    getRandomNavigationThreshold() {
        return Math.floor(Math.random() * (40 - 25 + 1)) + 25; // Random threshold between 25 and 40
    }
}

module.exports = NavigationInterruption;
