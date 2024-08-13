const InterruptionTask = require("./interruptionTask");
const CodeChangeInterruption = require('./codeChangeInterruption');
const NavigationInterrupt = require('./navigationInterruption');

class InterruptionManager {
    constructor(context) {
        this.context = context;
        this.interruptionTask = new InterruptionTask(context);
        // this.codeChangeInterruption = new CodeChangeInterruption(context, this);
        this.navigationInterruption = new NavigationInterrupt(context, this);
    }

    initialize() {
        // this.codeChangeInterruption.startMonitoring();
        this.navigationInterruption.startMonitoring();
    }

    triggerInterruption() {
        this.interruptionTask.startInterruption();
    }
}

module.exports = InterruptionManager;
