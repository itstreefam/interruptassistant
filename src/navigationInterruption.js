const vscode = require('vscode');

class NavigationInterrupt {
    constructor(context, interruptionManager) {
        this.context = context;
        this.interruptionManager = interruptionManager;
        this.navigationCount = 0;
        this.randomThreshold = this.getRandomNavigationThreshold();
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
        // Check if the user navigated between different files
        if(typeof event === 'undefined') {
            return;
        }

        this.navigationCount += 1;
        console.log("Navigation Count: " + this.navigationCount);
        console.log("onBetweenFilesNav: " + JSON.stringify(event));

        if (this.navigationCount >= this.randomThreshold) {
            this.trigger();
        }
    }

    onWithinFileNav(event) {
        // Check if the user navigated within the same file
        if(typeof event === 'undefined') {
            return;
        }

        this.navigationCount += 1;
        console.log("Navigation Count: " + this.navigationCount);
        console.log("onWithinFileNav: " + JSON.stringify(event));

        if (this.navigationCount >= this.randomThreshold) {
            this.trigger();
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

module.exports = NavigationInterrupt;
