// Get the canvas elements and their contexts
var canvas1 = document.getElementById('canvas1');
var canvas2 = document.getElementById('canvas2');
var ctx1 = canvas1.getContext('2d');
var ctx2 = canvas2.getContext('2d');

// Add event listener to the buttons
document.getElementById('newRandomMatrix').addEventListener('click', newRandomMatrixClick);
document.getElementById('newGCode').addEventListener('click', newGCodeClick);
document.getElementById('resetPrint').addEventListener('click', resetPrint);
document.getElementById('startPrint').addEventListener('click', startPrint);
document.getElementById('moveSpeedInput').addEventListener('input', updateMoveSpeed);
document.getElementById('printSpeedInput').addEventListener('input', updatePrintSpeed);

document.getElementById('matrixSizeXInput').addEventListener('input', updateMatrixSizeX);
document.getElementById('matrixSizeYInput').addEventListener('input', updateMatrixSizeY);
document.getElementById('squareSizeInput').addEventListener('input', updateSquareSize);

// Size of grid, margin, and squares within grid
var margin = 20;
var matrixSizeX = 10;
var matrixSizeY = 10;
var squareSize = 40;
document.getElementById('matrixSizeXInput').value = matrixSizeX;
document.getElementById('matrixSizeYInput').value = matrixSizeY;
document.getElementById('squareSizeInput').value = squareSize;

// Initialize nozzle size and location
var nozzleSizeX = 40;
var nozzleSizeY = 40;
var nozzleX = margin + matrixSizeX * squareSize/2 - nozzleSizeX/2;
var nozzleY = margin + matrixSizeY * squareSize/2 - nozzleSizeY;
var nozzleLocation = [nozzleX, nozzleY];
document.getElementById('nozzleX').textContent = nozzleLocation[0].toFixed(2);
document.getElementById('nozzleY').textContent = nozzleLocation[1].toFixed(2);
var extrusionCounter = 0;
document.getElementById('extrusionCounterDisplay').textContent = extrusionCounter.toFixed(2);
var printedMat;
var drawingMat;

//Initialize move and print speed
var moveSpeed = 200;
var printSpeed = 100;
document.getElementById('moveSpeedInput').value = moveSpeed;
document.getElementById('printSpeedInput').value = printSpeed;

// Initialize gCode variables
let gx = 0;
let gy = 0;
let gE = 0;
let gF = 0;
let gFill = false;

// Initialize stopAnimation flag to false, will be set to true after each G-code finishes
var stopAnimation = false;
var resetFlag = false;

// Load the image of the nozzle
var img = new Image();
img.src = 'nozzle.png'; // Provide the path to your image

// Initialize G-code text
var gCodeArray = [';G-code:\n'];
var textareacontent = ';G-code:\n';

// Utitlity print error function
function printError(message) {
    // Get the existing paragraph element for error messages
    const errorMessageParagraph = document.getElementById('errorMessageParagraph');
    // Append the new error message to the existing content
    errorMessageParagraph.innerHTML += message + '<br>';
}

// Utility delay function
const delay = ms => new Promise(res => setTimeout(res, ms));

// Main function - make it async so await can be used to delay
const mainFunction = async () => {
    // Create matrix of random black and white squares, make black squares fall to bottom
    newRandomMatrixClick();

    // Generate G-code from 1st matrix
    newGCodeClick();

    // Initialize printed grid to the right with picture of nozzle on top, 
    resetPrint();
}
mainFunction();

// Function to generate random matrix of 1s and 0s
function generateEmptyMatrix(xSize, ySize) {
    let mat = [];
    for (let i = 0; i < ySize; i++) { // num rows
        mat[i] = [];
        for (let j = 0; j < xSize; j++) { // num col
            mat[i][j] = 0;
        }
        // mat.push(row);
    }
    return mat;
}

// Function to generate random matrix of 1s and 0s
function generateRandomMatrix(xSize, ySize) {
    let mat = [];
    for (let i = 0; i < ySize; i++) {
        mat.push([]);
        for (var j = 0; j < xSize; j++) {
            mat[i].push(Math.round(Math.random()));
        }
    }
    return mat;
}

// Function to draw the grid based on the matrix
function drawGrid(context, mat, blockSize, color0, color1) {
    context.clearRect(0, 0, context.canvas.width, context.canvas.height);

    for (var i = 0; i < mat.length; i++) { // num rows
        for (var j = 0; j < mat[0].length; j++) { // num columns
            // Set the color based on the value in the matrix
            if (mat[i][j] === 1) {
                context.fillStyle = color1;
            } else {
                context.fillStyle = color0;
            }

            // Draw the square
            context.fillRect(j * blockSize + margin, i * blockSize + margin, blockSize, blockSize);
        }
    }
}

