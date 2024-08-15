const vscode = require('vscode');

class InterruptionTask {
    constructor(context, interruptionManager) {
        this.context = context;
        this.interruptionManager = interruptionManager;
        this.currentProblemIndex = 0;
        this.totalProblems = 10;
        this.correctAnswers = 0;
        this.timer = null;
    }

    startInterruption() {
        // Create a web panel that spans the entire screen
        const panel = vscode.window.createWebviewPanel(
            'interruptassistant',
            'Interrupting Task',
            vscode.ViewColumn.One,
            {
                enableScripts: true
            }
        );

        this.startTimer(panel); // Start the 2-minute timer

        // Set the web panel's html content to the first math equation
        this.showNextProblem(panel);

        // Handle the user's submitted answer
        panel.webview.onDidReceiveMessage(message => {
            console.log(message);
            const isCorrect = this.checkAnswer(message.answer);
            this.correctAnswers += isCorrect ? 1 : 0;

            if (this.currentProblemIndex < this.totalProblems - 1) {
                this.currentProblemIndex++;
                this.showNextProblem(panel); // Show the next problem
            } else {
                this.finishInterruption(panel); // Finish when all problems are done
            }
        });

        // Log when the web panel is disposed (closed)
        panel.onDidDispose(() => {
            console.log('Webview was disposed');
            clearTimeout(this.timer); // Clear the timer if the panel is manually closed
            console.log('Resuming monitoring...');
        });
    }

    startTimer(panel) {
        this.timer = setTimeout(() => {
            console.log('Time is up!');
            this.finishInterruption(panel);
        }, 2 * 60 * 1000); // 2-minute timer
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
    
                        span {
                            font-size: 5em;
                            margin-right: 0.5em;
                        }
    
                        input {
                            font-size: 5em;
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
    
                        button:hover {
                            background-color: #005A99;
                        }
    
                        button:active {
                            background-color: #003D66;
                        }
                    </style>
                </head>
                <body>
                    <div id="container">
                        <span>${equation} =</span>
                        <input type="number" id="answer" />
                        <br>
                        <button onclick="submitAnswer()">Submit</button>
                    </div>
                </body>
                <script>
                    const vscode = acquireVsCodeApi();
    
                    function submitAnswer() {
                        const answer = document.getElementById('answer').value;
                        if (answer === '' || isNaN(answer)) {
                            alert('Please enter a valid number.');
                        } else {
                            vscode.postMessage({ answer: parseInt(answer) });
                        }
                    }
    
                    document.getElementById('answer').focus();
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

    finishInterruption(panel) {
        panel.dispose(); // Close the panel
        vscode.window.showInformationMessage(`Interruption complete. You answered ${this.correctAnswers} out of ${this.totalProblems} correctly.`);
    }
}

module.exports = InterruptionTask;
