/* global lda, postMessageAPI, XLSX */

var appMethods = {
  setupAPI() {
    postMessageAPI.addReceiveListener(async (data) => {
      //console.log('收到資料了', data)
      if (typeof (data) === 'string') {
        this.inputText = data.trim()
      } else {
        for (let key in data) {
          if (data[key] === undefined) {
            continue
          } 
          this[key] = data[key]
        }
      }

      let lines = this.inputText.trim().split('\n').map(line => line.trim()).filter(line => line !== '').length
      if (lines > 1 && this.configTopicNumber > lines) {
        this.configTopicNumber = lines
      }
      
      if (this.configTopicNumber < 2) {
        this.configTopicNumber = 2
      }

      //return await this.processOutput()
      return true
    })
    //console.log('設定好了')
  },
  persist() {
    return false
    
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
  loadPersistedData() {
    return false
    let dataString = localStorage.getItem(this.persistKey)
    if (dataString) {
      let data = JSON.parse(dataString)
      for (let key in data) {
        this[key] = data[key]
      }
    }
  },
  loadInputFile(evt) {
    //console.log(1);
    if (!window.FileReader) {
      return; // Browser is not compatible
    }

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
      } else if (type === 'application/vnd.oasis.opendocument.text') {
        this.inputText = await this.processUploadTypeODT(result)
      } else if (type === 'text/html') {
        this.inputText = this.processUploadTypeHTML(result)
      } else if (type === 'text/csv') {
        this.inputText = await this.processUploadTypeCSV(result)
      } else {
        this.inputText = result
      }
      this.$refs.inputFileUploadTrigger.value = ''
      this.processOutputWait = false
    }

    if (type === 'application/vnd.oasis.opendocument.spreadsheet'
            || type === 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet') {
      let size = evt.target.files[0].size
      //console.log('size', size)
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
  processUploadTypeHTML(html) {
    if (html.indexOf('<article') > -1) {
      html = html.slice(html.indexOf('<article'), html.lastIndexOf('</article>') + 1)
      html = html.replace('<article', '<div')
              .replace('</article>', '</div>')
    } else if (html.indexOf('<body') > -1) {
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
    if (typeof (ms) !== 'number') {
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
  s2ab(s) {
    var buf = new ArrayBuffer(s.length); //convert s to arrayBuffer
    var view = new Uint8Array(buf);  //create uint8array as viewer
    for (var i = 0; i < s.length; i++)
      view[i] = s.charCodeAt(i) & 0xFF; //convert to octet
    return buf;
  },

  loadFullStopWords() {
    if (!this.fullStopWords) {
      this.processOutputWait = true
      $.get('stop_words.txt', (stop_words) => {
        this.fullStopWords = stop_words
        this.loadFullStopWordsInited()
        this.processOutputWait = false
      })
    } else {
      this.loadFullStopWordsInited()
    }
  },
  loadFullStopWordsInited() {
    if (this.fullStopWords !== this.configStopWords
            && this.configStopWords.trim() !== '') {
      if (window.confirm('Are you sure to replace existed content?') === false) {
        return false
      }
    }
    this.configStopWords = this.fullStopWords
  },
  saveAsSheet() {
    console.error('@TODO')
  },
  copyTopic(array) {
    console.error('@TODO', array)
  },
  drawWordCloud(array) {
    let url = 'https://pulipulichen.github.io/d3-cloud/index.html'
    //let url = 'http://localhost:8383/d3-cloud/index.html'
    //let url = 'http://pc.pulipuli.info:8383/d3-cloud/index.html'

    let text = []
    
    // 先把array做最基礎化的調整
    let minProb = array[(array.length - 1)].prob
    /*
    array.forEach(({term, prob}) => {
      if (minProb === null
              || prob < minProb) {
        minProb = prob
      }
    })
    */
    
    array.forEach(({term, prob}, i) => {
      array[i].prob = array[i].prob / minProb
    })
    
    //console.log(array)
    
    array.forEach(({term, prob}) => {
      for (let i = 0; i < Math.ceil(prob); i++) {
        text.push(term)
      }
    })

    postMessageAPI.send(url, text.join(' '), {
      mode: 'popup',
      newWindow: true,
      features: 0.8
    })
  },
  isEnglishNumberWord(word) {
    var english = /^[A-Za-z0-9]*$/;
    return english.test(word)
  },
  resetOutput: function () {
    this.topicDocuments = []
    this.topicTerms = []
  },
  processOutput: async function () {
    //console.log("analysing "+sentences.length+" sentences...");
    this.processOutputWait = true
    this.progressPercentage = 1
    
    this.resetOutput()
    
    var documents = new Array();
    var f = {};
    var vocab = new Array();
    var docCount = 0;
    let sentences = this.inputText.trim().split('\n')

    for (var i = 0; i < sentences.length; i++) {
      let sentence = sentences[i].trim()
      
      if (sentence === "") {
        continue;
      }
      var words = sentence.split(/[\s,\"]+/);
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

      if (i > 0 && i % 10000 === 500) {
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
    await lda.gibbs(K, alpha, beta)
    this.progressPercentage = 0

    //console.log('lda', 4)
    var phi = lda.getPhi();
    //console.log(phi)
    //console.log(vocab)
    this.ldaNW = lda.nw
    this.ldaVoc = vocab
    
    while (isNaN(phi[0][0])) {
      if (this.configIterations > 1000000) {
        alert('LDA analyze failed.')
        return false
      }
      this.configIterations = this.configIterations + 1000
      console.log('Analyze failed. Increase interations: ' + this.configIterations)
      ITERATIONS = Number(this.configIterations)
      lda.configure(documents, V, ITERATIONS, burnIn, thinInterval, sampleLag)
      await lda.gibbs(K, alpha, beta);
      phi = lda.getPhi();
    }
    this.progressPercentage = 0

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
        //tuples.push("" + phi[k][w].toPrecision(2) + "_" + vocab[w]);
        //tuples.push("" + phi[k][w] + "_" + vocab[w]);
        tuples.push({
          prop: phi[k][w] * 10000,
          term: vocab[w]
        });
      }
      tuples.sort((a, b) => {
        if (b.prop > a.prop) {
          return 1
        }
        else {
          return -1
        }
        return 0
      })
      //console.log(tuples)
      if (topTerms > vocab.length) {
        topTerms = vocab.length
      }
      topicText[k] = [];
      for (var t = 0; t < topTerms; t++) {
        if (!tuples[t]) {
          continue
        }
        var topicTerm = tuples[t].term;
        var prob = tuples[t].prop
        //if (prob < 0.0001) {
          //prob = 0
          //continue;
        //}
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

    topicText.sort((a, b) => {
      
      // 計算probSum
      let len = a.length
      if (len > 1) {
        len = 1
      }
      
      let aProbSum = 0
      let bProbSum = 0
      for (let i = len; i > 0; i--) {
        aProbSum = aProbSum + a[(len - i)].prob
        bProbSum = bProbSum + b[(len - i)].prob
      }
      
      if (aProbSum > bProbSum) {
        return -1
      }
      else if (bProbSum > aProbSum) {
        return 1
      }
      
      for (let len = a.length, i = len; i > 0; i--) {
        let aItem = a[(len - i)]
        let bItem = b[(len - i)]
        
        if (aItem.term > bItem.term) {
            return 1;
        }
        if (bItem.term > aItem.term) {
            return -1;
        }
      }
      return 0
    })

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
        id: m,
        sentence: sentences[m].trim(),
        theta: t,
        topic: this.computedMaxProbTopic(t)
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
    t = Math.round(t * 1000000) / 10000
    if (t === 0) {
      return '< 0.01%'
    }
    else {
      return t + '%'
    }
  },
  copyTable (topic) {
    let output = []
    for (let i = 0; i < this.configTopN; i++) {
      let {term, prob} = topic[i]
      prob = prob / 10000
      output.push(`${term}\t${prob}`)
    }
    this.copyToClipboard(output.join('\n'))
  },
  copyToClipboard: function (str) {
    const el = document.createElement('textarea');
    el.value = str;
    document.body.appendChild(el);
    el.select();
    document.execCommand('copy');
    document.body.removeChild(el);
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
  downloadTopicTerms: function () {
    let header = ['term', 'match']

    this.topicTerms.forEach((t, i) => {
      header.push('T' + (i + 1))
    })

    let data = [header]

    this.sortedTopicTerms.forEach(({term, topic, prob}) => {
      let row = [
        term,
        (topic+1)
      ]

      prob.forEach(t => {
        row.push(t)
      })

      data.push(row)
    })

    var wb = XLSX.utils.book_new();


    wb.SheetNames.push("Topic2Term")
    wb.Sheets["Topic2Term"] = XLSX.utils.aoa_to_sheet(data)


    var wbout = XLSX.write(wb, {bookType: 'ods', type: 'binary'});
    let filename = 'LDA-Topic2Term_' + (new Date()).mmddhhmm() + '.ods'
    saveAs(new Blob([this.s2ab(wbout)],{type:"application/octet-stream"}), filename)
  },
  downloadTopicDocument: function () {
    let header = ['id', 'document', 'match']

    this.topicTerms.forEach((t, i) => {
      header.push('T' + (i + 1))
    })

    let data = [header]

    this.sortedTopicDocuments.forEach(({id, sentence, topic, theta}) => {
      let row = [
        (id+1),
        sentence,
        (topic+1)
      ]

      theta.forEach(t => {
        row.push(t)
      })

      data.push(row)
    })

    var wb = XLSX.utils.book_new();


    wb.SheetNames.push("Topic2Doc")
    wb.Sheets["Topic2Doc"] = XLSX.utils.aoa_to_sheet(data)


    var wbout = XLSX.write(wb, {bookType: 'ods', type: 'binary'});
    let filename = 'LDA-Topic2Doc_' + (new Date()).mmddhhmm() + '.ods'
    saveAs(new Blob([this.s2ab(wbout)],{type:"application/octet-stream"}), filename)
  },
  downloadConfiguration: function () {
    console.error('@TODO')
    window.alert('@TODO')
  },
  setDocumentSortTopic (topic) {
    if (this.documentSortField !== topic) {
      this.documentSortField = topic
      this.documentSortOrder = null
    }
    
    if (this.documentSortOrder === 'desc') {
      this.documentSortOrder = 'asc'
    }
    else {
      this.documentSortOrder = 'desc'
    }
  },
  _toggleDocumentSortOrder () {
    if (this.documentSortOrder === 'asc') {
      this.documentSortOrder = 'desc'
    }
    else {
      this.documentSortOrder = 'asc'
    }
  },
  setDocumentSortAllTopics () {
    if (this.documentSortField !== 'topics') {
      this.documentSortField = 'topics'
      this.documentSortOrder = null
    }
    this._toggleDocumentSortOrder()
  },
  setDocumentSortID () {
    if (this.documentSortField !== 'id') {
      this.documentSortField = 'id'
      this.documentSortOrder = null
    }
    this._toggleDocumentSortOrder()
    
    //console.log(this.documentSortField, this.documentSortOrder)
  },
  setDocumentSortAlphabetical () {
    if (this.documentSortField !== 'alphabetical') {
      this.documentSortField = 'alphabetical'
      this.documentSortOrder = null
    }
    this._toggleDocumentSortOrder()
  },
  _toggleTermSortOrder () {
    if (this.termSortOrder === 'asc') {
      this.termSortOrder = 'desc'
    }
    else {
      this.termSortOrder = 'asc'
    }
  },
  setTermSortAlphabetical () {
    if (this.termSortField !== 'alphabetical') {
      this.termSortField = 'alphabetical'
      this.termSortOrder = null
    }
    this._toggleTermSortOrder()
    console.log(this.termSortField, this.termSortOrder)
  },
  setTermSortAllTopics () {
    if (this.termSortField !== 'topic') {
      this.termSortField = 'topic'
      this.termSortOrder = null
    }
    this._toggleTermSortOrder()
  },
  setTermSortTopic (topic) {
    if (this.termSortField !== topic) {
      this.termSortField = topic
      this.termSortOrder = null
    }
    
    if (this.termSortOrder === 'desc') {
      this.termSortOrder = 'asc'
    }
    else {
      this.termSortOrder = 'desc'
    }
  },
  normalizeProb (probs) {
    let base = probs.reduce((p, total) => p + total)
    return probs.map(p => p / base)
  }
}