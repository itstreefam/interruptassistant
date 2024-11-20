const vscode = require('vscode');
const fs = require('fs');
const path = require('path');

class InterruptionTask {
    constructor(context, interruptionManager) {
        this.context = context;
        this.interruptionManager = interruptionManager;
        this.currentProblemIndex = 0;
        this.totalProblems = 10; // Number of questions in each interruption
        this.correctAnswers = 0;
        this.timer = null;

        this.startTime = null;
        this.questionsAndAnswers = []; // store questions and answers
        this.editEvents = {lastEditBefore: null, firstEditAfter: null};
        this.stateSaved = false;
    }

    async startInterruption(onComplete) {
        this.stateSaved = false;
        console.log("Starting interruption: saving files and closing editors (excluding Webview panels).");
    
        try {
            // Save all files first
            await vscode.commands.executeCommand('workbench.action.files.saveAll');
    
            // Ensure the sidebar is closed
            await vscode.commands.executeCommand('workbench.action.closeSidebar');
    
            // Get all editor groups
            const groups = vscode.window.tabGroups.all;
    
            // Flag to check if any "Webview" tabs were found
            let webviewFound = false;
    
            // Close editors in all groups except Webview panels
            for (const group of groups) {
                for (const tab of group.tabs) {
                    if (tab.label.includes('Webview')) {
                        console.log(`Skipping Webview tab: ${tab.label}`);
                        webviewFound = true;
                        continue;
                    }
    
                    // Close the specific editor
                    try {
                        await vscode.window.tabGroups.close(tab);
                        console.log(`Closed editor: ${tab.label}`);
                    } catch (closeErr) {
                        console.error(`Error closing editor ${tab.label}:`, closeErr);
                    }
                }
            }
    
            // Log a warning if no "Webview" tabs were found
            if (!webviewFound) {
                console.warn("No Webview tabs were found. Proceeding with interruption setup.");
            }
    
            // Create the interruption panel
            const panel = vscode.window.createWebviewPanel(
                'interruptassistant',
                'Interrupting Task',
                vscode.ViewColumn.One,
                { 
                    enableScripts: true,
                    retainContextWhenHidden: true // Keep the panel's content when hidden
                }
            );
    
            // Save the start time of the interruption in seconds
            this.startTime = Math.floor(Date.now() / 1000);
    
            // Setup the interruption panel
            await this.setupInterruptionPanel(panel, onComplete);
    
        } catch (err) {
            console.error("Error during interruption setup:", err);
            throw err; // Re-throw the error for proper error handling upstream
        }
    }    

    // Separate logic for panel setup
    setupInterruptionPanel(panel, onComplete) {
        this.startTimer(panel, onComplete);
        this.showNextProblem(panel); // Show the first math problem

        // Handle user interaction with the panel
        panel.webview.onDidReceiveMessage(message => {
            // Validate and parse user input
            const userAnswer = parseInt(message.answer, 10);

            if (isNaN(userAnswer)) {
                console.error("Invalid answer received:", message.answer);
                return; // Ignore invalid answers
            }

            // Check if the answer is correct
            const isCorrect = this.checkAnswer(userAnswer);

            // Update the question and answer object
            this.questionsAndAnswers[this.currentProblemIndex].userAnswer = userAnswer;
            this.questionsAndAnswers[this.currentProblemIndex].isCorrect = isCorrect;

            this.correctAnswers += isCorrect ? 1 : 0;

            console.log(`Question ${this.currentProblemIndex + 1}: Received answer: ${userAnswer}, Correct: ${isCorrect}`);
            console.log(`Total correct answers so far: ${this.correctAnswers}`);

            // Move to the next question or finish the task
            if (this.currentProblemIndex < this.totalProblems - 1) {
                this.currentProblemIndex++;
                this.showNextProblem(panel); // Show the next problem
            } else {
                console.log("All questions answered. Finishing interruption.");
                this.finishInterruption(panel, onComplete);
            }
        });

        // Handle premature panel disposal
        panel.onDidDispose(() => {
            // if the panel is closed before the interruption is completed
            if (!this.stateSaved) {
                console.log("Interruption panel closed prematurely.");
                console.log("Interruption panel was disposed before completion.");
                this.resetState(); // Reset state if the panel is closed early
                this.interruptionManager.isInterruptionActive = false; // Reset active flag
                this.interruptionManager.scheduleNextInterruption(); // Retry interruption immediately
            }
        });
    }

    startTimer(panel, onComplete) {
        this.timer = setTimeout(() => {
            console.log("Interruption time limit reached.");
            if (!this.stateSaved) {
                this.finishInterruption(panel, onComplete);
            }
        }, 3 * 60 * 1000);
    }

    showNextProblem(panel) {
        const multiplicand1 = this.generateRandomDoubleDigit();
        const multiplicand2 = this.generateRandomDoubleDigit();
        const equation = `${multiplicand1} x ${multiplicand2}`;

        // store the question and the correct answer
        this.questionsAndAnswers.push({
            question: equation,
            correctAnswer: multiplicand1 * multiplicand2,
            userAnswer: null,
            isCorrect: null,
        });
        
        panel.webview.html = this.getWebviewContent(equation);
        this.currentAnswer = multiplicand1 * multiplicand2; // Store the correct answer
    }

