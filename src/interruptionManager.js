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
    
        const randomTimeout = this.getRandomWaitTime();
        console.log(`Next interruption scheduled in ${randomTimeout / 60000} minutes.`);
    
        setTimeout(() => {
            console.log("Timeout completed. Triggering interruption...");
            this.triggerInterruption();
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
        const baseMinutes = Math.floor(Math.random() * 5) + 11; // Base 11 to 15 minutes
        const randomOffset = Math.random() * 30; // Offset between 0 to 30 seconds
        return minutesToMilliseconds(baseMinutes) + (randomOffset * 1000);
    }
}

module.exports = InterruptionManager;
