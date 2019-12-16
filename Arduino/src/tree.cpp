#include <Arduino.h>
#include <HTTPClient.h>
#include <WiFi.h>
#include <FastLED.h>
#include <WiFiMulti.h>

// wifi
const char* ssid     = "Spider";
const char* password = "12345679";
const char* server = "http://alicetree.server/mode"; // CHANGE TO YOURS!!!
WiFiMulti wifiMulti;

// settings
#define NUM_LEDS 130
#define BRIGHTNESS 200
#define LED_PIN 13
#define SPEED_COEFF 1 // how fast the animations will be, don't use too much, because FPS is fixed

// led
CRGB leds[NUM_LEDS];
byte currentLeds[NUM_LEDS][3];

// colors
#define NUM_COLORS 24 // total colors in colors array
bool rainbow = false;
bool isRandom = false;
byte code = 10;
byte colors[NUM_COLORS][3];
byte slowness = 1;
byte partSize = 5;

// animation
unsigned int step = 0;
byte speedStep = 0;
bool gradient = false;

// other
unsigned long lastLoaded = 0;
#define RELOAD_DELAY_MS 2500 // http get request frequency in ms
#define LOOP_DELAY 150 // one animation frame in ms
#define LOOP_ERROR 50 // speed up next loop after http data downloading

// declarations
void setMode(String s);
void loadMode(unsigned long time);
void animateStep();
void saveLeds();
long hexToLong(String s);
int mixColors(int color1, int color2, float ratio);

void setup() {
    Serial.begin(115200);
    Serial.println("Loaded.");

    pinMode(LED_PIN, OUTPUT);
    FastLED.addLeds<WS2811, LED_PIN, GRB>(leds, NUM_LEDS).setCorrection(TypicalLEDStrip);
    FastLED.setBrightness(BRIGHTNESS);

    FastLED.clear();
    // load full rainbow to see on led strip
    int hue = 0;
    for (int i = 0; i < NUM_LEDS; i++) {
        leds[i].setHSV(hue++ % 255, 255, 255);
    }
    saveLeds();
    FastLED.show();
    delay(3000);

    // activate wifi
    wifiMulti.addAP(ssid, password);
}

void loop() {
    unsigned long ct = millis();

    if (lastLoaded > ct) {
        // clear timers because of overflow
        lastLoaded = 0;
        return;
    }

    FastLED.clear();
    if (code < 10) {
        // led strip animation
        for (int s = 0; s < SPEED_COEFF; s++) {
            animateStep();
        }
    } else {
        // turn off
    }
    saveLeds();
    FastLED.show();

    loadMode(ct);

    // estimate time to delay
    unsigned long after = millis();
    int diff = (int)(after - ct);
    if (diff + LOOP_ERROR < LOOP_DELAY) {
        delay(LOOP_DELAY - diff - LOOP_ERROR);
    }
}

/**
 * Get current mode string from http server
 * @param time current time on milliseconds
 */
void loadMode(unsigned long time) {
    if (lastLoaded < time - RELOAD_DELAY_MS) {
        lastLoaded = time;

        if ((wifiMulti.run() == WL_CONNECTED)) {
            HTTPClient http;
            Serial.print("[HTTP] begin...\n");

            http.begin(server);
            Serial.print("[HTTP] GET...\n");
            int httpCode = http.GET();

            if (httpCode > 0) {
                Serial.printf("[HTTP] GET... code: %d\n", httpCode);

                if (httpCode == HTTP_CODE_OK) {
                    String payload = http.getString();
                    Serial.println(payload);
                    Serial.println("");
                    Serial.println("...setting mode...");
                    setMode(payload);
                }
            } else {
                Serial.printf("[HTTP] GET... failed, error: %s\n", http.errorToString(httpCode).c_str());
            }

            http.end();
        }
    }
}

/**
 * Convert loaded string to led's colors and animation type
 * @param s downloaded data for new mode
 */
