/* global XLSX, lda */

let postMessageAPI = PuliPostMessageAPI({
  manuallyReady: true
})

var app = {
  el: '#app',
  data: {
    inputTextFile: 'data/email-segment.txt',
    //inputTextFile: 'data/abstract.txt',
    inputText: ``,
    configTopicNumber: 4,
    configAlpha: 0.1,
    configBeta: 0.01,
    configTopN: 100,
    configIterations: 500,  // 10000
    configBurnIn: 2000,
    configThinInterval: 100,
    configSampleLag: 10,
    processOutputWait: false,
    displayPanel: 'topic',
    //displayPanel: 'configuration',
    persistKey: 'lda-js.' + location.href,
    configChanged: false,
    topicTerms: [],
    topicDocuments: [],
    sortDocuments: -1
  },
  computed: {
    searchParams () {
      let output = {}
      const currentURL = new URL(location.href)
      for(let [key, value] of currentURL.searchParams.entries()) {
        output[key] = value
      }
      return output
    },
    sortedTopicDocuments () {
      setTimeout(() => {
        let table = $(this.$refs.DocumentTable)
        table.find('.sentence').popup()
        table.tablesort({
          sortInitialOrder: 'desc',
        })
      }, 0)
      if (this.sortDocuments === -1) {
        //console.log(this.topicDocuments[0])
        return this.topicDocuments
      }
      else {
        let output = JSON.parse(JSON.stringify(this.topicDocuments))
        output.sort(function (a, b) {
          return (b.theta[this.sortDocuments] - a.theta[this.sortDocuments])
        })
      }
    },
    topicNumberArray () {
      let output = []
      for (let i = 0; i < this.configTopicNumber; i++) {
        output.push(i)
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
        $.get(this.inputTextFile, (text) => {
          this.inputText = text
          this.processOutput()
        })
        
      }, 0)
    }
  },
  watch: {
    configTopicNumber () { this.persist() },
    configAlpha () { this.persist() },
    configBeta () { this.persist() },
    configTopN () { this.persist() },
    configIterations () { this.persist() },
    configBurnIn () { this.persist() },
    configThinInterval () { this.persist() },
    configSampleLag () { this.persist() },
  },
  methods: {
    setupAPI () {
      postMessageAPI.addReceiveListener(async (data) => {
        //console.log('收到資料了', data)
        if (typeof(data) === 'string') {
          this.inputText = data.trim()
        }
        else {
          for (let key in data) {
            this[key] = data[key]
          }
        }
        
        let lines = this.inputText.trim().split('\n').map(line => line.trim()).filter(line => line !== '').length
        if (lines > 1 && this.configTopicNumber > lines) {
          this.configTopicNumber = lines
        }
        
        return await this.processOutput()
      })
      //console.log('設定好了')
    },
    persist () {
      this.configChanged = true
      let key = this.persistKey
      let data = {
        configTopicNumber: this.configTopicNumber,
        configAlpha: this.configAlpha,
        configBeta: this.configBeta,
        configTopN: this.configTopN,
        configIterations: this.configIterations,
        configBurnIn: this.configBurnIn,
        configThinInterval: this.configThinInterval,
        configSampleLag: this.configSampleLag,
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
      //console.log(type)
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
    saveAsSheet () {
      console.error('@TODO')
    },
    copyTopic (array) {
      console.error('@TODO', array)
    },
    drawWordCloud (array) {
      let url = 'https://pulipulichen.github.io/d3-cloud/index.html'
      //let url = 'http://localhost:8383/d3-cloud/index.html'
      //let url = 'http://pc.pulipuli.info:8383/d3-cloud/index.html'
      
      let text = []
      array.forEach(({term, prob}) => {
        for (let i = 0; i < Math.ceil(prob / 100); i++ ) {
          text.push(term)
        }
      })
      
      postMessageAPI.send(url, text.join(' '), {
        mode: 'popup',
        newWindow: true,
        features: 0.8
      })
    },
    isEnglishNumberWord (word) {
      var english = /^[A-Za-z0-9]*$/;
      return english.test(word)
    },
    processOutput: async function () {
      //console.log("analysing "+sentences.length+" sentences...");
      this.processOutputWait = true
      var documents = new Array();
      var f = {};
      var vocab = new Array();
      var docCount = 0;
      let sentences = this.inputText.trim().split('\n')
      
      for (var i = 0; i < sentences.length; i++) {
        if (sentences[i] === "") {
          continue;
        }
        var words = sentences[i].split(/[\s,\"]+/);
        if (!words)
          continue;
        var wordIndices = new Array();
        for (var wc = 0; wc < words.length; wc++) {
          var w = words[wc].toLowerCase()
          if (this.isEnglishNumberWord(w)) {
            w = stemmer(w, false)
          } 
          if (w === "" || w.length === 1 || w.indexOf("http") === 0) {
            continue
          }
          if (f[w]) {
            f[w] = f[w] + 1;
          } else if (w) {
            f[w] = 1;
            vocab.push(w);
          }
          ;
          wordIndices.push(vocab.indexOf(w));
        }
        if (wordIndices && wordIndices.length > 0) {
          documents[docCount++] = wordIndices;
        }
        
        if (i > 0 && i % 100 === 0) {
          await this.sleep()
        }
      }

      var V = vocab.length;
      var M = documents.length;
      var K = this.configTopicNumber
      var alpha = Number(this.configAlpha) //0.1;  // per-document distributions over topics
      var beta = Number(this.configBeta) // .01;  // per-topic distributions over words
      //var alpha = 0.1
      //var beta = 0.01
      
      //console.log('lda', 1)
//      let ITERATIONS = 10000
//      let burnIn = 2000
//      let thinInterval = 100
//      let sampleLag = 10
      
      let ITERATIONS = Number(this.configIterations)
      let burnIn = Number(this.configBurnIn)
      let thinInterval = Number(this.configThinInterval)
      let sampleLag = Number(this.configSampleLag)
      //console.log(ITERATIONS, burnIn, thinInterval, sampleLag)
      lda.configure(documents, V, ITERATIONS, burnIn, thinInterval, sampleLag);
      //console.log('lda', 2)
      await lda.gibbs(K, alpha, beta);

      //console.log('lda', 4)
      var phi = lda.getPhi();
      while (isNaN(phi[0][0])) {
        if (this.configIterations > 1000000) {
          alert('LDA analyze failed.')
          return false
        }
        this.configIterations = this.configIterations * 10
        console.log('Analyze failed. Increase interations: ' + this.configIterations)
        ITERATIONS = Number(this.configIterations)
        lda.configure(documents, V, ITERATIONS, burnIn, thinInterval, sampleLag)
        await lda.gibbs(K, alpha, beta);
        phi = lda.getPhi();
      }
      
      //console.log('lda', 3)
      var theta = lda.getTheta();
      
      //console.log(phi)
      //console.log('theta', theta)
      //console.log('phi', phi)
      //console.log('lda', 5)

      //var text = '';

      //topics
      var topTerms = this.configTopN;
      var topicText = new Array();
      for (var k = 0; k < phi.length; k++) {
        //text += '<canvas id="topic' + k + '" class="topicbox color' + k + '"><ul>';
        var tuples = new Array();
        for (var w = 0; w < phi[k].length; w++) {
          tuples.push("" + phi[k][w].toPrecision(2) + "_" + vocab[w]);
        }
        tuples.sort().reverse();
        if (topTerms > vocab.length) {
          topTerms = vocab.length
        }
        topicText[k] = [];
        for (var t = 0; t < topTerms; t++) {
          var topicTerm = tuples[t].split("_")[1];
          var prob = parseInt(tuples[t].split("_")[0] * 10000);
          if (prob < 0.0001) {
            continue;
          }
          //text += ('<li><a href="javascript:void(0);" data-weight="' + (prob) + '" title="' + prob + '%">' + topicTerm + '</a></li>');
          //console.log("topic " + k + ": " + topicTerm + " = " + prob + "%");
          
          //topicText[k] += (topicTerm + " ");
          topicText[k].push({
            term: topicTerm,
            prob: prob
          })
        }
        //text += '</ul></canvas>';
      }
      //$('#topiccloud').html(text);
      
      this.topicTerms = topicText
      
      //console.log(topicText)

      //text = '<div class="spacer"> </div>';
      /*
      text = ''
      //highlight sentences	
      for (var m = 0; m < theta.length; m++) {
        text += '<div class="lines">';
        text += '<div class="prob">';
        for (var k = 0; k < theta[m].length; k++) {
          text += ('<div class="box bgcolor' + k + '" style="width:' + parseInt("" + (theta[m][k] * 100)) + 'px" title="' + topicText[k] + '"></div>');
        }
        text += '</div>' + sentences[m] + '</div>';
      }
      $("#output").html(text);
      */
      this.topicDocuments = theta.map((t, m) => {
        return {
          sentence: sentences[m],
          theta: t
        }
      })
      
      //console.log(this.topicDocuments)

      /*
      for (var k = 0; k < phi.length; k++) {
        if (!$('#topic' + k).tagcanvas({
          textColour: $('#topic' + k).css('color'),
          maxSpeed: 0.05,
          initial: [(Math.random() > 0.5 ? 1 : -1) * Math.random() / 2, (Math.random() > 0.5 ? 1 : -1) * Math.random() / 2], //[0.1,-0.1],
          decel: 0.98,
          reverse: true,
          weightSize: 10,
          weightMode: 'size',
          weightFrom: 'data-weight',
          weight: true
        }))
        {
          $('#topic' + k).hide();
        } else {
          //TagCanvas.Start('topic'+k);
        }
      }
      */
      
      this.processOutputWait = false
      this.configChanged = false
    },
    displayPercent: function (t) {
      t = Math.round(t * 10000) / 100
      return t + '%'
    },
    computedDocumentClass: function (k, theta, t) {
      //console.log(k, Math.max.apply(this, theta), t)
      if (t === Math.max.apply(this, theta)) {
        return 'color' + k
      }
    },
    computedMaxProbTopic: function (arr) {
      return arr.indexOf(Math.max(...arr));
    },
    downloadTopicDocument: function () {
      console.error('@TODO')
    },
    downloadConfiguration: function () {
      console.error('@TODO')
    }
  }
}

app = new Vue(app)