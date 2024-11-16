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
        this.isInterruptionActive = false;
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

        if (this.isInterruptionActive) {
            console.log("An interruption is already active. Scheduling skipped.");
            return;
        }

        const randomTimeout = this.getRandomWaitTime();
        console.log(`Next interruption scheduled in ${randomTimeout / 60000} minutes.`);

        setTimeout(() => {
            if(!this.isInterruptionActive) {
                this.triggerInterruption();
            }
        }, randomTimeout);
    }

    triggerInterruption() {
        if (this.isInterruptionActive) {
            console.log("Skipping trigger as an interruption is already active.");
            return;
        }

        console.log("Triggering an interruption...");
        this.isInterruptionActive = true;

        this.interruptionTask.startInterruption(() => {
            // Callback on valid completion of the interruption
            this.isInterruptionActive = false; // reset after completion
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
