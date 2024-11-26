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
        this.loadQuestions();
    }

    shuffleArray(array) {
        for (let i = array.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [array[i], array[j]] = [array[j], array[i]];
        }
    }

    async loadQuestions() {
        try {
            const cwd = this.getCwd();
            const datasetPath = path.join("C:\\Users\\thien\\Desktop\\code_comprehension.json");
            const data = fs.readFileSync(datasetPath, 'utf-8');
            
            // Split the data into lines and parse each line
            const lines = data.split('\n').filter(line => line.trim() !== '');
            this.questions = lines.map(line => JSON.parse(line));
            this.shuffleArray(this.questions); // Randomize questions
            
            console.log("Questions loaded successfully. Total questions:", this.questions.length);
        } catch (error) {
            console.error("Error loading questions:", error.message);
            vscode.window.showErrorMessage(`Failed to load questions: ${error.message}`);
        }
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
                // Create a copy of tabs to avoid modification during iteration
                const tabsToClose = [...group.tabs];
    
                for (const tab of tabsToClose) {
                    // Skip Webview tabs
                    if (tab.label.includes('Webview')) {
                        console.log(`Skipping Webview tab: ${tab.label}`);
                        webviewFound = true;
                        continue;
                    }
    
                    try {
                        // Use safer closing method
                        await vscode.window.tabGroups.close(tab);
                        console.log(`Closed editor: ${tab.label}`);
                    } catch (closeErr) {
                        // More detailed error handling
                        if (closeErr.message.includes('Invalid tab')) {
                            console.warn(`Tab already closed or invalid: ${tab.label}`);
                        } else {
                            console.error(`Unexpected error closing tab ${tab.label}:`, closeErr);
                        }
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
    
            await this.setupInterruptionPanel(panel, onComplete);
            
            console.log("Displaying first question...");
            this.showNextQuestion(panel);

        } catch (err) {
            console.error("Error during interruption setup:", err);
            throw err;
        }
    } 

    setupInterruptionPanel(panel, onComplete) {
        this.startTimer(panel, onComplete);
    
        // Listen for messages from the webview
        panel.webview.onDidReceiveMessage(message => {
            if (message.answer) {
                const userAnswer = message.answer.trim();
                const currentQuestion = this.questions[this.currentProblemIndex];
    
                // Check if the answer is correct
                const isCorrect = userAnswer === currentQuestion.correct_answer;
                this.correctAnswers += isCorrect ? 1 : 0;
    
                console.log(`Question ${this.currentProblemIndex + 1}: Received answer: ${userAnswer}, Correct: ${isCorrect}`);
    
                // Move to the next question or finish the task
                if (this.currentProblemIndex < this.questions.length - 1) {
                    this.currentProblemIndex++;
                    this.showNextQuestion(panel); // Replace HTML for the next question
                } else {
                    console.log("All questions answered. Finishing interruption.");
                    this.finishInterruption(panel, onComplete);
                }
            }
        });
    
        panel.onDidDispose(() => {
            if (!this.stateSaved) {
                console.log("Interruption panel closed prematurely.");
                this.resetState();
                this.interruptionManager.isInterruptionActive = false;
                this.interruptionManager.scheduleNextInterruption();
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

    showNextQuestion(panel) {
        const question = this.questions[this.currentProblemIndex];
        console.log("Displaying question:", question); // Debug log
    
        // Replace the webview content entirely
        panel.webview.html = this.getWebviewContent(question);
    }    
    
    getWebviewContent(question) {
        return `
            <html>
                <head>
                    <style>
                        body {
                            font-family: Arial, sans-serif;
                            margin: 20px;
                            background-color: #1e1e1e;
                            color: #d4d4d4;
                        }
                        pre {
                            background-color: #252526;
                            padding: 10px;
                            border-radius: 5px;
                            font-size: 1em;
                            overflow-x: auto;
                            white-space: pre-wrap;
                        }
                        .answer-btn {
                            background-color: #007acc;
                            color: white;
                            border: none;
                            border-radius: 5px;
                            padding: 10px 15px;
                            font-size: 1em;
                            cursor: pointer;
                            margin-bottom: 10px;
                            display: block;
                            width: 100%;
                            text-align: left;
                        }
                        .answer-btn:hover {
                            background-color: #005a9e;
                        }
                    </style>
                </head>
                <body>
                    <h1>Question</h1>
                    <pre>${question.question.replace(/\n/g, '<br>')}</pre>
                    <h2>Choose an Answer</h2>
                    <div id="answer-container">
                        ${question.choices.map((choice, index) => `
                            <button class="answer-btn" data-answer="${choice}" onclick="submitAnswer('${choice}')">${choice}</button>
                        `).join('')}
                    </div>
                    <script>
                        const vscode = acquireVsCodeApi();
    
                        function submitAnswer(answer) {
                            // Disable all buttons after selection
                            const buttons = document.querySelectorAll('.answer-btn');
                            buttons.forEach(btn => {
                                btn.disabled = true;
                                btn.style.opacity = '0.5';
                            });
    
                            // Send the answer to VS Code
                            vscode.postMessage({ answer });
                        }
                    </script>
                </body>
            </html>
        `;
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
