var appComputed = {
    searchParams () {
      let output = {}
      const currentURL = new URL(location.href)
      for(let [key, value] of currentURL.searchParams.entries()) {
        output[key] = value
      }
      return output
    },
    sortedTopicDocuments () {
      
      if (this.documentSortField === null) {
        return this.topicDocuments
        //this.documentSortField = 'id'
      }
      
      let generalSort = (a, b) => {
        if (a.topic !== b.topic) {
          return (a.topic - b.topic)
        }
        
        let aMaxProb = Math.max(...a.theta)
        let bMaxProb = Math.max(...b.theta)

        //console.log(aMaxProb, bMaxProb, a, b)
        if (aMaxProb !== bMaxProb) {
          return (bMaxProb - aMaxProb)
        }

        if (a.sentence > b.sentence) {
          return 1
        }
        else {
          return -1
        }

        return 0
      }
      
      let sortDocuments = Array.from(Object.create(this.topicDocuments))
      //console.log(this.documentSortField)
      
      //console.log(this.documentSortField)
      
      if (this.documentSortField === 'id') {
        sortDocuments.sort((a, b) => {
          if (this.documentSortOrder === 'asc') {
            return (a.id - b.id)
          }
          else {
            return (b.id - a.id)
          }
        })
      }
      else if (this.documentSortField === 'topics') {
        sortDocuments.sort((a, b) => {
          if (a.topic === b.topic) {
            return generalSort(a, b)
          }
          
          
          if (this.documentSortOrder === 'asc') {
            return (a.topic - b.topic)
          }
          else {
            return (b.topic - a.topic)
          }
        })
      }
      else if (this.documentSortField === 'alphabetical') {
        sortDocuments.sort((a, b) => {
          let sort = -1
          if (this.documentSortOrder === 'asc') {
            if (a.sentence > b.sentence) {
              sort = 1
            }
            else {
              sort = -1
            }
          }
          else {
            if (a.sentence > b.sentence) {
              sort = -1
            }
            else {
              sort = 1
            }
          }
          return sort
        })
      }
      else if (typeof(this.documentSortField) === 'number') {
        let i = this.documentSortField
        //console.log(i)
        sortDocuments.sort((a, b) => {
          if (a.theta[i] === b.theta[i]) {
            return generalSort(a, b)
          }
          
          if (this.documentSortOrder === 'asc') {
            return (a.theta[i] - b.theta[i])
          }
          else {
            return (b.theta[i] - a.theta[i])
          }
        })
      }
      //console.log(this.documentSortField)
      
      return sortDocuments
    },
    baseTopicTerms () {
//      let terms = {}
//      let termsProbs = []
//      
//      let zeroProb = []
//      this.topicTerms.forEach(() => {
//        zeroProb.push(0)
//      })
//      
//      for (let i = 0; i < this.topicTerms.length; i++) {
//        for (let t = 0; t < this.topicTerms[i].length; t++) {
//          let {term, prob} = this.topicTerms[i][t]
//          term = term.trim()
//          
//          if (!terms[term]) {
//            terms[term] = termsProbs.length
//            
//            termsProbs.push({
//              term: term,
//              prob: Array.from(Object.create(zeroProb))
//            })
//          }
//          
//          let termIndex = terms[term]
//          termsProbs[termIndex].prob[i] = prob / 10000
//        }
//      }
//      
//      termsProbs.forEach(termJSON => {
//        termJSON.topic = this.computedMaxProbTopic(termJSON.prob)
//      })
//      console.log(termsProbs)
//      return termsProbs
     
      let termsProbs = Array.from(Object.create(this.ldaNW))
      
      let output = []
      termsProbs.forEach((item, i) => {
        if (!this.topTerms[this.ldaVoc[i]]) {
          return false
        }
        
        let sum = item.reduce((a,b) => a + b, 0)

        output.push({
          prob: item.map(p => p / sum),
          topic: this.computedMaxProbTopic(item),
          term: this.ldaVoc[i]
        })
      })
      //console.log(output)
      return output
    },
    topTerms () {
      let terms = {}
      for (let i = 0; i < this.topicTerms.length; i++) {
        for (let t = 0; t < this.topicTerms[i].length; t++) {
          let {term, prob} = this.topicTerms[i][t]
          terms[term] = 1
        }
      }
      return terms
    },
    sortedTopicTerms () {
      if (this.topicTerms.length === 0) {
        return []
      }
      
      let sortTerms = Array.from(Object.create(this.baseTopicTerms))
      
      let sortField = this.termSortField
      if (!sortField) {
        sortField = 0
        this.termSortField = 0
      }
      
      
      let generalSort = (a, b) => {
        if (a.topic !== b.topic) {
          return (a.topic - b.topic)
        }
        
        let aMaxProb = Math.max(...a.prob)
        let bMaxProb = Math.max(...b.prob)

        //console.log(aMaxProb, bMaxProb, a, b)
        if (aMaxProb !== bMaxProb) {
          return (bMaxProb - aMaxProb)
        }

        if (a.term > b.term) {
          return 1
        }
        else {
          return -1
        }

        return 0
      }
      
      if (sortField === 'topic') {
        sortTerms.sort((a, b) => {
          if (a.topic === b.topic) {
            return generalSort(a, b)
          }
          
          if (this.termSortOrder === 'asc') {
            return (a.topic - b.topic)
          }
          else {
            return (b.topic - a.topic)
          }
        })
      }
      else if (sortField === 'alphabetical') {
        sortTerms.sort((a, b) => {
          let sort = -1
          //console.log(this.termSortField, a.term > b.term, a.term , b.term)
          if (this.termSortOrder === 'asc') {
            if (a.term > b.term) {
              sort = 1
            }
            else {
              sort = -1
            }
          }
          else {
            
            if (a.term > b.term) {
              sort = -1
            }
            else {
              sort = 1
            }
          }
          
          return sort
        })
      }
      else if (typeof(sortField) === 'number') {
        let i = sortField
        //console.log(i)
        sortTerms.sort((a, b) => {
          if (Array.isArray(a.prob) === false) {
            a.prob = []
            for (let j = 0; j < this.configTopicNumber; j++) {
              a.prob.push(0)
            }
          }
          if (Array.isArray(b.prob) === false) {
            b.prob = []
            for (let j = 0; j < this.configTopicNumber; j++) {
              b.prob.push(0)
            }
          }
          
          if (a.prob[i] === b.prob[i]) {
            return generalSort(a, b)
          }
          
          if (this.termSortOrder === 'asc') {
            return (a.prob[i] - b.prob[i])
          }
          else {
            return (b.prob[i] - a.prob[i])
          }
        })
      }
      
      //console.log(sortField)
      //console.log(sortTerms)
      return sortTerms
    },
    topicNumberArray () {
      let output = []
      for (let i = 0; i < this.topicTerms.length; i++) {
        output.push(i)
      }
      return output
    }
  }