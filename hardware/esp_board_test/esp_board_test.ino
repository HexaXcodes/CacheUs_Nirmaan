void setup() {
  pinMode(LED_BUILTIN, OUTPUT);
  Serial.begin(115200);
}

void loop() {
  digitalWrite(LED_BUILTIN, HIGH);
  Serial.println("Uno is working!");
  delay(1000);

  digitalWrite(LED_BUILTIN, LOW);
  delay(1000);
}