/* global XLSX */

let postMessageAPI = PuliPostMessageAPI({
  manuallyReady: true
})

var app = new Vue({
  el: '#app',
  data: {
    inputText: ``,
    topicNumber: 4,
    processOutputWait: false,
    displayPanel: 'topic',
    //displayPanel: 'configuration',
    persistKey: 'lda-js.' + location.href,
    configChanged: false
  },
  computed: {
    searchParams () {
      let output = {}
      const currentURL = new URL(location.href)
      for(let [key, value] of currentURL.searchParams.entries()) {
        output[key] = value
      }
      return output
    }
  },
  mounted () {
    this.setupAPI()
    
    this.loadPersistedData()
    postMessageAPI.ready()
    
    //console.log(this.searchParams.api)
    if (!this.searchParams.api) {
      setTimeout(() => {
        $.get('email.txt', (text) => {
          this.inputText = text
          this.processOutput()
        })
        
      }, 0)
    }
  },
  watch: {
    topicNumber () {
      this.persist()
    },
  },
  methods: {
    setupAPI () {
      postMessageAPI.addReceiveListener(async (data) => {
        //console.log('收到資料了', data)
        if (typeof(data) === 'string') {
          this.inputText = data
        }
        else {
          for (let key in data) {
            this[key] = data[key]
          }
        }
        
        return await this.processOutput()
      })
      //console.log('設定好了')
    },
    persist () {
      this.configChanged = true
      let key = this.persistKey
      let data = {
        topicNumber: this.topicNumber,
      }
      localStorage.setItem(key, JSON.stringify(data))
    },
    loadPersistedData () {
      let dataString = localStorage.getItem(this.persistKey)
      if (dataString) {
        let data = JSON.parse(dataString)
        for (let key in data) {
          this[key] = data[key]
        }
      }
    },
    loadInputFile (evt) {
      //console.log(1);
      if(!window.FileReader) return; // Browser is not compatible

      this.processOutputWait = true
      var reader = new FileReader();
      let filename = evt.target.files[0].name
      let type = evt.target.files[0].type
      console.log(type)
      if (filename.indexOf('.') > -1) {
        filename = filename.slice(0, filename.lastIndexOf('.'))
      }
      this.inputFilename = filename

      reader.onload = async (evt) => {
        if (evt.target.readyState !== 2) {
          this.processOutputWait = false
          return;
        }
        if (evt.target.error) {
          alert('Error while reading file');
          this.processOutputWait = false
          return;
        }

        let result = evt.target.result
        if (type === 'application/vnd.oasis.opendocument.spreadsheet'
          || type === 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet') {
          this.inputText = await this.processUploadTypeSheet(result)
        }
        else if (type === 'application/vnd.oasis.opendocument.text') {
          this.inputText = await this.processUploadTypeODT(result)
        }
        else if (type === 'text/html') {
          this.inputText = this.processUploadTypeHTML(result)
        }
        else if (type === 'text/csv') {
          this.inputText = await this.processUploadTypeCSV(result)
        }
        else {
          this.inputText = result
        }
        this.$refs.inputFileUploadTrigger.value = ''
        this.processOutputWait = false
      }

      if (type === 'application/vnd.oasis.opendocument.spreadsheet'
          || type === 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet') {
        let size = evt.target.files[0].size
        console.log('size', size)
        if (size > 25000000) {
          window.alert('ODS/XLSX檔案大小請低於2.5MB。')
          this.processOutputWait = false
          return false
        }

        reader.readAsBinaryString(evt.target.files[0])
      } else {
        reader.readAsText(evt.target.files[0])
      }
    },
    processUploadTypeHTML (html) {
      if (html.indexOf('<article') > -1) {
        html = html.slice(html.indexOf('<article'), html.lastIndexOf('</article>') + 1)
        html = html.replace('<article', '<div')
          .replace('</article>', '</div>')
      }
      else if (html.indexOf('<body') > -1) {
        html = html.slice(html.indexOf('<body'), html.lastIndexOf('</body>') + 1)
        html = html.replace('<body', '<div')
          .replace('</body>', '</div>')
      }
      
      let $html = $(html)
      $html.find('script').remove()
      html = $html.text()

      html = html.split('\n')
              .map(line => line.trim())
              .filter(line => line !== '')
              .join('\n')
      return html
    },
    processUploadTypeSheet: async function (input) {
      var workbook = await XLSX.readAsync(input, {type: 'binary'});
      
      var result = [];
      for (let i in workbook.SheetNames) {
        let sheetName = workbook.SheetNames[i]

        var csv = XLSX.utils.sheet_to_csv(workbook.Sheets[sheetName], {
          FS: ' ',
          blankrows: false
        });
        
        //console.log(csv)
        result.push(csv.trim())
      }
      
      result = result.join('\n')
      result = result.split('\n').map(line => line.trim()).filter(line => (line !== '')).join('\n')

      return result
    },
    sleep: async function (ms) {
      if (typeof(ms) !== 'number') {
        ms = 1
      }

      return new Promise((resolve) => {
        setTimeout(() => {
          resolve(true)
        }, ms)
      })
    },
    processUploadTypeCSV: async function (input) {
      var workbook = await XLSX.readAsync(input, {type: 'string'});
      
      var result = [];
      for (let i in workbook.SheetNames) {
        let sheetName = workbook.SheetNames[i]

        var csv = XLSX.utils.sheet_to_csv(workbook.Sheets[sheetName], {
          FS: ' ',
          blankrows: false
        });
        
        //console.log(csv)
        result.push(csv.trim())
      }
      
      result = result.join('\n')
      result = result.split('\n').map(line => line.trim()).filter(line => (line !== '')).join('\n')

      return result
    },
    s2ab (s) {
      var buf = new ArrayBuffer(s.length); //convert s to arrayBuffer
      var view = new Uint8Array(buf);  //create uint8array as viewer
      for (var i=0; i<s.length; i++) view[i] = s.charCodeAt(i) & 0xFF; //convert to octet
      return buf;    
    },
    
    loadFullStopWords () {
      if (!this.fullStopWords) {
        this.processOutputWait = true
        $.get('stop_words.txt', (stop_words) => {
          this.fullStopWords = stop_words
          this.loadFullStopWordsInited()
          this.processOutputWait = false
        })
      }
      else {
        this.loadFullStopWordsInited()
      }
    },
    loadFullStopWordsInited () {
      if (this.fullStopWords !== this.configStopWords
        && this.configStopWords.trim() !== '') {
        if (window.confirm('Are you sure to replace existed content?') === false) {
          return false
        }
      }
      this.configStopWords = this.fullStopWords
    },
    copyOutput () {
      this.$refs.outputCopyTextarea.select()
      document.execCommand("Copy")
    },
    saveAsSheet () {
      console.error('@TODO')
    },
    drawWordCloud (text) {
      let url = 'https://pulipulichen.github.io/d3-cloud/index.html'
      //let url = 'http://localhost:8383/d3-cloud/index.html'
      //let url = 'http://pc.pulipuli.info:8383/d3-cloud/index.html'
      
      postMessageAPI.send(url, text, {
        mode: 'popup'
      })
    },
    processOutput: async function () {
      console.error('@TODO')
    },
  }
})