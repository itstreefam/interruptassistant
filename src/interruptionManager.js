const InterruptionTask = require("./interruptionTask");

class InterruptionManager {
    constructor(context) {
        this.context = context;
        this.interruptionTask = new InterruptionTask(context);
    }

    initialize() {
        this.interruptionTask.startInterruption();
    }
}

module.exports = InterruptionManager;
