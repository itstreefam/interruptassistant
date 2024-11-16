const vscode = require('vscode');

class InterruptionTask {
    constructor(context, interruptionManager) {
        this.context = context;
        this.interruptionManager = interruptionManager;
        this.currentProblemIndex = 0;
        this.totalProblems = 10; // Number of questions in each interruption
        this.correctAnswers = 0;
        this.timer = null;
    }

    // startInterruption(onComplete) {
    //     // Save the current workspace before starting the interruption
    //     // And then close all editors
    //     vscode.commands.executeCommand('workbench.action.files.saveAll').then(() => {
    //         vscode.commands.executeCommand('workbench.action.closeAllEditors');
    //     });

    //     // Create a new webview panel for the interruption task
    //     const panel = vscode.window.createWebviewPanel(
    //         'interruptassistant',
    //         'Interrupting Task',
    //         vscode.ViewColumn.One,
    //         { enableScripts: true }
    //     );

    //     this.startTimer(panel, onComplete);
    //     this.showNextProblem(panel); // Display the first math problem

    //     // Listen for messages from the webview
    //     panel.webview.onDidReceiveMessage(message => {
    //         const isCorrect = this.checkAnswer(message.answer);
    //         this.correctAnswers += isCorrect ? 1 : 0;

    //         if (this.currentProblemIndex < this.totalProblems - 1) {
    //             this.currentProblemIndex++;
    //             this.showNextProblem(panel); // Show the next problem
    //         } else {
    //             this.finishInterruption(panel, onComplete); // Finish when all problems are answered
    //         }
    //     });

    //     panel.onDidDispose(() => {
    //         console.log("Webview was disposed before completion.");
    //         clearTimeout(this.timer); // Clear the timer if the panel is closed early

    //         // // Reschedule the next interruption immediately since this one was not completed
    //         this.interruptionManager.isInterruptionActive = false; // Reset active flag
    //         this.interruptionManager.scheduleNextInterruption();
            
    //         // this.interruptionManager.triggerInterruption(); // Immediately trigger another interruption
    //     });
    // }

    startInterruption(onComplete) {
        console.log("Starting interruption: saving files and closing editors.");
    
        // Save all files
        // vscode.commands.executeCommand('workbench.action.files.saveAll').then(() => {
        //     // Close all editors
        //     return vscode.commands.executeCommand('workbench.action.closeAllEditors');
        // }).then(() => {
        //     // Once all editors are closed, create the interruption panel
        //     console.log("Files saved and editors closed. Opening interruption panel...");
    
        //     const panel = vscode.window.createWebviewPanel(
        //         'interruptassistant',
        //         'Interrupting Task',
        //         vscode.ViewColumn.One,
        //         { enableScripts: true }
        //     );
    
        //     this.setupInterruptionPanel(panel, onComplete);
        // }).catch(err => {
        //     console.error("Error during interruption setup:", err);
        // });

        // Save all files
        vscode.commands.executeCommand('workbench.action.files.saveAll').then(() => {
            const panel = vscode.window.createWebviewPanel(
                'interruptassistant',
                'Interrupting Task',
                vscode.ViewColumn.One,
                { enableScripts: true }
            );
    
            this.setupInterruptionPanel(panel, onComplete);
        }).catch(err => {
            console.error("Error during interruption setup:", err);
        });
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
            console.log("Interruption panel was disposed before completion.");
            this.resetState(); // Reset state if the panel is closed early
            this.interruptionManager.isInterruptionActive = false; // Reset active flag
            this.interruptionManager.scheduleNextInterruption(); // Retry interruption immediately
        });
    }

    startTimer(panel, onComplete) {
        this.timer = setTimeout(() => {
            console.log("Interruption time limit reached.");
            this.finishInterruption(panel, onComplete); // Automatically finish after 3 minutes
        }, 3 * 60 * 1000);
    }

    showNextProblem(panel) {
        const multiplicand1 = this.generateRandomDoubleDigit();
        const multiplicand2 = this.generateRandomDoubleDigit();
        const equation = `${multiplicand1} x ${multiplicand2}`;
        
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
        panel.dispose();
        // vscode.window.showInformationMessage(`Interruption complete. You answered ${this.correctAnswers} out of ${this.totalProblems} correctly.`);

        this.resetState();

        // Notify InterruptionManager of valid interruption completion
        if (onComplete) onComplete();
    }

    resetState() {
        this.currentProblemIndex = 0;
        this.correctAnswers = 0;
        clearTimeout(this.timer);
        this.timer = null;
    }
}

module.exports = InterruptionTask;
