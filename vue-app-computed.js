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
      }
      
      let sortDocuments = Array.from(Object.create(this.topicDocuments))
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
      let terms = {}
      let termsProbs = []
      
      let zeroProb = []
      this.topicTerms.forEach(() => {
        zeroProb.push(0)
      })
      
      for (let i = 0; i < this.topicTerms.length; i++) {
        for (let t = 0; t < this.topicTerms[i].length; t++) {
          let {term, prob} = this.topicTerms[i][t]
          term = term.trim()
          
          if (!terms[term]) {
            terms[term] = termsProbs.length
            
            termsProbs.push({
              term: term,
              prob: Array.from(Object.create(zeroProb))
            })
          }
          
          let termIndex = terms[term]
          termsProbs[termIndex].prob[i] = prob / 10000
        }
      }
      
      termsProbs.forEach(termJSON => {
        termJSON.topic = this.computedMaxProbTopic(termJSON.prob)
      })
      
      return termsProbs
    },
    sortedTopicTerms () {
      if (this.topicTerms.length === 0) {
        return []
      }
      
      let sortTerms = Array.from(Object.create(this.baseTopicTerms))
      
      if (this.termSortField === 'topic') {
        sortTerms.sort((a, b) => {
          if (this.termSortOrder === 'asc') {
            return (a.topic - b.topic)
          }
          else {
            return (b.topic - a.topic)
          }
        })
      }
      else if (this.termSortField === 'alphabetical') {
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
      else if (typeof(this.termSortField) === 'number') {
        let i = this.termSortField
        //console.log(i)
        sortTerms.sort((a, b) => {
          if (this.termSortOrder === 'asc') {
            return (a.prob[i] - b.prob[i])
          }
          else {
            return (b.prob[i] - a.prob[i])
          }
        })
      }
      
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