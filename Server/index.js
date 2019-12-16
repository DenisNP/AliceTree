/* eslint-disable no-console */
const express = require('express');
const bodyParser = require('body-parser');
const utils = require('./utils');
const constants = require('./constants');

const app = express();
const port = 3000;
app.use(bodyParser.urlencoded({ extended: false }));

// main params
let code = 0;
let slowness = 5;
let partSize = 10;
let gradient = false;
let random = false;
let rainbow = false;
let noise = false;
let colors = Array(constants.colorsNum).fill('ffffff');

function setColors(_colors) {
    for (let i = 0; i < constants.colorsNum; i++) {
        // fill the colors array with all colors repetitive
        let color = _colors[i % _colors.length];
        if (noise && color !== '000000') {
            // is this is noise mode randomize color
            color = utils.randomizeColor(color);
        }
        colors[i] = color;
    }
}

function getMode() {
    let result = code.toString();
    result += utils.n(slowness);
    result += utils.n(partSize);
    result += gradient ? '1' : '0';
    result += random ? '1' : '0';
    if (rainbow) {
        result += '-';
    } else {
        result += colors.join('');
    }
    return result;
}

function newCode() {
    code = (code + 1) % 10;
}

// handle request
app.post('/setMode', (req, res) => {
    const command = (req.body.value1 || '').toLowerCase().split(' ');
    console.log(command);

    // gradient
    if (utils.hasKeywords(command, constants.kwGradient)) {
        gradient = true;
    } else if (utils.hasKeywords(command, constants.kwNonGradient)) {
        gradient = false;
    }
    
    // random
    if (utils.hasKeywords(command, constants.kwRandom)) {
        random = true;
    } else if (utils.hasKeywords(command, constants.kwNonRandom)) {
        random = false;
    }

    // noise
    noise = random || utils.hasKeywords(command, constants.kwNoise);
    
    // colors
    if (utils.hasKeywords(command, constants.kwRainbow)) {
        rainbow = true;
    } else {
        // fill colors array
        const newColors = utils.extractColors(constants.colorCodes, command);
        // shuffle if random
        if (random) {
            utils.shuffle(newColors);
        }
        // special case for black, alternate black with colors
        if (utils.hasKeywords(command, constants.kwBlack)) {
            utils.insertAlternating(newColors, '000000');
        }
        if (newColors.length > 0) {
            rainbow = false;
            setColors(newColors);
        }
    }
    
    // slowness
    if (utils.hasKeywords(command, constants.kwFast)) {
        slowness = 1;
    } else if (utils.hasKeywords(command, constants.kwSlow)) {
        slowness = 10;
    } else if (utils.hasKeywords(command, constants.kwStatic)){
        slowness = 0;
    } else if (utils.hasKeywords(command, constants.kwMedium)) {
        slowness = 5;
    }
    
    // parts size
    if (utils.hasKeywords(command, constants.kwFull)) {
        partSize = 0;
    } else if (utils.hasKeywords(command, constants.kwFill)) {
        partSize = 1;
    } else {
        for (token of command) {
            const number = Number.parseInt(token);
            if (!Number.isNaN(number)) {
                const pSize = Math.round(constants.ledsNum / number);
                partSize = utils.limit(pSize, 1, constants.ledsNum);
                break;
            }
        }
    }
    
    newCode();
    console.log('new mode set: ' + getMode());
    res.send('');
});

// add colors
app.post('/addColors', (req, res) => {
    const command = (req.body.value1 || '').toLowerCase().split(' ');
    const addColors = utils.extractColors(constants.colorCodes, command);
    const hasBlackToAdd = utils.hasKeywords(command, constants.kwBlack);
    const hadBlackInitial = !!colors.find(c => c === '000000');

    const wasNonBlackColors = utils.getNonBlack(colors);
    const newColors = wasNonBlackColors.concat(addColors);
    if (random) {
        utils.shuffle(newColors);
    }

    if (hasBlackToAdd || hadBlackInitial) {
        utils.insertAlternating(newColors, '000000');
    }

    if (newColors.length > 0) {
        rainbow = false;
        setColors(newColors);
    }
    newCode();
    console.log('new colors added: ' + getMode());
    res.send('');
});

app.post('/removeColors', (req, res) => {
    const command = (req.body.value1 || '').toLowerCase().split(' ');
    const removeColors = utils.extractColors(constants.colorCodes, command);
    const hasBlackToRemove = utils.hasKeywords(command, constants.kwBlack);
    const hadBlackInitial = !!colors.find(c => c === '000000');

    const wasNonBlackColors = utils.getNonBlack(colors);
    const newColors = wasNonBlackColors.filter(c => removeColors.indexOf(c) < 0);

    if (random) {
        utils.shuffle(newColors);
    }

    if (!hasBlackToRemove && hadBlackInitial) {
        utils.insertAlternating(newColors, '000000');
    }

    setColors(newColors);
    newCode();
    console.log('some colors removed: ' + getMode());
    res.send('');
});

// set mode manual
app.get('/manualMode', (req, res) => {
    slowness = Number.parseInt(utils.setNew(slowness, req.query.slowness));
    partSize = Number.parseInt(utils.setNew(partSize, req.query.partSize));
    gradient = !!utils.setNew(gradient, req.query.gradient);
    rainbow = !!utils.setNew(rainbow, req.query.rainbow);
    random = !!utils.setNew(random, req.query.random);
    if (req.query.colors !== null && req.query.colors !== undefined) {
        setColors(req.query.colors.split(','));
    }
    newCode();
    res.send(getMode());
});
    
// get current mode
app.get('/mode', (req, res) => {
    res.send(getMode());
});

app.listen(port, () => console.log(`Listening on port ${port}!`));