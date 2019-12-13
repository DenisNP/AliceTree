/* eslint-disable no-console */
const express = require('express');

const app = express();
const port = 3000;

// main params
const colorsNum = 24;

let code = 0;
let slowness = 5;
let partSize = 10;
let gradient = true;
let rainbow = false;
let colors = Array(colorsNum).fill('ffffff');

function setColors(_colors) {
    for (let i = 0; i < colorsNum; i++) {
        colors = _colors[i % _colors.length];
    }
}

function setMode(_slowness, _partSize, _gradient, _rainbow, _colors) {
    slowness = Number.parseInt(setNew(slowness, _slowness));
    partSize = Number.parseInt(setNew(partSize, _partSize));
    gradient = !!setNew(gradient, _gradient);
    rainbow = !!setNew(rainbow, _rainbow);
    if (_colors !== null && _colors !== undefined) {
        setColors(_colors.split(','));
    }
    code = ++code % 10;
}

function getMode() {
    let result = code.toString();
    result += n(slowness);
    result += n(partSize);
    result += gradient ? '1' : '0';
    if (rainbow) {
        result += '-';
    } else {
        result += colors.join('');
    }
    return result;
}

app.get('/setMode', (req, res) => {
    setMode(
        req.query.slowness,
        req.query.partSize,
        req.query.gradient,
        req.query.rainbow,
        req.query.colors
    );
    res.send(getMode());
});

// get current mode
app.get('/mode', (req, res) => {
    res.send(getMode());
});

function n(num) {
    const s = num.toString();
    if (s.length < 2) {
        return `0${s}`;
    }

    return s;
}

function setNew(sourceVal, newVal) {
    if (newVal !== null && newVal !== undefined) {
        return newVal;
    }
    return sourceVal;
}

app.listen(port, () => console.log(`Listening on port ${port}!`));