void setMode(String s) {
    byte newCode = s.substring(0, 1).toInt(); // first digit is code
    if (newCode == code) {
        // same mode as current
        return;
    }
    // load new mode
    speedStep = 0;
    step = 0;

    code = newCode;
    slowness = s.substring(1, 3).toInt(); // next two digits is slowness 0-99 in theory 0-10 for now
    partSize = max(0, (int)s.substring(3, 5).toInt()); // next two is part size 0-99
    if (partSize == 0 || partSize > NUM_LEDS) { // zero is full led
        partSize = NUM_LEDS;
    }
    gradient = s.substring(5, 6) == "1"; // next digit is 0-1 boolean for gradient mode
    if (gradient && !rainbow) {
        slowness *= 5; // slow down animation for gradient
    }

    // load colors
    int lastColor = 0;
    int lastChannel = 0;
    String cStr = "";

    // random mode
    isRandom = s.substring(6, 7) == "1"; // next digit is 0-1 boolean random mode
    if (isRandom && !gradient) {
        slowness *= 5;
    }

    // log
    Serial.print("new code: "); Serial.println(code);
    Serial.print("slowness: "); Serial.println(slowness);
    Serial.print("partSize: "); Serial.println(partSize);
    Serial.print("gradient: "); Serial.println(gradient);
    Serial.print("isRandom: "); Serial.println(isRandom);

    // rainbow special mode
    if (s.substring(7, 8) == "-") { // if next symbol is '-' there is rainbow mode
        rainbow = true;
        partSize = max(1, partSize / 8);
        Serial.print("rainbow : "); Serial.println(partSize);
        return;
    }

    // normal colors mode, read colors
    rainbow = false;
    for (int i = 7; i < s.length(); i++) {
        char c = s.charAt(i);
        cStr += c; // store next char
        unsigned int cLen = cStr.length();
        if (cLen == 2 && lastColor < NUM_COLORS) { // if 2 chars is stored this is hex color for one channel: R, G or B
            colors[lastColor][lastChannel] = hexToLong(cStr); // store this channel
            Serial.println(colors[lastColor][lastChannel]);
            lastChannel++; // switch to next channel
            if (lastChannel >= 3) { // if all 3 channels stored, jump to next color
                lastChannel = 0;
                lastColor++;
            }
            cStr = "";
        }
    }

    Serial.println("");
}

/**
 * One animation step for the entire led strip
 */
void animateStep() {
    int currentNumColors = rainbow ? 255 : NUM_COLORS; // in rainbow mode there are 255 of FastLED's HUE scale

    for (int i = 0; i < NUM_LEDS; i++) {
        int color = ((int)floor((double)(step + i) / partSize)) % currentNumColors; // current color index in colors array
        int new_r;
        int new_g;
        int new_b;

        if (rainbow) {
            leds[i].setHSV(color, 255, 255);
            // use FastLED's HSV->RBG converter
            new_r = leds[i].r;
            new_g = leds[i].g;
            new_b = leds[i].b;
        } else {
            // new colors for this led
            new_r = colors[color][0];
            new_g = colors[color][1];
            new_b = colors[color][2];
        }

        float coeff = 1.0;
        if (gradient) {
            coeff = (float)(1.0 - (float)max(1, min(10, (int)slowness)) / 10.0 * 0.8); // slower value has slower filter speed
        }

        // running average filter
        leds[i].r = max(0, min(255, (int)floor((double)currentLeds[i][0] + ((double)new_r - currentLeds[i][0]) * coeff)));
        leds[i].g = max(0, min(255, (int)floor((double)currentLeds[i][1] + ((double)new_g - currentLeds[i][1]) * coeff)));
        leds[i].b = max(0, min(255, (int)floor((double)currentLeds[i][2] + ((double)new_b - currentLeds[i][2]) * coeff)));
    }

    if (slowness > 0) {
        speedStep++;
        if (speedStep >= slowness) {
            // jump one step
            unsigned int colorLimit = currentNumColors * partSize; // entire virtual colors line
            if (isRandom) {
                // random jump
                step = (step + random((int) partSize, (int) colorLimit)) % colorLimit;
            } else if (gradient) {
                // next color stop, jump for part size
                step = (step + partSize * (rainbow ? 4 : 1)) % colorLimit;
            } else {
                // next animation step
                step = (step + (rainbow ? 20 : 1)) % colorLimit;
            }
            speedStep = 0;
        }
    }
}

/**
 * Store all current leds colors for next step calculation
 */
void saveLeds() {
    for (int i = 0; i < NUM_LEDS; i++) {
        currentLeds[i][0] = leds[i].r;
        currentLeds[i][1] = leds[i].g;
        currentLeds[i][2] = leds[i].b;
    }
}

/**
 * Convert 2-digit hex color to 0-255 number
 * @param s input string
 * @return number
 */
long hexToLong(String s){
    char c[s.length() + 1];
    s.toCharArray(c, s.length() + 1);
    return strtol(c, nullptr, 16);
}

/**
 * Mix colors together
 * @param color1 first color to mix
 * @param color2 second color to mix
 * @param ratio mix ration from 1.0 (full first color) to 0.0 (full second color)
 * @return new color value
 */
int mixColors(int color1, int color2, float ratio) {
    return (int)round(ratio * (double)color1 + (1.0 - ratio) * (double)color2);
}
