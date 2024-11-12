const InterruptionTask = require("./interruptionTask");
const vscode = require('vscode');

// Helper function to convert minutes to milliseconds
function minutesToMilliseconds(minutes) {
    return minutes * 60 * 1000;
}

class InterruptionManager {
    constructor(context) {
        this.context = context;
        this.interruptionTask = new InterruptionTask(context, this);
        this.interruptionCount = 0; // Track the number of valid interruptions
    }

    initialize() {
        console.log("Initializing interruption manager. Setting up first interruption.");
        this.scheduleNextInterruption();
    }

    scheduleNextInterruption() {
        if (this.interruptionCount >= 3) {
            console.log("Maximum of 3 interruptions reached. No further interruptions will be scheduled.");
            return;
        }

        const randomTimeout = this.getRandomWaitTime();
        console.log(`Next interruption scheduled in ${randomTimeout / 60000} minutes.`);

        setTimeout(() => {
            this.triggerInterruption();
        }, randomTimeout);
    }

    triggerInterruption() {
        console.log("Triggering an interruption...");

        this.interruptionTask.startInterruption(() => {
            // Callback on valid completion of the interruption
            this.interruptionCount++;
            console.log(`Interruption complete. Total valid interruptions: ${this.interruptionCount}`);
            this.scheduleNextInterruption(); // Schedule the next interruption
        });
    }

    getRandomWaitTime() {
        const minTimeout = minutesToMilliseconds(11);
        const maxTimeout = minutesToMilliseconds(16);
        return Math.floor(Math.random() * (maxTimeout - minTimeout + 1)) + minTimeout;
    }
}

module.exports = InterruptionManager;
