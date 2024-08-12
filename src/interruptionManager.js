const InterruptionTask = require("./interruptionTask");
const CodeChangeInterruption = require('./codeChangeInterruption');

class InterruptionManager {
    constructor(context) {
        this.context = context;
        this.interruptionTask = new InterruptionTask(context);
        this.codeChangeInterruption = new CodeChangeInterruption(context, this);
    }

    initialize() {
        this.codeChangeInterruption.startMonitoring();
    }

    triggerInterruption() {
        this.interruptionTask.startInterruption();
    }
}

module.exports = InterruptionManager;
