const InterruptionTask = require("./interruptionTask");
const CodeChangeInterruption = require('./codeChangeInterruption');
const NavigationInterruption = require('./navigationInterruption');
const vscode = require('vscode');

// Helper function to convert minutes to milliseconds
function minutesToMilliseconds(minutes) {
    return minutes * 60 * 1000;
}

class InterruptionManager {
    constructor(context) {
        this.context = context;
        this.interruptionTask = new InterruptionTask(context, this);
        this.codeChangeInterruption = new CodeChangeInterruption(context, this);
        this.navigationInterruption = new NavigationInterruption(context, this);

        this.interruptionQueue = [
            { type: this.navigationInterruption, isTriggered: false },
            { type: this.codeChangeInterruption, isTriggered: false }
        ];

        this.currentInterruptionIndex = 0;
        this.interruptionCount = 0; // Limit to 3 valid interruptions
        this.timeoutBeforeFirstInterrupt = this.getRandomWaitTime();
    }

    initialize() {
        console.log("Initializing interruption manager. First interruption (timeout) will start.");
        setTimeout(() => {
            this.triggerTimeoutInterruption();
        }, this.timeoutBeforeFirstInterrupt);
        vscode.window.showInformationMessage("Interruption Assistant is now active.");
    }

    triggerTimeoutInterruption() {
        console.log("Starting timed break interruption...");
        
        this.interruptionTask.startInterruption((isValid) => {
            if (isValid) {
                this.interruptionCount++;
                console.log(`Timed break interruption completed. Total valid interruptions: ${this.interruptionCount}`);
            } else {
                console.log("Timed break was disposed early and will not be counted.");
            }
            this.startNextInterruption();
        });
    }

    startNextInterruption() {
        if (this.interruptionCount >= 3) {
            console.log("Maximum of 3 interruptions reached. No further interruptions will be scheduled.");
            return;
        }

        const currentInterruption = this.interruptionQueue[this.currentInterruptionIndex];
        
        if (!currentInterruption.isTriggered) {
            console.log(`Triggering next interruption: ${currentInterruption.type.constructor.name}`);
            currentInterruption.type.startMonitoring(() => {
                this.interruptionTask.startInterruption((isValid) => {
                    if (isValid) {
                        this.interruptionCount++;
                        console.log(`Interruption (${currentInterruption.type.constructor.name}) completed. Total valid interruptions: ${this.interruptionCount}`);
                    } else {
                        console.log(`Interruption (${currentInterruption.type.constructor.name}) disposed early and will not be counted.`);
                    }

                    this.currentInterruptionIndex++;
                    this.startNextInterruption(); // Move to the next interruption type if available
                });
            });
            currentInterruption.isTriggered = true;
        } else {
            console.log(`${currentInterruption.type.constructor.name} already triggered, moving to the next.`);
            this.currentInterruptionIndex++;
            this.startNextInterruption();
        }
    }

    triggerInterruption() {
        console.log("Manually triggering an interruption...");

        this.interruptionTask.startInterruption((isValid) => {
            if (isValid) {
                this.interruptionCount++;
                console.log(`Manual interruption completed. Total valid interruptions: ${this.interruptionCount}`);
            } else {
                console.log("Manual interruption was disposed early and will not be counted.");
            }

            this.startNextInterruption(); // Schedule the next interruption after the manual one
        });
    }

    getRandomWaitTime() {
        const minTimeout = minutesToMilliseconds(11);
        const maxTimeout = minutesToMilliseconds(13);
        return Math.floor(Math.random() * (maxTimeout - minTimeout + 1)) + minTimeout;
    }
}

module.exports = InterruptionManager;
