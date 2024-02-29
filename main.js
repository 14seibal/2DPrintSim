// Get the canvas elements and their contexts
var canvas1 = document.getElementById('canvas1');
var canvas2 = document.getElementById('canvas2');
var canvas3 = document.getElementById('canvas3');
var ctx1 = canvas1.getContext('2d');
var ctx2 = canvas2.getContext('2d');

// Size of grid, margin, and squares within grid
var margin = 20;
var matrixSizeX = 10;
var matrixSizeY = 10;
var squareSize = 40;

// Initialize nozzle size and location
var nozzleSizeX = 40;
var nozzleSizeY = 40;
var nozzleX = margin + matrixSizeX * squareSize/2 - nozzleSizeX/2;
var nozzleY = margin + matrixSizeY * squareSize/2 - nozzleSizeY;
var nozzleLocation = [nozzleX, nozzleY];
var extrusionCounter = 0;
var printedMat;

// Initialize stopAnimation flag to false, will be set to true after each G-code finishes
var stopAnimation = false;

// Load the image of the nozzle
var img = new Image();
img.src = 'nozzle.png'; // Provide the path to your image

// Initialize G-code text
var text = ';G-code:\n';
var gCodeArray = [';G-code:\n'];

// Utitlity print error function
const message = document.createElement('pre');
function printError(textToDisplay) {
    message.textContent = textToDisplay;
    document.body.appendChild(message);
}

// Utility delay function
const delay = ms => new Promise(res => setTimeout(res, ms));

// Main function - make it async so await can be used to delay
const mainFunction = async () => {
    // Create matrix of random black and white squares, make black squares fall to bottom
    matrix = generateRandomMatrix(matrixSizeX, matrixSizeY);
    drawGrid(ctx1, matrix, squareSize, 'white', 'black');
    await delay(1000);
    while(!fallingGrid(ctx1, matrix, squareSize, 'white', 'black')) { await delay(100);} // Push black squares down until none are floating, wait 100ms each iteration
    await delay(1000);

    // Generate G-code from 1st matrix
    generateGCode(matrix);
    await delay(1000);

    // Initialize printed grid to the right with picture of nozzle on top, 
    printedMat = generateEmptyMatrix(10,10);
    drawGrid(ctx2, printedMat, squareSize, "white", "black");
    ctx2.drawImage(img, (nozzleLocation[0]), (nozzleLocation[1]), nozzleSizeX, nozzleSizeY); // Specify the position and size of the image
    await delay(1000);

    // printedMat = generateEmptyMatrix(10,10);
    // Move the nozzle according to the g-code
    // printError(gCodeArray.length);
    for (let i = 1; i < gCodeArray.length; i++) {
        // let row = 1;
        // printError(i);
        movePictureX(ctx2, i);
        while(!stopAnimation){ await delay(0);} // delay allows movePicture code to run while waiting
        // await delay(2000);
        stopAnimation = false;
        await delay(100);
    }

    // printedMat = generateEmptyMatrix(10,10);
    // drawGridScale(ctx3, printedMat, 4, 'rgba(0, 0, 0, 0)', 'rgb(255, 100, 100)');
    // while(!fallingGrid(ctx3, printedMat, 4, 'rgba(0, 0, 0, 0)', 'rgb(255, 100, 100)')) { await delay(50);}



}
mainFunction();

// Function to generate random matrix of 1s and 0s
function generateEmptyMatrix(xSize, ySize) {
    let mat = [];
    for (var i = 0; i < xSize; i++) {
        mat[i] = [];
        for (var j = 0; j < ySize; j++) {
            mat[i][j] = 0;
        }
        // mat.push(row);
    }
    return mat;
}

// Function to generate random matrix of 1s and 0s
function generateRandomMatrix(xSize, ySize) {
    var matrix = [];
    for (var i = 0; i < xSize; i++) {
        matrix.push([]);
        for (var j = 0; j < ySize; j++) {
            matrix[i].push(Math.round(Math.random()));
        }
    }
    return matrix;
}

