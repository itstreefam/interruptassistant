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
        this.interruptionTriggered = false; // Track if interruption has occurred
        this.isInterruptionActive = false;
    }

    initialize() {
        console.log("Initializing interruption manager. Setting up single interruption.");
        this.scheduleInterruption();
    }

    scheduleInterruption() {
        if (this.interruptionTriggered) {
            console.log("Interruption has already been triggered. No further interruptions will be scheduled.");
            return;
        }
    
        const randomTimeout = this.getRandomWaitTime();
        console.log(`Interruption scheduled in ${randomTimeout / 60000} minutes.`);
    
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

        if (this.interruptionTriggered) {
            console.log("Interruption has already been triggered once.");
            return;
        }

        console.log("Triggering the single interruption...");
        this.isInterruptionActive = true;
        this.interruptionTriggered = true;

        this.interruptionTask.startInterruption(() => {
            // Callback on completion of the interruption
            this.isInterruptionActive = false;
            console.log("Interruption complete. No further interruptions will occur.");
        });
    }

    getRandomWaitTime() {
        // Minimum 12 minutes, then random between 13-31 minutes
        const minMinutes = 12;
        const randomAdditionalMinutes = Math.floor(Math.random() * 19) + 1; // 1 to 19 minutes
        const totalMinutes = minMinutes + randomAdditionalMinutes; // 13 to 31 minutes total
        return minutesToMilliseconds(totalMinutes);
    }
}

module.exports = InterruptionManager;