var appWatch = {
  inputText() {
    this.configChanged = true
  },
  configTopicNumber() {
    this.persist()
  },
  configAlpha() {
    this.persist()
  },
  configBeta() {
    this.persist()
  },
  configTopN() {
    this.persist()
  },
  configIterations() {
    this.persist()
  },
  configBurnIn() {
    this.persist()
  },
  configThinInterval() {
    this.persist()
  },
  configSampleLag() {
    this.persist()
  },
}