// Function to draw the grid based on the matrix
function drawGrid(context, mat, blockSize, color0, color1) {
    context.clearRect(0, 0, context.canvas.width, context.canvas.height);

    for (var i = 0; i < mat.length; i++) {
        for (var j = 0; j < mat[0].length; j++) {
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

    var isAnimationComplete = true; // Flag to track animation completion
    
    // Iterate through matrix
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

    // Redraw the grid
    drawGrid(context, mat, blockSize, color0, color1);

    // Check if animation is complete (all black squares reached the bottom)
    if (isAnimationComplete) {
        // printError("resolved");
        return true;
    }
    else {
        // Continue animation (return false so the main function re-enters this function)
        return false;
    }
}

function generateGCode(matrix) {
    let noFill = 0;
    let fill = 1;
    let speed0 = 200;
    let speed1 = 100;
    let totalExtruded = 0;

    // Data to write to the file
    // var text = ';G-code:\n';

    // Create a <pre> element to display the data, append the <pre> element to the body
    const pre = document.createElement('pre');
    // pre.textContent = text;
    pre.textContent = gCodeArray;
    document.body.appendChild(pre);

    function newGCode(nextXCoord, nextYCoord, fill, totalExtruded) {
        let code = '';
        let speed = 0;
        let new_text = '';
        if (fill == 0) { // if no fill, set code G0 and move faster
            code = 'G0';
            speed = speed0;
            new_text = code + ' X' + nextXCoord + ' Y' + nextYCoord + ' F' + speed + '\n';
        }
        else { // if fill, set code G1 and move slower
            code = 'G1';
            speed = speed1;
            new_text = code + ' X' + nextXCoord + ' Y' + nextYCoord + ' F' + speed + ' E' + totalExtruded + '\n';
        }

        // add new line of G-code
        // let new_text = code + ' X' + nextXCoord + ' Y' + nextYCoord + ' F' + speed + '\n';
        text += new_text;
        // pre.textContent = text;
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
                totalExtruded += (j-oldJ); // * squareSize * squareSize;
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
    // pre.textContent = text;
    pre.textContent = gCodeArray;
}

// Function to move the picture in the x direction at a given speed
async function movePictureX(context, row) {

    // initialize defaults
    let gx = 1;
    let gy = 1;
    let gE = extrusionCounter;
    let gspeed = 1;
    let gfill = true;

    // let gcode1 = parseGCodeFile();
    // let gcode1 = "G0 X0 Y0 F100\n";

    function parseGCodeFile(line) {
        let word = '';
        let char = '';
        let index = 0;
        for (let n = 0; n <= line; n++) {
            for(let i = index; i < text.length; i++) { // start at index where previous read ended
                char = text[i];
                index++;
                word += char;
                if(char == '\n') {
                    i = text.length;
                }
            }
            if (n != line) {
                word = '';
            }
        }
        return word;
    }
  
    // gcode1 = parseGCodeFile(row);
    gcode1 = gCodeArray[row];

    let char = '';
    let word = '';
    for (let i = 0; i < gcode1.length; i++) {
        char = gcode1[i];
        if (char != ' ' && char != '\n') {
            word += char;
        }
        else if (char == '\n') { // exit for loop
            i = gcode1.length;
        }
        if (char == ' ' || char == '\n') {
            let key = word[0];
            let value = parseInt(word.slice(1));
            switch(key) {
                case 'G':
                  if (value == 0) {
                    gfill = false;
                  }
                  else if (value == 1) {
                    gfill = true;
                  }                 
                  break;
                case 'X':
                  gx = value;
                  // code block
                  break;
                case 'Y':
                  gy = value;
                  break;
                case 'F':
                  gspeed = value;
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
    let gtext = 'Fill:' + gfill + ' X:' + gx + ' Y:' + gy + ' F:' + gspeed + '\n';
    const pre2 = document.createElement('pre');
    pre2.textContent = gcode1;
    document.body.appendChild(pre2);
    
    // initialize values before update
    let maxX = matrixSizeX*squareSize; //400
    let minX = 0; //0
    let maxY = (matrixSizeY-1)*squareSize - 20;
    let minY = -20;

    let origx = nozzleLocation[0]; // starts at 220 - nozzleSizeX/2
    let origy = nozzleLocation[1]; // starts at 220 - nozzleSizeY
    let oldx = nozzleLocation[0];
    let oldy = nozzleLocation[1];
    // let destx = gx*squareSize;
    // let desty = maxY - gy*squareSize;
    let destx = gx;
    let desty = maxY - gy;
    let dx = destx - oldx;
    let dy = desty - oldy;

    let oldE = extrusionCounter;
    let totaldE = gE - oldE;
    // printError(curE);

    let dist = Math.sqrt(dx*dx+dy*dy);
    let xspeed = 0;
    let yspeed = 0;
    let angle = 0;
    if (dx != 0) { 
        let fract = dy/dx; 
        angle = Math.atan(fract);
        xspeed = Math.abs(gspeed * Math.cos(angle));
        yspeed = Math.abs(gspeed * Math.sin(angle));
        if (xspeed > yspeed) {
            yspeed = yspeed/xspeed*gspeed;
            xspeed = gspeed;
        }
        else if (xspeed < yspeed) {
            xspeed = xspeed/yspeed*gspeed;
            yspeed = gspeed;
        }
        else if (xspeed == yspeed) {
            xspeed = gspeed;
            yspeed = gspeed;
        }
 
    }
    else {
        xspeed = 0;
        yspeed = gspeed;
    }
    // printError(xspeed);
    // let secondsNeeded = Math.ceil(dist/gspeed);

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
        
        if (gfill == true) {
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
                
                printError(extrusionCounter);
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

        if (newx == destx && newy == desty) {
            stopAnimation = true;
        }
        
        // If nozzleontinue animation
        if (!stopAnimation) {
            requestAnimationFrame(updatePrintAnimation);
        }
        
    }

    updatePrintAnimation();
}

