module.exports.n = function(num) {
    const s = num.toString();
    if (s.length < 2) {
        return `0${s}`;
    }
    
    return s;
}

module.exports.randomInt = function(min, max) {
    let rand = min + Math.random() * (max + 1 - min);
    return Math.floor(rand);
}

module.exports.setNew = function(sourceVal, newVal) {
    if (newVal !== null && newVal !== undefined) {
        return newVal;
    }
    return sourceVal;
}

module.exports.hasKeywords = function(command, keywords) {
    for (let keyword of keywords) {
        for (word of command) {
            if (word.startsWith(keyword)) {
                return true;
            }
        }
    }
    return false;
}

module.exports.limit = function(val, min, max) {
    return Math.min(Math.max(val, min), max);
}

module.exports.hexToHSL = function(H) {
    // convert hex to RGB first
    let r = 0, g = 0, b = 0;
    if (H.length == 4) {
        r = "0x" + H[1] + H[1];
        g = "0x" + H[2] + H[2];
        b = "0x" + H[3] + H[3];
    } else if (H.length == 7) {
        r = "0x" + H[1] + H[2];
        g = "0x" + H[3] + H[4];
        b = "0x" + H[5] + H[6];
    }
    // then to HSL
    r /= 255;
    g /= 255;
    b /= 255;
    let cmin = Math.min(r,g,b),
    cmax = Math.max(r,g,b),
    delta = cmax - cmin,
    h = 0,
    s = 0,
    l = 0;
    
    if (delta == 0)
    h = 0;
    else if (cmax == r)
    h = ((g - b) / delta) % 6;
    else if (cmax == g)
    h = (b - r) / delta + 2;
    else
    h = (r - g) / delta + 4;
    
    h = Math.round(h * 60);
    
    if (h < 0)
    h += 360;
    
    l = (cmax + cmin) / 2;
    s = delta == 0 ? 0 : delta / (1 - Math.abs(2 * l - 1));
    s = +(s * 100).toFixed(1);
    l = +(l * 100).toFixed(1);
    
    return [h, s, l];
}

module.exports.HSLToHex = function(hsl) {
    let h = hsl[0],
    s = hsl[1] / 100,
    l = hsl[2] / 100;
    
    if (h >= 360) h %= 360;
    
    let c = (1 - Math.abs(2 * l - 1)) * s,
    x = c * (1 - Math.abs((h / 60) % 2 - 1)),
    m = l - c/2,
    r = 0,
    g = 0,
    b = 0;
    
    if (0 <= h && h < 60) {
        r = c; g = x; b = 0;
    } else if (60 <= h && h < 120) {
        r = x; g = c; b = 0;
    } else if (120 <= h && h < 180) {
        r = 0; g = c; b = x;
    } else if (180 <= h && h < 240) {
        r = 0; g = x; b = c;
    } else if (240 <= h && h < 300) {
        r = x; g = 0; b = c;
    } else if (300 <= h && h < 360) {
        r = c; g = 0; b = x;
    }
    // having obtained RGB, convert channels to hex
    r = Math.round((r + m) * 255).toString(16);
    g = Math.round((g + m) * 255).toString(16);
    b = Math.round((b + m) * 255).toString(16);
    
    return this.n(r) + this.n(g) + this.n(b);
}

module.exports.randomizeColor = function(color) {
    const hsl = this.hexToHSL(`#${color}`);
    hsl[0] -= this.randomInt(-10, 10);
    if (hsl[0] > 360) hsl[0] -= 360;
    if (hsl[0] < 0) hsl[0] -= -360;

    for (let i = 1; i <= 2; i++) {
        hsl[i] = this.limit(hsl[i] - this.randomInt(-10, 10), 0, 100);
    }

    return this.HSLToHex(hsl);
}

module.exports.shuffle = function(array) {
    for (let i = array.length - 1; i > 0; i--) {
        let j = Math.floor(Math.random() * (i + 1));
        [array[i], array[j]] = [array[j], array[i]];
    }
}

module.exports.extractColors = function(colorCodes, command) {
    const newColors = [];
    for (colorCode of colorCodes) {
        if (this.hasKeywords(command, colorCode[0])) {
            newColors.push(colorCode[1]);
        }
    }
    return this.getUnique(newColors);
}

module.exports.insertAlternating = function(arr, val) {
    let len = arr.length;
    while (len > 0) {
        arr.splice(len--, 0, val);
    }
}

module.exports.getNonBlack = function(colors) {
    return this.getUnique(colors.filter(c => c !== '000000'));
}

module.exports.getUnique = function(array) {
    return array.filter((v, i, a) => a.indexOf(v) === i);
}