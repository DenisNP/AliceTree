/* eslint-disable no-console */
const express = require('express');
const bodyParser = require('body-parser');
const utils = require('./utils');
const constants = require('./contants');

const app = express();
const port = 3000;
app.use(bodyParser.urlencoded({ extended: false }));

// main params
let code = 0;
let slowness = 5;
let partSize = 10;
let gradient = true;
let random = false;
let rainbow = false;
let noise = false;
let colors = Array(constants.colorsNum).fill('ffffff');

function setColors(_colors) {
    for (let i = 0; i < constants.colorsNum; i++) {
        let color = _colors[i % _colors.length];
        if (noise && color !== '000000') {
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

// handle request
app.post('/changeColor', (req, res) => {
    const command = (req.body.value1 || '').toLowerCase().split(' ');

    // gradient
    gradient = utils.hasKeywords(command, constants.kwGradient);
    
    // random
    random = utils.hasKeywords(command, constants.kwRandom);

    // noise
    noise = random || utils.hasKeywords(command, constants.kwNoise);
    
    // colors
    if (utils.hasKeywords(command, constants.kwRainbow)) {
        rainbow = true;
    } else {
        rainbow = false;
        // fill colors array
        const newColors = [];
        for (colorCode of colorCodes) {
            if (utils.hasKeywords(command, colorCode[0])) {
                newColors.push(colorCode[1]);
            }
        }
        // shuffle if random
        if (random) {
            utils.shuffle(newColors);
        }
        // special case for black, alternate black with colors
        if (utils.hasKeywords(command, constants.kwBlack)) {
            let len = newColors.length;
            while (len > 0) {
                newColors.splice(len--, 0, String('000000'));
            }
        }
        if (newColors.length > 0) {
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
    } else {
        slowness = 5;
    }
    
    // parts size
    for (token of command) {
        const number = Number.parseInt(token);
        if (!Number.isNaN(number)) {
            const pSize = Math.round(constants.ledsNum / number);
            partSize = utils.limit(pSize, 1, constants.ledsNum);
            break;
        }
    }
    if (utils.hasKeywords(command, constants.kwFull)) {
        partSize = 0;
    }
    
    code = (code + 1) % 10;
    console.log('new mode set: ' + getMode());
    res.send('');
});

// set mode manual
app.get('/setMode', (req, res) => {
    slowness = Number.parseInt(utils.setNew(slowness, req.query.slowness));
    partSize = Number.parseInt(utils.setNew(partSize, req.query.partSize));
    gradient = !!utils.setNew(gradient, req.query.gradient);
    rainbow = !!utils.setNew(rainbow, req.query.rainbow);
    random = !!utils.setNew(random, req.query.random);
    if (req.query.colors !== null && req.query.colors !== undefined) {
        setColors(req.query.colors.split(','));
    }
    code = (code + 1) % 10;
    res.send(getMode());
});
    
// get current mode
app.get('/mode', (req, res) => {
    res.send(getMode());
});

app.listen(port, () => console.log(`Listening on port ${port}!`));