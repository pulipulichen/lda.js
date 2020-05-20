/* global postMessageAPI */

var appMounted = function () {
    this.setupAPI()
    
    this.loadPersistedData()
    postMessageAPI.ready()
    
    //console.log(this.searchParams.api)
    if (!this.searchParams.api) {
      setTimeout(() => {
        $.get(this.inputTextFile, (text) => {
          this.inputText = text
          this.processOutput()
        })
        
      }, 0)
    }
  }