// Function to draw the grid based on the matrix
function drawGridScale(context, mat, blockSize) {
    context.clearRect(0, 0, context.canvas.width, context.canvas.height);
    for (var i = 0; i < mat.length; i++) {
        for (var j = 0; j < mat[0].length; j++) {
            // Set the color based on the value in the matrix
            if (mat[i][j] <= 1) {
                let a = Math.ceil(mat[i][j] * 255)
                let b = 255 - a;
                context.fillStyle = 'rgba(255,' + b + ', ' + b + ', ' + a + ')';
            } else {
                let a = mat[i][j]-1;
                a = Math.ceil(a * 255);
                let b = 255 - a;
                context.fillStyle = 'rgba(' + b + ', 0, 0, 255)';
            }

            // Draw the square
            context.fillRect(j * blockSize + margin, i * blockSize + margin, blockSize, blockSize);
        }
    }
}

// Function to update the grid (move black squares downwards)
function fallingGrid(context, mat, blockSize, color0, color1) {

    var isAnimationComplete = false; // Flag to track animation completion
    
    // Iterate through matrix
    while (!isAnimationComplete) {
        isAnimationComplete = true; // True unless something is changed
        for (var i = mat.length-1; i >= 0; i--) {
            for (var j = 0; j < mat[0].length; j++) {
                // Check if the current square is black and not in the last row
                if (mat[i][j] === 1 && i < mat.length-1) {
                    // Check if there is a black square below or if it's already at the bottom
                    if (mat[i + 1][j] === 0) {
                        // Move the black square downwards
                        mat[i + 1][j] = 1;
                        mat[i][j] = 0;
                        isAnimationComplete = false; // Set the flag to false if a square is moved
                    }
                }
            }
        }
    }   

    // Redraw the grid
    drawGrid(context, mat, blockSize, color0, color1);

}

function generateGCode(matrix) {
    let noFill = 0;
    let fill = 1;
    let totalExtruded = 0;
    
    function printGCode() {
        // Join the array elements into a single string separated by newlines
        textareacontent = gCodeArray.join('');
        // Set the value of the textarea to the content
        document.getElementById('gCode').value = textareacontent;
    }
    printGCode();

    function newGCode(nextXCoord, nextYCoord, fill, totalExtruded) {
        let code = '';
        let speed = 0;
        let new_text = '';
        if (fill == 0) { // if no fill, set code G0 and move faster
            code = 'G0';
            speed = moveSpeed;
            new_text = code + ' X' + nextXCoord + ' Y' + nextYCoord + ' F' + speed + '\n';
        }
        else { // if fill, set code G1 and move slower
            code = 'G1';
            speed = printSpeed;
            new_text = code + ' X' + nextXCoord + ' Y' + nextYCoord + ' F' + speed + ' E' + totalExtruded + '\n';
        }
        return new_text;
    }

    // Iterate through each row of matrix until next black or white square
    let numRows = matrix.length;
    let numCols = matrix[0].length;
    let curVal = 0;
    let arrayIndex = 1;
    let oldJ = 0;
    for (let i = 0; i < numRows; i++) {
        for (let j = 0; j < numCols; j++) {
            if (curVal == 0 && matrix[numRows-i-1][j] == fill) { // move without filling
                curVal = 1;
                gCodeArray[arrayIndex] = newGCode(j*squareSize, i*squareSize, noFill);
                arrayIndex++;
                oldJ = j;      
            }
            else if (curVal == 1 && matrix[numRows-i-1][j] == noFill) {  // move with filling
                curVal = 0;
                totalExtruded += (j-oldJ); //
                gCodeArray[arrayIndex] = newGCode(j*squareSize, i*squareSize, fill, totalExtruded); 
                arrayIndex++;
                oldJ = j;
            }
            if (curVal == 1 && matrix[numRows-i-1][j] == fill && j == (numCols - 1)) {  // move with filling
                curVal = 0;
                totalExtruded += (j + 1 - oldJ); // * squareSize * squareSize;
                gCodeArray[arrayIndex] = newGCode(numCols*squareSize, i*squareSize, fill, totalExtruded);
                arrayIndex++; 
                oldJ = j;
            }
        }
    }   

    printGCode();
}

