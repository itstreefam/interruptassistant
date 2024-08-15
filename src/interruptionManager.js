const InterruptionTask = require("./interruptionTask");
const CodeChangeInterruption = require('./codeChangeInterruption');
const NavigationInterruption = require('./navigationInterruption');
const breakTimeoutInterruption = require('./breakTimeoutInterruption');

class InterruptionManager {
    constructor(context) {
        this.context = context;
        this.interruptionTask = new InterruptionTask(context, this);
        // this.codeChangeInterruption = new CodeChangeInterruption(context, this);
        // this.navigationInterruption = new NavigationInterruption(context, this);
        this.breakTimeoutInterruption = new breakTimeoutInterruption(context, this);
    }

    initialize() {
        // this.codeChangeInterruption.startMonitoring();
        // this.navigationInterruption.startMonitoring();
        this.breakTimeoutInterruption.startMonitoring();
    }

    triggerInterruption() {
        this.interruptionTask.startInterruption();
    }
}

module.exports = InterruptionManager;
