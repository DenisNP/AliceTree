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
#define BRIGHTNESS 100
#define LED_PIN 13
#define SPEED_COEFF 1

// led
CRGB leds[NUM_LEDS];
byte currentLeds[NUM_LEDS][3];

// colors
#define NUM_COLORS 24
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
#define RELOAD_DELAY_MS 2500
#define LOOP_DELAY 150
#define LOOP_ERROR 50

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
    int hue = 0;
    for (int i = 0; i < NUM_LEDS; i++) {
        leds[i].setHSV(hue++ % 255, 255, 255);
    }
    saveLeds();
    FastLED.show();
    delay(3000);

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
        for (int s = 0; s < SPEED_COEFF; s++) {
            animateStep();
        }
    } else {
        // turn off
    }
    saveLeds();
    FastLED.show();

    loadMode(ct);

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
 * @param s
 */
void setMode(String s) {
    byte newCode = s.substring(0, 1).toInt();
    if (newCode == code) {
        // same mode as current
        return;
    }

    speedStep = 0;
    step = 0;

    code = newCode;
    slowness = s.substring(1, 3).toInt();
    partSize = max(1, (int)s.substring(3, 5).toInt());
    if (partSize == 0 || partSize > NUM_LEDS) {
        partSize = NUM_LEDS;
    }
    gradient = s.substring(5, 6) == "1";
    if (gradient) {
        slowness *= 5;
    }

    // load colors
    int lastColor = 0;
    int lastChannel = 0;
    String cStr = "";

    // random
    isRandom = s.substring(6, 7) == "1";
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
    if (s.substring(7, 8) == "-") {
        rainbow = true;
        partSize = max(1, partSize / 8);
        Serial.print("rainbow : "); Serial.println(partSize);
        return;
    }

    // normal colors mode
    rainbow = false;
    for (int i = 7; i < s.length(); i++) {
        char c = s.charAt(i);
        cStr += c;
        unsigned int cLen = cStr.length();
        if (cLen == 2 && lastColor < NUM_COLORS) {
            colors[lastColor][lastChannel] = hexToLong(cStr);
            Serial.println(colors[lastColor][lastChannel]);
            lastChannel++;
            if (lastChannel >= 3) {
                lastChannel = 0;
                lastColor++;
            }
            cStr = "";
        }
    }

    Serial.println("");
}

void animateStep() {
    int currentNumColors = rainbow ? 255 : NUM_COLORS;

    for (int i = 0; i < NUM_LEDS; i++) {
        int color = ((int)floor((double)(step + i) / partSize)) % currentNumColors;
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
            // softly mix with next near the end
            int stepsToNext = partSize >= 4 ? partSize / 2 : 0;
            int inColorStep = min(stepsToNext, partSize - ((int)step + i) % partSize);
            int nextColor = ((int)floor((double)(step + i + partSize) / partSize)) % currentNumColors;
            float mixRatio = (float)inColorStep / (float)stepsToNext;

            // set colors
            new_r = mixColors(colors[color][0], colors[nextColor][0], mixRatio);
            new_g = mixColors(colors[color][1], colors[nextColor][1], mixRatio);
            new_b = mixColors(colors[color][2], colors[nextColor][2], mixRatio);
        }

        float coeff = 1.0;
        if (gradient) {
            coeff = (float)(1.0 - (float)max(1, min(10, (int)slowness)) / 10.0 * 0.8);
        }

        leds[i].r = currentLeds[i][0] + round(((double)new_r - currentLeds[i][0]) * coeff);
        leds[i].g = currentLeds[i][1] + round(((double)new_g - currentLeds[i][1]) * coeff);
        leds[i].b = currentLeds[i][2] + round(((double)new_b - currentLeds[i][2]) * coeff);
    }

    if (slowness > 0) {
        speedStep++;
        if (speedStep >= slowness) {
            unsigned int colorLimit = currentNumColors * partSize;
            if (isRandom) {
                // random jump
                step = (step + random((int) partSize, (int) colorLimit)) % colorLimit;
            } else if (gradient) {
                // next color stop
                step = (step + partSize * random(1, currentNumColors)) % colorLimit;
            } else {
                // next animation step
                step = (step + 1) % colorLimit;
            }
            speedStep = 0;
        }
    }
}

void saveLeds() {
    for (int i = 0; i < NUM_LEDS; i++) {
        currentLeds[i][0] = leds[i].r;
        currentLeds[i][1] = leds[i].g;
        currentLeds[i][2] = leds[i].b;
    }
}

long hexToLong(String s){
    char c[s.length() + 1];
    s.toCharArray(c, s.length() + 1);
    return strtol(c, nullptr, 16);
}

int mixColors(int color1, int color2, float ratio) {
    return (int)round(ratio * (double)color1 + (1.0 - ratio) * (double)color2);
}