function getGCodeLine(row) {
    // Reads g-code from web-page, splits into array by row, reads array at specified row
    textareacontent = document.getElementById('gCode').value;
    gCodeArray = textareacontent.split(/(?<=[\n])/g);
    let gCodeLine = gCodeArray[row];
    return gCodeLine;
}

function handleGCode(code) {
    // Read current line of G-code, updates gFill, gX, gY, gF, and gE accordingly
    let char = '';
    let word = '';
    for (let i = 0; i < code.length; i++) {
        char = code[i];
        if (char != ' ' && char != '\n') { //
            word += char;
        }
        else if (char == '\n') { // exit for loop
            i = code.length;
        }
        if (char == ' ' || char == '\n') {
            let key = word[0]; 
            let value = parseInt(word.slice(1)); // value is number after 'key'
            switch(key) {
                case 'G':
                    if (value == 0) {
                    gFill = false;
                    }
                    else if (value == 1) {
                    gFill = true;
                    }                 
                    break;
                case 'X':
                    gx = value;
                    break;
                case 'Y':
                    gy = value;
                    break;
                case 'F':
                    gF = value;
                    break;
                case 'E':
                    gE = value;
                    break;
                default:
                    console.log("Invalid G-code\n");
            }
            word = '';
        }
    }
}

// Function to move the picture in the x direction at a given speed
function movePictureX(context, row) {
    // initialize values before update
    let maxX = matrixSizeX*squareSize; //400
    let minX = 0; //0
    let maxY = (matrixSizeY-1)*squareSize - 20;
    let minY = -20;

    let origx = nozzleLocation[0]; // starts at 220 - nozzleSizeX/2
    let origy = nozzleLocation[1]; // starts at 220 - nozzleSizeY
    let oldx = nozzleLocation[0];
    let oldy = nozzleLocation[1];
    let destx = gx;
    let desty = maxY - gy;
    let dx = destx - oldx;
    let dy = desty - oldy;

    let oldE = extrusionCounter;
    let totaldE = gE - oldE;

    let dist = Math.sqrt(dx*dx+dy*dy);
    let xspeed = 0;
    let yspeed = 0;
    let angle = 0;
    if (dx != 0) { 
        let fract = dy/dx; 
        angle = Math.atan(fract);
        xspeed = Math.abs(gF * Math.cos(angle));
        yspeed = Math.abs(gF * Math.sin(angle));
        if (xspeed > yspeed) {
            yspeed = yspeed/xspeed*gF;
            xspeed = gF;
        }
        else if (xspeed < yspeed) {
            xspeed = xspeed/yspeed*gF;
            yspeed = gF;
        }
        else if (xspeed == yspeed) {
            xspeed = gF;
            yspeed = gF;
        }
 
    }
    else {
        xspeed = 0;
        yspeed = gF;
    }

    let xdir = 1;
    if(dx!=0) { xdir = dx/Math.abs(dx); }
    let ydir = 1;
    if(dy!=0) { ydir = dy/Math.abs(dy); }

    // Update the x and y position at the specified speed

    let fps = 60;
    let framedx = xspeed/fps;
    let expectedFrames = Math.abs(dx/framedx);
    let framedE = totaldE/expectedFrames;
    
    // var stopAnimation = false;
    function updatePrintAnimation() {    
    
        // Move the x and y positions by the speeds
        let newx = oldx + xdir * xspeed/60;
        let newy = oldy + ydir * yspeed/60;
        let newE = oldE + framedE;
        
        // Ensure the x and y positions stay within bounds
        if (destx > origx && newx > destx)   { newx = destx; }
        if (newx > maxX)                    { newx = maxX; }
        if (destx < origx && newx < destx)   { newx = destx; }
        if (newx < minX)                    { newx = minX; }
        if (desty > origy && newy > desty)   { newy = desty; }
        if (newy > maxY)                    { newy = maxY; }
        if (desty < origy && newy < desty)   { newy = desty; }
        if (newy < minY)                    { newy = minY; }

        if (newE > gE) { newE = gE; }

        // printError(dE); 
        let oldXCoord = oldx/squareSize;
        let newXCoord = newx/squareSize; 
        let oldYCoord = oldy/squareSize;
        let startXCoord = Math.floor(oldXCoord);
        let endXCoord = Math.floor(newXCoord);
        let startYCoord = Math.round(oldYCoord);
        let dxCoord = newXCoord - oldXCoord;
        let stepE = 0;
        let stepx = 0;
        
        if (gFill == true) {
            for (let i = startXCoord; i <= endXCoord; i++) {
                if (i == startXCoord) {
                    if (newXCoord > (i+1)) {
                        stepx = i + 1 - oldXCoord;
                    }
                    else {
                        stepx = newXCoord - oldXCoord; 
                    }           
                } 
                else if (i == endXCoord) {
                    stepx = newXCoord - i;
                }
                else {
                    stepx = 1;
                }
                stepE = stepx/dxCoord*framedE;
                
                printedMat[startYCoord][i] = printedMat[startYCoord][i] + stepE;
                if (printedMat[startYCoord][i] > 2) {
                    printedMat[startYCoord][i] = 2;
                }


                if (extrusionCounter + stepE > newE) {
                    stepE = newE - extrusionCounter;
                }
                extrusionCounter += stepE;
                document.getElementById('extrusionCounterDisplay').textContent = extrusionCounter.toFixed(2);
                
                // printError(extrusionCounter);
            }
        }

        // Clear the previous position
        
        
        // Draw the image at the new position
        ctx2.clearRect(0, 0, canvas2.width, canvas2.height);
        drawGridScale(ctx2, printedMat, squareSize);
        ctx2.drawImage(img, newx+20-nozzleSizeX/2, newy+40-nozzleSizeY, nozzleSizeX, nozzleSizeY);

        // stepE = 0;
        oldE = newE;
        oldx = newx;
        oldy = newy;
        nozzleLocation[0] = newx;
        nozzleLocation[1] = newy;
        document.getElementById('nozzleX').textContent = nozzleLocation[0].toFixed(2);
        document.getElementById('nozzleY').textContent = nozzleLocation[1].toFixed(2);

        if (newx == destx && newy == desty) {
            stopAnimation = true;
        }
        
        // If nozzleontinue animation
        if (resetFlag) {
            stopAnimation = false;
        }
        else if (stopAnimation) {
            stopAnimation = false;
            row++;         
            if (row<gCodeArray.length) {
                // Retrieve G-code at current line
                let gcode1 = getGCodeLine(row);

                // Read current line of G-code, change values accordingly
                handleGCode(gcode1);

                movePictureX(ctx2, row);
            }
        }
        else if (!stopAnimation && !resetFlag) {
            requestAnimationFrame(updatePrintAnimation);
        }      
    }

    updatePrintAnimation();
}

