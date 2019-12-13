/* eslint-disable no-console */
const express = require('express');
const bodyParser = require('body-parser');

const app = express();
const port = 3000;
app.use(bodyParser.urlencoded({ extended: false }));

// constants
const colorCodes = [
    [['аквамарин'], '7fffd4'],
    [['алый', 'алого', 'аленьк', 'алую', 'алой', 'алая'], 'ff2400'],
    [['аметист'], '9966cc'],
    [['антрацит'], '464451'],
    [['бежев'], 'f5f5dc'],
    [['белый', 'белого', 'белую', 'белая', 'белой'], 'ffffff'],
    [['бирюзов'], '30d5c8'],
    [['бордо'], '9b2d30'],
    [['бронзов'], 'cd7f32'],
    [['бурый', 'бурого', 'бурую', 'бурая', 'бурой'], '45161c'],
    [['голубой'], '42aaff'],
    [['гранатов'], 'f34723'],
    [['желт'], 'ffff00'],
    [['зелен', 'зелён'], '008000'],
    [['изумруд'], '009b77'],
    [['индиго'], '4b0082'],
    [['коричнев'], '964b00'],
    [['красн'], 'ff0000'],
    [['лайм'], '00ff00'],
    [['лилов'], 'db7093'],
    [['лимон'], 'fde910'],
    [['малахит'], '0bda51'],
    [['малинов'], 'dc143c'],
    [['мандарин'], 'ff8800'],
    [['небесн'], '7fc7ff'],
    [['нефрит'], '00a86b'],
    [['оливков'], '808000'],
    [['оранж'], 'ffa500'],
    [['охра', 'охры'], 'cc7722'],
    [['персик'], 'ffe5b4'],
    [['песочн'], 'fcdd76'],
    [['пурпурн'], '800080'],
    [['розов'], 'ffc0cb'],
    [['рыжий', 'рыжего', 'рыжая', 'рыжей', 'рыжую'], 'd77d31'],
    [['салат'], '99ff99'],
    [['сапфир'], '082567'],
    [['серебр'], 'c0c0c0'],
    [['синий', 'синего', 'синяя', 'синюю', 'синей'], '0000ff'],
    [['сиренев'], 'c8a2c8'],
    [['скарлет'], 'fc2847'],
    [['сливов'], '660066'],
    [['терракот'], 'cc4e5c'],
    [['тициан'], 'd53e07'],
    [['томат'], 'ff6347'],
    [['трав'], '5da130'],
    [['ультрамарин'], '120a8f'],
    [['фиалк'], 'ea8df7'],
    [['фиолетов'], '8b00ff'],
    [['хаки'], '806b2a'],
    [['шафран'], 'f4c430'],
    [['шоколад'], 'd2691e'],
    [['янтар'], 'ffbf00'],
];

const colorsNum = 24;
const ledsNum = 130;

// main params
let code = 0;
let slowness = 5;
let partSize = 10;
let gradient = true;
let rainbow = false;
let colors = Array(colorsNum).fill('ffffff');

function setColors(_colors) {
    for (let i = 0; i < colorsNum; i++) {
        colors[i] = _colors[i % _colors.length];
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

// handle request
app.post('/changeColor', (req, res) => {
    const command = (req.body.value1 || '').toLowerCase().split(' ');
    
    // colors
    if (hasKeywords(command, ['радуг', 'радужн', 'разноцветн'])) {
        rainbow = true;
    } else {
        rainbow = false;
        const newColors = [];
        for (colorCode of colorCodes) {
            if (hasKeywords(command, colorCode[0])) {
                newColors.push(colorCode[1]);
            }
        }
        // special case for black, alternate black with colors
        if (hasKeywords(command, ['черн', 'чёрн'])) {
            let len = newColors.length;
            while (len > 0) {
                newColors.splice(len--, 0, '000000');
            }
        }
    }

    // slowness
    if (hasKeywords(command, ['быстр', 'резк'])) {
        slowness = 1;
    } else if (hasKeywords(command, ['медлен', 'плавн'])) {
        slowness = 10;
    } else {
        slowness = 5;
    }

    // parts size
    partSize = 10;
    for (token of command) {
        const number = Number.parseInt(token);
        if (!Number.isNaN(number)) {
            partSize = Math.min(Math.max(ledsNum / number, 1), ledsNum);
        }
    }
    if (hasKeywords(command, ['полностью', 'всю', 'весь', 'вся', 'всей', 'целиком', 'целой', 'целую', 'целый'])) {
        partSize = 0;
    }

    // gradient
    if (hasKeywords(command, ['градиент', 'перелив'])) {
        gradient = true;
    } else {
        gradient = false;
    }

    code = ++code % 10;
    console.log('new mode set: ' + getMode());
    res.send('');
});

// set mode manual
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

function hasKeywords(command, keywords) {
    for (let keyword of keywords) {
        for (word of command) {
            if (word.startsWith(keyword)) {
                return true;
            }
        }
    }
    return false;
}

app.listen(port, () => console.log(`Listening on port ${port}!`));