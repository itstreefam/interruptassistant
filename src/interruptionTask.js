const vscode = require('vscode');
const fs = require('fs');
const path = require('path');
const activeWindow = require('active-win');
const os = require('os');
const cp = require('child_process');


class InterruptionTask {
    constructor(context, interruptionManager) {
        this.context = context;
        this.interruptionManager = interruptionManager;
        this.correctAnswers = 0;

        this.timer = null;

        this.startTime = null;
        this.questionsAndAnswers = []; // store questions and answers
        this.editEvents = {lastEditBefore: null, firstEditAfter: null};
        this.stateSaved = false;
        this.loadQuestions();
        this.shownQuestions = new Set();
        this.currentRange = 0;

        // track edit events
        this.editTracker = vscode.workspace.onDidChangeTextDocument((event) => {
            this.trackEditEvents(event);
        });

        this.context.subscriptions.push(this.editTracker);
        this.isInterruptionOngoing = false;

        this.allEditEvents = [];
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
            console.log("Current working directory:", cwd);

            const datasetPath = path.resolve(this.context.extensionPath, 'ultimate_code_comprehension_set.json');

            let data = fs.readFileSync(datasetPath, 'utf-8');

            // Split the data into lines and parse each line
            const lines = data.split('\n').filter(line => line.trim() !== '');
            this.questions = lines.map(line => JSON.parse(line));

            let filteredQuestions = [];

            // filter the questions that have at most 25 lines of code
            for (let item of this.questions) {
                // split item.question by \n
                // if the length of the split is less than 25, keep the question
                // else, remove the question
                let question = item.question;
                let lines = question.split('\n');
                if (lines.length <= 25) {
                    filteredQuestions.push(item);
                }
            }

            this.questions = filteredQuestions;
            
            // console.log("Questions loaded successfully. Total questions:", filteredQuestions.length);
            // console.log("Questions loaded successfully. Total questions:", this.questions.length);
        } catch (error) {
            console.error("Error loading questions:", error.message);
            vscode.window.showErrorMessage(`Failed to load questions: ${error.message}`);
        }
    }

    getRandomQuestion(rangeStart, rangeEnd) {
        let question;
        do {
            const randomIndex = Math.floor(Math.random() * (rangeEnd - rangeStart + 1)) + rangeStart;
            question = this.questions[randomIndex];
        } while (this.shownQuestions.has(question));
        this.shownQuestions.add(question);
        return question;
    }

    alternateQuestion() {
        let midPoint = Math.floor(this.questions.length / 2);
        if (this.currentRange === 0) {
            this.currentRange = 1;
            return this.getRandomQuestion(midPoint, this.questions.length - 1);
        } else {
            this.currentRange = 0;
            return this.getRandomQuestion(0, midPoint - 1);
        }
    }

    trackEditEvents(event) {
        try{
            let document = event.document.fileName;

            // grab the end file name
            let split = document.split('\\');
            document = split[split.length - 1];

            let currentTime = Math.floor(Date.now() / 1000);

            let editEvent = {
                timestamp: currentTime,
                fileName: document,
                changes: event.contentChanges.map(change => change.text)
            };

            this.allEditEvents.push(editEvent);
        } catch (error) {
            console.error("Error tracking edit events:", error.message);
        }
    }

    async startInterruption(onComplete) {
        this.stateSaved = false;
        this.isInterruptionOngoing = true;
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

            // Get all open windows
            const allWindows = activeWindow.getOpenWindowsSync();

            for (let app of allWindows){
                let appName = app.owner.name.toLocaleLowerCase();
                let pid = app.owner.processId;

                if(appName.includes('chrome')){
                    this.closeApplication(pid);
                }
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
    
        panel.webview.onDidReceiveMessage(message => {
            if (message.answer) {
                const userAnswer = message.answer.trim();
                const question = this.lastQuestion; // Reference the last displayed question
    
                // Check if the answer is correct
                const isCorrect = userAnswer === question.correct_answer;
                this.correctAnswers += isCorrect ? 1 : 0;
    
                console.log(`User answered: ${userAnswer}, Correct: ${isCorrect}`);
    
                // Log the response
                this.logResponse(question, userAnswer, isCorrect);
            }
    
            if (message.action === 'nextQuestion') {
                console.log("Proceeding to the next question...");
                this.showNextQuestion(panel);
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
            this.finishInterruption(panel, onComplete);
        }, 5 * 60 * 1000);
    }

    logResponse(question, userAnswer, isCorrect) {
        this.questionsAndAnswers.push({
            question: question.question,
            userAnswer: userAnswer,
            correctAnswer: question.correct_answer,
            isCorrect: isCorrect,
            timestamp: new Date().toISOString()
        });
        console.log(`Logged response for question: ${question.question}`);
    }
    

    showNextQuestion(panel) {
        const question = this.alternateQuestion(); // Fetch the next question based on alternating ranges
        this.lastQuestion = question; // Keep track of the current question for logging and validation
        console.log(`Displaying question: ${question.question}`);
        panel.webview.html = this.getWebviewContent(question); // Update the webview content
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
                        .answer-btn.selected {
                            background-color: #005a9e;
                            border: 2px solid #ffffff;
                        }
                        .submit-btn {
                            margin-top: 20px;
                            padding: 10px 20px;
                            background-color: gray;
                            color: white;
                            border: none;
                            border-radius: 5px;
                            cursor: not-allowed;
                            font-size: 1em;
                        }
                        .submit-btn.active {
                            background-color: #007acc;
                            cursor: pointer;
                        }
                    </style>
                </head>
                <body>
                    <h1>Question</h1>
                    <pre>${question.question.replace(/\n/g, '<br>')}</pre>
                    <h2>Choose an Answer</h2>
                    <div id="answer-container">
                        ${question.choices.map((choice, index) => `
                            <button class="answer-btn" id="choice-${index}" onclick="selectAnswer('${choice.replace(/'/g, "\\'")}', 'choice-${index}')">${choice}</button>
                        `).join('')}
                    </div>
                    <button id="submit-btn" class="submit-btn" onclick="submitAnswer()" disabled>Submit</button>
                    <script>
                        const vscode = acquireVsCodeApi();
                        let selectedAnswer = null;
    
                        function selectAnswer(answer, buttonId) {
                            selectedAnswer = answer;
    
                            // Highlight the selected button and reset others
                            document.querySelectorAll('.answer-btn').forEach(btn => {
                                btn.classList.remove('selected');
                            });
                            document.getElementById(buttonId).classList.add('selected');
    
                            // Enable the submit button
                            const submitBtn = document.getElementById('submit-btn');
                            submitBtn.disabled = false;
                            submitBtn.classList.add('active');
                        }
    
                        function submitAnswer() {
                            if (selectedAnswer) {
                                vscode.postMessage({ answer: selectedAnswer });
                                
                                // Disable interactions after submission
                                document.querySelectorAll('.answer-btn').forEach(btn => btn.disabled = true);
                                const submitBtn = document.getElementById('submit-btn');
                                submitBtn.disabled = true;
                                submitBtn.innerText = "Submitted";
    
                                // Notify backend to move to the next question
                                setTimeout(() => {
                                    vscode.postMessage({ action: 'nextQuestion' });
                                }, 500);
                            }
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

        this.isInterruptionOngoing = false;
    
        // Save the end time of the interruption
        this.endTime = Math.floor(Date.now() / 1000);
    
        vscode.window.showInformationMessage(`Interruption complete. You answered ${this.correctAnswers} questions correctly.`);
    
        const interruptionData = {
            startTime: this.startTime,
            endTime: this.endTime,
            totalQuestionsAnswered: this.questionsAndAnswers.length,
            correctAnswers: this.correctAnswers,
            responses: this.questionsAndAnswers,
            editEvents: this.allEditEvents
        };
    
        const interruptionDataString = JSON.stringify(interruptionData);
        console.log("Interruption data:", interruptionDataString);
    
        // Resolve path to save the interruption log
        const cwd = this.getCwd();
        const interruptionLogsPath = path.join(cwd, 'CH_cfg_and_logs', 'interruptionLogs.json');
    
        // Attempt to save the data
        fs.appendFile(interruptionLogsPath, interruptionDataString + '\n', (err) => {
            if (err) {
                console.error("Error saving interruption data:", err);
                vscode.window.showErrorMessage("Failed to save interruption data.");
            } else {
                console.log("Interruption data saved successfully.");
            }
    
            // Dispose the panel regardless of the logging result
            panel.dispose();
    
            // Notify InterruptionManager of completion
            if (onComplete) onComplete();
    
            // Reset the state
            this.resetState();
        });

        // close vscode editors (but not the tab that has Webview)
        vscode.window.tabGroups.all.forEach(group => {
            group.tabs
            .filter(tab => !tab.label.includes('Webview'))
            .forEach(tab => {
                try {
                    // Use safer closing method
                    vscode.window.tabGroups.close(tab);
                    console.log(`Closed editor: ${tab.label}`);
                } catch (closeErr) {
                    // More detailed error handling
                    if (closeErr.message.includes('Invalid tab')) {
                        console.warn(`Tab already closed or invalid: ${tab.label}`);
                    } else {
                        console.error(`Unexpected error closing tab ${tab.label}:`, closeErr);
                    }
                }
            });
        });
    }    

    resetState() {
        this.currentProblemIndex = 0;
        this.correctAnswers = 0;
        clearTimeout(this.timer);
        this.timer = null;

        // Preserve questionsAndAnswers and editEvents for logging
        this.questionsAndAnswers = [];
        this.editEvents = { lastEditBefore: null, firstEditAfter: null };
        this.allEditEvents = [];
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

    // function to close chrome browser for respective os system
    closeApplication(pid){
        let platform = os.platform();

        switch(platform){
            case 'win32':
                cp.exec(`taskkill /PID ${pid} /F`);
                break;
            case 'darwin':
                cp.exec(`kill -9 ${pid}`);
                break;
            case 'linux':
                cp.exec(`kill -9 ${pid}`);
                break;
        }
    }
}

module.exports = InterruptionTask;