// Function to handle button click event
function newRandomMatrixClick() {
    // Generate a new random matrix with dimensions 10x10
    drawingMat = generateRandomMatrix(matrixSizeX, matrixSizeY);
    // Draw the new matrix on the canvas
    drawGrid(ctx1, drawingMat, squareSize, 'white', 'black');
    fallingGrid(ctx1, drawingMat, squareSize, 'white', 'black');
}

// Function to handle button click event
function newGCodeClick() {
    gCodeArray = [';G-code:\n'];
    generateGCode(drawingMat);
}

async function resetPrint() {
    resetFlag = true;
    extrusionCounter = 0;
    document.getElementById('extrusionCounterDisplay').textContent = extrusionCounter.toFixed(2);
    await delay(100);
    printedMat = generateEmptyMatrix(10,10);
    drawGrid(ctx2, printedMat, squareSize, "white", "black");
    ctx2.drawImage(img, (nozzleLocation[0]), (nozzleLocation[1]), nozzleSizeX, nozzleSizeY); // Specify the position and size of the image
}

async function startPrint() {
    printError("Starting print");
    resetFlag = true;
    extrusionCounter = 0;
    document.getElementById('extrusionCounterDisplay').textContent = extrusionCounter.toFixed(2);
    await delay(100);
    resetFlag = false;

    // Retrieve G-code at current line
    let row = 1;
    let gcode1 = getGCodeLine(row);

    // Read current line of G-code, change values accordingly
    handleGCode(gcode1);

    // Move nozzle according to g-code
    movePictureX(ctx2, row);

}

// Function to update move speed from input
function updateMoveSpeed() {
    moveSpeed = document.getElementById('moveSpeedInput').value;
}

// Function to update print speed from input
function updatePrintSpeed() {
    printSpeed = document.getElementById('printSpeedInput').value;
}

function updateMatrixSizeX() {
    matrixSizeX = document.getElementById('matrixSizeXInput').value;
}

function updateMatrixSizeY() {
    matrixSizeY = document.getElementById('matrixSizeYInput').value;
}

function updateSquareSize() {
    squareSize = document.getElementById('squareSizeInput').value;
}