    getWebviewContent(equation) {
        return `
            <html>
                <head>
                    <style>
                        body {
                            display: flex;
                            justify-content: center;
                            align-items: center;
                            height: 100vh;
                            background-color: #333;
                            color: white;
                            margin: 0;
                            font-family: Arial, sans-serif;
                        }
                        #container {
                            text-align: center;
                        }
                        #header {
                            margin-bottom: 20px;
                        }
                        #equation-container {
                            display: flex;
                            align-items: center;
                            font-size: 5em;
                            margin-bottom: 20px;
                        }
                        input {
                            font-size: 1em;
                            width: 4em;
                            text-align: center;
                            margin-left: 0.5em;
                            border: 2px solid #fff;
                            border-radius: 0.5em;
                            padding: 0.2em;
                            background-color: #444;
                            color: white;
                        }
                        button {
                            font-size: 2em;
                            padding: 0.5em 1.5em;
                            border-radius: 0.5em;
                            cursor: pointer;
                            background-color: #007ACC;
                            color: white;
                            border: none;
                            transition: background-color 0.3s ease;
                            margin-top: 1em;
                        }
                        button:disabled {
                            background-color: #666;
                            cursor: not-allowed;
                        }
                        button:hover:enabled {
                            background-color: #005A99;
                        }
                        button:active:enabled {
                            background-color: #003D66;
                        }
                    </style>
                </head>
                <body>
                    <div id="container">
                    <div id="header">
                        <h1>Interruption Task</h1>
                        <p>Please complete this task to continue. The panel should not be closed manually.</p>
                        <p>For each correct answer, you will receive $0.2.</p>
                    </div>
                    <div id="equation-container">
                        <span>${equation} =</span>
                        <input type="number" id="answer" />
                    </div>
                    <button id="submitButton" disabled>Submit</button>
                </div>
                </body>
                <script>
                    const vscode = acquireVsCodeApi();
    
                    const answerInput = document.getElementById('answer');
                    const submitButton = document.getElementById('submitButton');
    
                    // Enable or disable the submit button based on input
                    answerInput.addEventListener('input', () => {
                        submitButton.disabled = answerInput.value.trim() === '';
                    });
    
                    function submitAnswer() {
                        const answer = answerInput.value.trim();
                        if (answer === '' || isNaN(answer)) {
                            alert('Please enter a valid number.');
                        } else {
                            vscode.postMessage({ answer: parseInt(answer) });
                        }
                    }
    
                    submitButton.addEventListener('click', submitAnswer);
                    answerInput.focus();
                </script>
            </html>
        `;
    }

    generateRandomDoubleDigit() {
        let num;
        do {
            num = Math.floor(Math.random() * 90) + 10; // Generates a number between 10 and 99
        } while (num.toString().includes('0') || num.toString().includes('1')); // Exclude 0 and 1
        return num;
    }

    checkAnswer(userAnswer) {
        return userAnswer === this.currentAnswer;
    }

    finishInterruption(panel, onComplete) {
        if (this.stateSaved) {
            console.warn("Interruption already saved. Skipping duplicate save.");
            return;
        }
    
        this.stateSaved = true; // Mark state as saved to prevent duplicates 
        
        let correctAnswers = this.correctAnswers;
        let totalProblems = this.totalProblems;

        // Save the end time of the interruption in seconds
        this.endTime = Math.floor(Date.now() / 1000);

        vscode.window.showInformationMessage(`Interruption complete. You answered ${correctAnswers} correctly.`);
        // console.log(this.questionsAndAnswers);

        const interruptionData = {
            startTime: this.startTime,
            endTime: this.endTime,
            questionsAndAnswers: this.questionsAndAnswers,
            editEvents: this.editEvents,
        };

        // console.log("Interruption data:", interruptionData);

        const interruptionDataString = JSON.stringify(interruptionData);
        console.log(interruptionDataString);

        // Save the interruption data to a file
        const cwd = this.getCwd();
        // resolve path to CH_cfg_and_logs/interruptionLogs.json
	    const interruptionLogsPath = path.join(cwd, 'CH_cfg_and_logs', 'interruptionLogs.json');

        fs.appendFile(interruptionLogsPath, interruptionDataString + '\n', (err) => {
            if (err) {
                console.error("Error saving interruption data:", err);
                vscode.window.showErrorMessage("Failed to save interruption data.");
            } else {
                console.log("Interruption data saved successfully.");
                this.stateSaved = true; // Only reset if saving succeeds
                this.resetState();
            }
        });

        panel.dispose();

        // Notify InterruptionManager of valid interruption completion
        if (onComplete) onComplete();

        this.resetState();
    }

    resetState() {
        this.currentProblemIndex = 0;
        this.correctAnswers = 0;
        clearTimeout(this.timer);
        this.timer = null;

        // Preserve questionsAndAnswers and editEvents for logging
        this.questionsAndAnswers = [];
        this.editEvents = { lastEditBefore: null, firstEditAfter: null };
    }

    getCwd() {
        const workspaceFolders = vscode.workspace.workspaceFolders;
    
        if (workspaceFolders && workspaceFolders.length > 0) {
            // Return the URI path of the first workspace folder
            return workspaceFolders[0].uri.fsPath;
        } else {
            console.error("No workspace folder is open.");
            return null;
        }
    }
}

module.exports = InterruptionTask;
