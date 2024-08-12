const vscode = require('vscode');

class InterruptionTask {
    constructor(context) {
        this.context = context;
    }

    startInterruption() {
        // make a web panel that spans the entire screen
        const panel = vscode.window.createWebviewPanel(
            'interruptassistant',
            'Interrupting Task',
            vscode.ViewColumn.One,
            {
                enableScripts: true
            }
        );

        // set the web panel's html content to be a math equation 56 x 23
        panel.webview.html = this.getWebviewContent();

        // when the user submits their answer, check if it is correct and show a message box
        panel.webview.onDidReceiveMessage(message => {
            console.log(message);
            const isCorrect = this.checkAnswer(message.answer);
            this.showResultMessage(isCorrect);
        });

        // when the web panel is disposed, log a message to the console
        panel.onDidDispose(() => {
            console.log('Webview was disposed');
        });
    }

    // make the equation as large as possible in the middle of the screen followed by "=" and an input field
    getWebviewContent() {
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
                        <span>56 x 23 =</span>
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
      

    // get the correct answer to the math equation
    getCorrectAnswer() {
        return 56 * 23;
    }

    // check if the user's input is correct
    checkAnswer(userAnswer) {
        return userAnswer === this.getCorrectAnswer();
    }

    // show a message box with the result of the user's input
    showResultMessage(isCorrect) {
        if (isCorrect) {
            vscode.window.showInformationMessage('Correct!');
        } else {
            vscode.window.showInformationMessage('Incorrect. Please try again.');
        }
    }
}

module.exports = InterruptionTask;