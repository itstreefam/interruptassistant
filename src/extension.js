const vscode = require('vscode');
const InterruptionManager = require('./interruptionManager');

/**
 * @param {vscode.ExtensionContext} context
 */
function activate(context) {
	console.log('Congratulations, your extension "interruptassistant" is now active!');

	const interruptionManager = new InterruptionManager(context);

	context.subscriptions.push(vscode.commands.registerCommand('interruptassistant.start', () => {
		interruptionManager.initialize();
	}));
}

// This method is called when your extension is deactivated
function deactivate() {}

module.exports = {
	activate,
	deactivate
}
