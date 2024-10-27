const vscode = require('vscode');

class BreakTimeoutInterruption {
    constructor(context, interruptionManager) {
        this.context = context;
        this.interruptionManager = interruptionManager;
        this.inactivityTime = 0;
        this.breakTimer = null;
    }

    startMonitoring() {
        this.startInactivityTimer();
        this.context.subscriptions.push(
            vscode.workspace.onDidChangeTextDocument(() => this.resetInactivity())
        );
    }

    startInactivityTimer() {
        this.breakTimer = setInterval(() => {
            this.inactivityTime += 1;
            if (this.inactivityTime >= 12) {  // 12 minutes
                this.triggerBreakPrompt();
            }
        }, 60000);  // Every minute
    }

    resetInactivity() {
        this.inactivityTime = 0;
    }

    triggerBreakPrompt() {
        clearInterval(this.breakTimer);
        vscode.window.showInputBox({ prompt: "Time for a break?" }).then((input) => {
            if (input === "break") {
                if(this.interruptionManager.interruptionQueue[2].isTriggered === false) {
                    this.trigger();
                }
            } else {
                this.startInactivityTimer();
            }
        });
    }

    trigger() {
        vscode.window.showInformationMessage("Break Timeout Interruption Triggered");
        this.interruptionManager.triggerInterruption();
    }
}

module.exports = BreakTimeoutInterruption;
