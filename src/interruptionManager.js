const InterruptionTask = require("./interruptionTask");
const CodeChangeInterruption = require('./codeChangeInterruption');
const NavigationInterruption = require('./navigationInterruption');
const BreakTimeoutInterruption = require('./breakTimeoutInterruption');

class InterruptionManager {
    constructor(context) {
        this.context = context;
        this.interruptionTask = new InterruptionTask(context, this);

        // Initialize the interruption classes
        this.codeChangeInterruption = new CodeChangeInterruption(context, this);
        this.navigationInterruption = new NavigationInterruption(context, this);
        this.breakTimeoutInterruption = new BreakTimeoutInterruption(context, this);

        // Maintain an ordered list of interruption objects
        this.interruptionQueue = [
            { type: this.navigationInterruption, isTriggered: false },
            { type: this.codeChangeInterruption, isTriggered: false },
            { type: this.breakTimeoutInterruption, isTriggered: false }
        ];

        this.currentInterruptionIndex = 0; // Start with the first interruption type
        this.roundCount = 1; // Track the number of rounds
    }

    initialize() {
        console.log(`Initialization: Starting first interruption of round ${this.roundCount}`);
        this.startNextInterruption();
    }

    startNextInterruption() {
        if (this.currentInterruptionIndex < this.interruptionQueue.length) {
            const currentInterruption = this.interruptionQueue[this.currentInterruptionIndex];
            if (!currentInterruption.isTriggered) {
                console.log(`Start Monitoring: ${currentInterruption.type.constructor.name} at index ${this.currentInterruptionIndex}`);
                currentInterruption.type.startMonitoring();
            } else {
                console.log(`Already triggered: ${currentInterruption.type.constructor.name}, moving to next.`);
                this.currentInterruptionIndex++;
                this.startNextInterruption(); // Recursively start next interruption if current is already triggered
            }
        }
    }

    triggerInterruption() {
        const currentInterruption = this.interruptionQueue[this.currentInterruptionIndex];

        if (!currentInterruption.isTriggered) {
            console.log(`Triggering: ${currentInterruption.type.constructor.name} for round ${this.roundCount}.`);

            // Ensure this interruption is the current one in sequence
            if (this.currentInterruptionIndex === this.interruptionQueue.findIndex(interruption => interruption.type === currentInterruption.type)) {
                this.interruptionTask.startInterruption();
                currentInterruption.isTriggered = true;

                // Move to the next interruption in the sequence
                this.currentInterruptionIndex++;

                // Check if all interruptions have been triggered in the current round
                const allTriggered = this.interruptionQueue.every(interruption => interruption.isTriggered);

                if (allTriggered) {
                    console.log(`All interruptions have been triggered for round ${this.roundCount}.`);

                    if (this.roundCount === 1) {
                        // Prepare for the second and final round
                        this.roundCount++;
                        this.resetInterruptionQueue();
                    } else {
                        console.log("All interruptions have been triggered for this session. No further interruptions will be triggered.");
                        return; // Stop further processing after two rounds
                    }
                }

                // Continue to the next interruption
                if (this.currentInterruptionIndex < this.interruptionQueue.length) {
                    this.startNextInterruption();
                }
            } else {
                console.log(`Skipping trigger: ${currentInterruption.type.constructor.name} is not the current active interruption.`);
            }
        } else {
            console.log(`Skipping trigger: ${currentInterruption.type.constructor.name} already triggered.`);
        }
    }

    resetInterruptionQueue() {
        console.log("Resetting Interruption Queue for next round.");
        this.interruptionQueue.forEach(interruption => {
            interruption.isTriggered = false;
        });
        this.currentInterruptionIndex = 0; // Start over from the first interruption in the next round
    }
}

module.exports = InterruptionManager;
