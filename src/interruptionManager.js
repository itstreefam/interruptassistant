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

        // Initialize the interruption classes
        this.codeChangeInterruption = new CodeChangeInterruption(context, this);
        this.navigationInterruption = new NavigationInterruption(context, this);

        // Maintain an ordered list of interruption objects
        this.interruptionQueue = [
            { type: this.navigationInterruption, isTriggered: false },
            { type: this.codeChangeInterruption, isTriggered: false }
        ];

        this.currentInterruptionIndex = 0; // Start with the first interruption type
        this.interruptionCount = 0; // Limit to 3 interruptions, first interruption after 11-13 minutes, then 1 depending on navigation and another on code change
        this.timeoutBeforeFirstInterrupt = this.getRandomWaitTime(); // Random wait time before first interruption
        this.initialize();
    }

    initialize() {
        console.log(`Initialization: Interruption will start after a random time between 11 and 13 minutes.`);
        setTimeout(() => {
            console.log(`Time limit reached. Starting interruptions.`);
            this.triggerTimeoutInterruption();
        }, this.timeoutBeforeFirstInterrupt);
    }

    triggerTimeoutInterruption() {
        this.interruptionTask.startInterruption();
        this.interruptionCount++; // This counts as the first interruption
        this.isTimeoutTriggered = true; // Mark that the timeout has occurred

        // Now, continue with navigational and code change interruptions
        this.startNextInterruption();
    }

    startNextInterruption() {
        // Ensure we don't exceed the limit of 3 interruptions
        if (this.isTimeoutTriggered && this.currentInterruptionIndex < this.interruptionQueue.length && this.interruptionCount < 3) {
            const currentInterruption = this.interruptionQueue[this.currentInterruptionIndex];
            if (!currentInterruption.isTriggered) {
                console.log(`Start Monitoring: ${currentInterruption.type.constructor.name} at index ${this.currentInterruptionIndex}`);
                currentInterruption.type.startMonitoring();
            } else {
                console.log(`Already triggered: ${currentInterruption.type.constructor.name}, moving to next.`);
                this.currentInterruptionIndex++;
                this.startNextInterruption(); // Recursively start next interruption if current is already triggered
            }
        } else if (this.interruptionCount >= 3) {
            console.log("Maximum of 3 interruptions reached. No further interruptions.");
        }
    }

    triggerInterruption() {
        const currentInterruption = this.interruptionQueue[this.currentInterruptionIndex];

        if (!currentInterruption.isTriggered && this.interruptionCount < 3) {
            console.log(`Triggering: ${currentInterruption.type.constructor.name}.`);

            this.interruptionTask.startInterruption();
            currentInterruption.isTriggered = true;
            this.interruptionCount++;

            // Move to the next interruption in the sequence
            this.currentInterruptionIndex++;

            if (this.interruptionCount < 3 && this.currentInterruptionIndex < this.interruptionQueue.length) {
                this.startNextInterruption();
            }
        } else {
            console.log(`Skipping trigger: ${currentInterruption.type.constructor.name} already triggered or max interruptions reached.`);
        }
    }

    getRandomWaitTime() {
        const minTimeout = minutesToMilliseconds(11);
        const maxTimeout = minutesToMilliseconds(13);

        // Return a random number between the min and max timeout
        return Math.floor(Math.random() * (maxTimeout - minTimeout + 1)) + minTimeout;
    }
}

module.exports = InterruptionManager;
