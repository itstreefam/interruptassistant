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
    
        // // Listen for messages from the webview
        // panel.webview.onDidReceiveMessage(message => {
        //     if (message.answer) {
        //         const userAnswer = message.answer.trim();
        //         const currentQuestion = this.questions[this.currentProblemIndex];
    
        //         // Check if the answer is correct
        //         const isCorrect = userAnswer === currentQuestion.correct_answer;
        //         this.correctAnswers += isCorrect ? 1 : 0;
    
        //         console.log(`Question ${this.currentProblemIndex + 1}: Received answer: ${userAnswer}, Correct: ${isCorrect}`);
    
        //         // Move to the next question or finish the task
        //         if (this.currentProblemIndex < this.questions.length - 1) {
        //             this.currentProblemIndex++;
        //             this.showNextQuestion(panel); // Replace HTML for the next question
        //         } else {
        //             console.log("All questions answered. Finishing interruption.");
        //             this.finishInterruption(panel, onComplete);
        //         }
        //     }
        // });

        // panel.webview.onDidReceiveMessage(message => {
        //     if (message.answers) {
        //         console.log("Received answers:", message.answers);
    
        //         const { answer1, answer2, answer3, answer4 } = message.answers;
        //         console.log(`Answer 1: ${answer1}, Answer 2: ${answer2}, Answer 3: ${answer3}, Answer 4: ${answer4}`);
    
        //         // End the interruption after submission
        //         this.finishInterruption(panel, onComplete);
        //     }
        // });

        panel.webview.onDidReceiveMessage(message => {
            if (message.answers) {
                console.log("Received answers:", message.answers);
                this.questionsAndAnswers.push({
                    problem: this.questions[this.currentProblemIndex],
                    answers: message.answers
                });
                this.currentProblemIndex++;
                if (this.currentProblemIndex < this.totalProblems) {
                    this.showNextQuestion(panel);
                } else {
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

    // showNextQuestion(panel) {
    //     const question = this.questions[this.currentProblemIndex];
    //     console.log("Displaying question:", question); // Debug log
    
    //     // Replace the webview content entirely
    //     panel.webview.html = this.getWebviewContent(question);
    // }   
    
    showNextQuestion(panel) {
        const problem = this.questions[this.currentProblemIndex];
        panel.webview.html = this.getWebviewContent(problem);
    }
    
    // getWebviewContent() {
    //     return `
    //         <html>
    //             <head>
    //                 <style>
    //                     body {
    //                         font-family: Arial, sans-serif;
    //                         margin: 20px;
    //                         padding: 20px;
    //                         background-color: #f9f9f9;
    //                         color: #333;
    //                         border: 1px solid #ccc;
    //                         border-radius: 10px;
    //                     }
    //                     h1 {
    //                         text-align: center;
    //                         font-size: 1.5em;
    //                         margin-bottom: 20px;
    //                     }
    //                     .container {
    //                         display: flex;
    //                         flex-direction: row;
    //                         justify-content: space-between;
    //                         gap: 20px;
    //                     }
    //                     .column {
    //                         flex: 1;
    //                         border: 1px solid #ccc;
    //                         border-radius: 10px;
    //                         padding: 20px;
    //                         background-color: #fff;
    //                     }
    //                     .snippet {
    //                         border: 1px solid #999;
    //                         background-color: #eee;
    //                         height: 150px;
    //                         text-align: center;
    //                         line-height: 150px;
    //                         font-size: 1em;
    //                         margin-bottom: 20px;
    //                         border-radius: 5px;
    //                     }
    //                     .question {
    //                         margin-bottom: 10px;
    //                         font-size: 0.9em;
    //                     }
    //                     input {
    //                         width: 100%;
    //                         padding: 8px;
    //                         font-size: 0.9em;
    //                         margin-bottom: 20px;
    //                         border: 1px solid #ccc;
    //                         border-radius: 5px;
    //                     }
    //                     button {
    //                         background-color: #007acc;
    //                         color: white;
    //                         border: none;
    //                         border-radius: 5px;
    //                         padding: 10px 20px;
    //                         font-size: 1em;
    //                         cursor: pointer;
    //                         margin-top: 10px;
    //                         display: block;
    //                         width: 100%;
    //                         text-align: center;
    //                         transition: background-color 0.3s ease;
    //                     }
    //                     button[disabled] {
    //                         background-color: #cccccc;
    //                         cursor: not-allowed;
    //                     }
    //                     button:hover:not([disabled]) {
    //                         background-color: #005a9e;
    //                     }
    //                 </style>
    //             </head>
    //             <body>
    //                 <h1>Code Comprehension Task</h1>
    //                 <p>Two solutions are provided as below to solve the same question:</p>
    //                 <div class="container">
    //                     <div class="column">
    //                         <h2>Solution 1</h2>
    //                         <div class="snippet">Code Snippet 1</div>
    //                         <div class="question">1. For input X, what is the output?</div>
    //                         <input type="text" id="answer1" placeholder="Answer here" oninput="checkInputs()">
    //                         <div class="question">2. For input Y, what is the output?</div>
    //                         <input type="text" id="answer2" placeholder="Answer here" oninput="checkInputs()">
    //                     </div>
    //                     <div class="column">
    //                         <h2>Solution 2</h2>
    //                         <div class="snippet">Code Snippet 2</div>
    //                         <div class="question">3. What is the time complexity for Solution 1?</div>
    //                         <input type="text" id="answer3" placeholder="Answer here" oninput="checkInputs()">
    //                         <div class="question">4. What is the time complexity for Solution 2?</div>
    //                         <input type="text" id="answer4" placeholder="Answer here" oninput="checkInputs()">
    //                     </div>
    //                 </div>
    //                 <button id="submitButton" onclick="submitAnswers()" disabled>Submit</button>
    //                 <script>
    //                     const vscode = acquireVsCodeApi();
    
    //                     // Enable the submit button only if all fields are filled
    //                     function checkInputs() {
    //                         const answer1 = document.getElementById('answer1').value.trim();
    //                         const answer2 = document.getElementById('answer2').value.trim();
    //                         const answer3 = document.getElementById('answer3').value.trim();
    //                         const answer4 = document.getElementById('answer4').value.trim();
    
    //                         const allFilled = answer1 && answer2 && answer3 && answer4;
    //                         document.getElementById('submitButton').disabled = !allFilled;
    //                     }
    
    //                     function submitAnswers() {
    //                         const answer1 = document.getElementById('answer1').value.trim();
    //                         const answer2 = document.getElementById('answer2').value.trim();
    //                         const answer3 = document.getElementById('answer3').value.trim();
    //                         const answer4 = document.getElementById('answer4').value.trim();
    
    //                         vscode.postMessage({
    //                             answers: {
    //                                 answer1,
    //                                 answer2,
    //                                 answer3,
    //                                 answer4
    //                             }
    //                         });
    //                     }
    //                 </script>
    //             </body>
    //         </html>
    //     `;
    // }    

    generateQuestionsHtml(questions) {
        return questions.map((q, i) => `
            <div class="question">
                <p>${q.question}</p>
                <input type="text" placeholder="Answer ${i + 1}" />
            </div>
        `).join('');
    }    

    getWebviewContent(problem) {
        const solutions = Object.values(problem.solutions);
        const hasTwoSnippets = solutions.length > 1;
        return `
            <html>
                <head>
                    <style>
                        body {
                            font-family: Arial, sans-serif;
                            margin: 20px;
                            padding: 20px;
                            background-color: #f9f9f9;
                            color: #333;
                        }
                        .container {
                            display: ${hasTwoSnippets ? 'flex' : 'block'};
                            justify-content: space-between;
                            gap: 20px;
                        }
                        .column {
                            flex: 1;
                            border: 1px solid #ccc;
                            padding: 20px;
                            background-color: #fff;
                        }
                        .snippet {
                            background: #eee;
                            padding: 10px;
                            margin-bottom: 20px;
                            border: 1px solid #ccc;
                            white-space: pre-wrap;
                        }
                        .question {
                            margin-top: 10px;
                        }
                        input {
                            width: 100%;
                            margin-top: 5px;
                            padding: 8px;
                        }
                        button {
                            margin-top: 20px;
                            padding: 10px;
                            background-color: #007acc;
                            color: white;
                            border: none;
                            cursor: pointer;
                            transition: background-color 0.3s;
                        }
                        button:disabled {
                            background-color: #ccc;
                            cursor: not-allowed;
                        }
                    </style>
                </head>
                <body>
                    <h1>Code Comprehension Task</h1>
                    <div class="container">
                        <div class="column">
                            <h2>Solution 1</h2>
                            <div class="snippet">${solutions[0].code}</div>
                            ${this.generateQuestionsHtml(problem.questions.slice(0, 2))}
                        </div>
                        ${hasTwoSnippets ? `
                        <div class="column">
                            <h2>Solution 2</h2>
                            <div class="snippet">${solutions[1].code}</div>
                            ${this.generateQuestionsHtml(problem.questions.slice(2))}
                        </div>` : ''}
                    </div>
                    <button id="submitButton" disabled>Submit</button>
                    <script>
                        const vscode = acquireVsCodeApi();
                        document.querySelectorAll('input').forEach(input => {
                            input.addEventListener('input', () => {
                                const allFilled = Array.from(document.querySelectorAll('input'))
                                    .every(input => input.value.trim() !== '');
                                document.getElementById('submitButton').disabled = !allFilled;
                            });
                        });
                        document.getElementById('submitButton').addEventListener('click', () => {
                            const answers = Array.from(document.querySelectorAll('input'))
                                .map(input => input.value.trim());
                            vscode.postMessage({ answers });
                        });
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
