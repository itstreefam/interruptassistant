const vscode = require('vscode');

class NavigationInterruption {
    constructor(context, interruptionManager) {
        this.context = context;
        this.interruptionManager = interruptionManager;
        this.navigationCount = 0;
        this.randomThreshold = this.getRandomNavigationThreshold();
        this.previousFileName = vscode.window.activeTextEditor ? vscode.window.activeTextEditor.document.fileName : null; // Store the initial file name
        console.log("Random Threshold: " + this.randomThreshold);
    }

    startMonitoring() {
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

            // Only count as a navigation if it's a different file
            if (this.previousFileName !== currentFileName) {
                this.navigationCount += 1;
                console.log("Navigation Count: " + this.navigationCount);
                console.log("Switched to a new file: " + currentFileName);

                this.previousFileName = currentFileName;

                if (this.navigationCount >= this.randomThreshold) {
                    this.trigger();
                }
            }
        }
    }

    onWithinFileNav(event) {
        if (event && event.textEditor && event.textEditor.document) {
            const currentFileName = event.textEditor.document.fileName;

            // Ignore within-file navigation that coincides with a file switch
            if (this.previousFileName === currentFileName) {
                const selections = event.selections;

                // Check if the selection is more than just a cursor movement
                if (selections.some(selection => !selection.isEmpty)) {
                    console.log("Word/Block selection within the same file: " + currentFileName);

                    this.navigationCount += 1;
                    console.log("Navigation Count: " + this.navigationCount);

                    if (this.navigationCount >= this.randomThreshold) {
                        this.trigger();
                    }
                }
            }
        }
    }

    trigger() {
        vscode.window.showInformationMessage("Navigation Interruption Triggered");
        this.interruptionManager.triggerInterruption();
        this.navigationCount = 0;
        this.randomThreshold = this.getRandomNavigationThreshold();
    }

    getRandomNavigationThreshold() {
        // Return a random number between 15 and 20
        return Math.floor(Math.random() * (20 - 15 + 1)) + 15;
    }
}

module.exports = NavigationInterruption;
